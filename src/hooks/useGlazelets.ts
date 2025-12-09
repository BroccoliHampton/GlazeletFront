import { useState, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS, MINT_CONFIG, ERC20_ABI, GLAZELETS_ABI } from '../config/wagmi'

export type MintStatus = 'idle' | 'approving' | 'minting' | 'success' | 'error'

export function useGlazelets() {
  const { address, isConnected } = useAccount()
  const [mintStatus, setMintStatus] = useState<MintStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null)

  // Read DONUT balance
  const { data: donutBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.DONUT_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && CONTRACTS.DONUT_TOKEN !== '0x0000000000000000000000000000000000000000',
    },
  })

  // Read DONUT allowance for Glazelets contract
  const { data: donutAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.DONUT_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.GLAZELETS_NFT as `0x${string}`] : undefined,
    query: {
      enabled: !!address && CONTRACTS.DONUT_TOKEN !== '0x0000000000000000000000000000000000000000',
    },
  })

  // Read total supply
  const { data: totalSupply, refetch: refetchSupply } = useReadContract({
    address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
    abi: GLAZELETS_ABI,
    functionName: 'totalSupply',
    query: {
      enabled: CONTRACTS.GLAZELETS_NFT !== '0x0000000000000000000000000000000000000000',
    },
  })

  // Read user's mint count
  const { data: userMintCount } = useReadContract({
    address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
    abi: GLAZELETS_ABI,
    functionName: 'mintsPerWallet',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && CONTRACTS.GLAZELETS_NFT !== '0x0000000000000000000000000000000000000000',
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
    if (!address || !isConnected) {
      setError('Wallet not connected')
      return
    }

    if (!hasEnoughDonut) {
      setError('Insufficient DONUT balance')
      return
    }

    if (!canMint) {
      setError('Wallet mint limit reached (4)')
      return
    }

    if (isSoldOut) {
      setError('Collection sold out')
      return
    }

    setError(null)
    setMintStatus('idle')

    try {
      // Step 1: Approve DONUT if needed
      if (needsApproval) {
        setMintStatus('approving')
        
        const approveTx = await writeContractAsync({
          address: CONTRACTS.DONUT_TOKEN as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.GLAZELETS_NFT as `0x${string}`, mintPriceWei],
        })
        
        setLastTxHash(approveTx)
        
        // Wait a bit for approval to propagate
        await new Promise(resolve => setTimeout(resolve, 2000))
        await refetchAllowance()
      }

      // Step 2: Mint
      setMintStatus('minting')
      
      const mintTx = await writeContractAsync({
        address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
        abi: GLAZELETS_ABI,
        functionName: 'mint',
        args: [regionName],
      })
      
      setLastTxHash(mintTx)
      setMintStatus('success')
      
      // Refresh data
      await Promise.all([
        refetchBalance(),
        refetchAllowance(),
        refetchSupply(),
      ])
      
      return mintTx
    } catch (err) {
      console.error('Mint failed:', err)
      setMintStatus('error')
      setError(err instanceof Error ? err.message : 'Mint failed')
      return null
    }
  }, [
    address,
    isConnected,
    hasEnoughDonut,
    canMint,
    isSoldOut,
    needsApproval,
    mintPriceWei,
    writeContractAsync,
    refetchAllowance,
    refetchBalance,
    refetchSupply,
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
