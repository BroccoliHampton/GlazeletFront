import { useState, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits, maxUint256 } from 'viem'
import { CONTRACTS, MINT_CONFIG, ERC20_ABI, GLAZELETS_ABI } from '../config/wagmi'

export type MintStatus = 'idle' | 'approving' | 'minting' | 'success' | 'error'

export function useGlazelets() {
  const { address, isConnected } = useAccount()
  const [mintStatus, setMintStatus] = useState<MintStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null)
  const publicClient = usePublicClient()

  // Read DONUT balance
  const { data: donutBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.DONUT_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Read DONUT allowance for Glazelets contract
  const { data: donutAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.DONUT_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.GLAZELETS_NFT as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Read total supply
  const { data: totalSupply, refetch: refetchSupply } = useReadContract({
    address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
    abi: GLAZELETS_ABI,
    functionName: 'totalSupply',
  })

  // Read user's mint count
  const { data: userMintCount, refetch: refetchMintCount } = useReadContract({
    address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
    abi: GLAZELETS_ABI,
    functionName: 'mintsPerWallet',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Write contracts
  const { writeContractAsync } = useWriteContract()

  // Format balance for display
  const formattedBalance = donutBalance 
    ? parseFloat(formatUnits(donutBalance, MINT_CONFIG.PRICE_DONUT_DECIMALS))
    : 0

  // Check if user has enough DONUT
  const mintPriceWei = parseUnits(
    MINT_CONFIG.PRICE_DONUT.toString(), 
    MINT_CONFIG.PRICE_DONUT_DECIMALS
  )
  const hasEnoughDonut = donutBalance ? donutBalance >= mintPriceWei : false
  
  // Check if approval is needed
  const needsApproval = donutAllowance ? donutAllowance < mintPriceWei : true

  // Check if user can mint (hasn't hit wallet limit)
  const canMint = userMintCount !== undefined 
    ? Number(userMintCount) < MINT_CONFIG.MAX_PER_WALLET 
    : true

  // Check if sold out
  const isSoldOut = totalSupply !== undefined 
    ? Number(totalSupply) >= MINT_CONFIG.MAX_SUPPLY 
    : false

  // Main mint function
  const mint = useCallback(async (regionName: string) => {
    console.log('=== MINT STARTED ===')
    console.log('Region:', regionName)
    console.log('Address:', address)
    console.log('isConnected:', isConnected)
    
    if (!address || !isConnected) {
      setError('Wallet not connected')
      console.error('Wallet not connected')
      return null
    }

    if (!publicClient) {
      setError('Public client not available')
      console.error('Public client not available')
      return null
    }

    // Refetch current state before proceeding
    console.log('Refetching current state...')
    const [balanceResult, allowanceResult] = await Promise.all([
      refetchBalance(),
      refetchAllowance(),
    ])

    const currentBalance = balanceResult.data
    const currentAllowance = allowanceResult.data

    console.log('Current balance:', currentBalance?.toString())
    console.log('Current allowance:', currentAllowance?.toString())
    console.log('Mint price:', mintPriceWei.toString())

    if (!currentBalance || currentBalance < mintPriceWei) {
      setError('Insufficient DONUT balance')
      console.error('Insufficient balance')
      return null
    }

    if (!canMint) {
      setError('Wallet mint limit reached (4)')
      console.error('Mint limit reached')
      return null
    }

    if (isSoldOut) {
      setError('Collection sold out')
      console.error('Sold out')
      return null
    }

    setError(null)
    setLastTxHash(null)

    try {
      // Step 1: Approve DONUT if needed
      const needsApprovalNow = !currentAllowance || currentAllowance < mintPriceWei
      console.log('Needs approval:', needsApprovalNow)

      if (needsApprovalNow) {
        setMintStatus('approving')
        console.log('Sending approve transaction...')
        
        const approveTx = await writeContractAsync({
          address: CONTRACTS.DONUT_TOKEN as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.GLAZELETS_NFT as `0x${string}`, maxUint256], // Approve max to avoid re-approval
        })
        
        console.log('Approve tx hash:', approveTx)
        setLastTxHash(approveTx)
        
        // Wait for approval transaction to be confirmed
        console.log('Waiting for approval confirmation...')
        const approveReceipt = await publicClient.waitForTransactionReceipt({
          hash: approveTx,
          confirmations: 1,
        })
        console.log('Approve confirmed:', approveReceipt.status)
        
        if (approveReceipt.status !== 'success') {
          throw new Error('Approval transaction failed')
        }

        // Refetch allowance to confirm
        await refetchAllowance()
        console.log('Allowance updated')
      }

      // Step 2: Mint
      setMintStatus('minting')
      console.log('Sending mint transaction...')
      
      const mintTx = await writeContractAsync({
        address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
        abi: GLAZELETS_ABI,
        functionName: 'mint',
        args: [regionName],
      })
      
      console.log('Mint tx hash:', mintTx)
      setLastTxHash(mintTx)
      
      // Wait for mint transaction to be confirmed
      console.log('Waiting for mint confirmation...')
      const mintReceipt = await publicClient.waitForTransactionReceipt({
        hash: mintTx,
        confirmations: 1,
      })
      console.log('Mint confirmed:', mintReceipt.status)
      
      if (mintReceipt.status !== 'success') {
        throw new Error('Mint transaction failed')
      }

      setMintStatus('success')
      console.log('=== MINT SUCCESS ===')
      
      // Refresh data
      await Promise.all([
        refetchBalance(),
        refetchAllowance(),
        refetchSupply(),
        refetchMintCount(),
      ])
      
      return mintTx
    } catch (err: any) {
      console.error('=== MINT ERROR ===', err)
      setMintStatus('error')
      
      // Parse error message
      let errorMessage = 'Mint failed'
      if (err?.message) {
        if (err.message.includes('User rejected') || err.message.includes('user rejected')) {
          errorMessage = 'Transaction rejected by user'
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient ETH for gas'
        } else {
          errorMessage = err.message.slice(0, 100) // Truncate long errors
        }
      }
      
      setError(errorMessage)
      return null
    }
  }, [
    address,
    isConnected,
    publicClient,
    canMint,
    isSoldOut,
    mintPriceWei,
    writeContractAsync,
    refetchAllowance,
    refetchBalance,
    refetchSupply,
    refetchMintCount,
  ])

  // Reset status
  const reset = useCallback(() => {
    setMintStatus('idle')
    setError(null)
    setLastTxHash(null)
  }, [])

  return {
    // Wallet state
    isConnected,
    address,
    
    // Balances
    donutBalance: formattedBalance,
    hasEnoughDonut,
    
    // Mint state
    totalSupply: totalSupply !== undefined ? Number(totalSupply) : 0,
    userMintCount: userMintCount !== undefined ? Number(userMintCount) : 0,
    canMint,
    isSoldOut,
    needsApproval,
    
    // Mint function
    mint,
    mintStatus,
    error,
    lastTxHash,
    reset,
    
    // Config
    mintPrice: Number(MINT_CONFIG.PRICE_DONUT),
    maxSupply: MINT_CONFIG.MAX_SUPPLY,
    maxPerWallet: MINT_CONFIG.MAX_PER_WALLET,
  }
}
