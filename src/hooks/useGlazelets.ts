import { useState, useCallback } from 'react'
import { useAccount, useReadContract, useWalletClient } from 'wagmi'
import { parseUnits, formatUnits, maxUint256 } from 'viem'
import { CONTRACTS, MINT_CONFIG, ERC20_ABI, GLAZELETS_ABI } from '../config/wagmi'

export type MintStatus = 'idle' | 'approving' | 'minting' | 'success' | 'error'

export function useGlazelets() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [mintStatus, setMintStatus] = useState<MintStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null)

  // Read DONUT balance
  const { data: donutBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.DONUT_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Read DONUT allowance for Glazelets contract
  const { data: donutAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.DONUT_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.GLAZELETS_NFT as `0x${string}`] : undefined,
    query: { enabled: !!address },
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
    query: { enabled: !!address },
  })

  // Format balance for display
  const formattedBalance = donutBalance 
    ? parseFloat(formatUnits(donutBalance, MINT_CONFIG.PRICE_DONUT_DECIMALS))
    : 0

  // Mint price in wei
  const mintPriceWei = parseUnits(
    MINT_CONFIG.PRICE_DONUT.toString(), 
    MINT_CONFIG.PRICE_DONUT_DECIMALS
  )
  
  // Checks
  const hasEnoughDonut = donutBalance ? donutBalance >= mintPriceWei : false
  const needsApproval = donutAllowance ? donutAllowance < mintPriceWei : true
  const canMint = userMintCount !== undefined ? Number(userMintCount) < MINT_CONFIG.MAX_PER_WALLET : true
  const isSoldOut = totalSupply !== undefined ? Number(totalSupply) >= MINT_CONFIG.MAX_SUPPLY : false

  // Main mint function - using walletClient directly
  const mint = useCallback(async (regionName: string) => {
    console.log('=== MINT STARTED ===')
    console.log('Region:', regionName)
    console.log('Address:', address)
    console.log('WalletClient:', !!walletClient)
    
    if (!address || !isConnected) {
      console.error('Not connected')
      setError('Wallet not connected')
      return null
    }

    if (!walletClient) {
      console.error('No wallet client')
      setError('Wallet not ready')
      return null
    }

    setError(null)
    setLastTxHash(null)

    try {
      // Refetch current allowance
      const { data: currentAllowance } = await refetchAllowance()
      console.log('Current allowance:', currentAllowance?.toString())
      console.log('Mint price:', mintPriceWei.toString())
      
      const needsApprovalNow = !currentAllowance || currentAllowance < mintPriceWei

      // Step 1: Approve if needed
      if (needsApprovalNow) {
        console.log('Approval needed, sending approve tx...')
        setMintStatus('approving')
        
        try {
          const approveTx = await walletClient.writeContract({
            address: CONTRACTS.DONUT_TOKEN as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACTS.GLAZELETS_NFT as `0x${string}`, maxUint256],
          })
          
          console.log('Approve tx sent:', approveTx)
          setLastTxHash(approveTx)
          
          // Wait for approval to be mined
          console.log('Waiting for approval to confirm...')
          await new Promise(resolve => setTimeout(resolve, 5000))
          await refetchAllowance()
          console.log('Approval confirmed')
        } catch (approveErr: any) {
          console.error('Approve failed:', approveErr)
          if (approveErr?.message?.includes('User rejected') || approveErr?.message?.includes('rejected')) {
            setError('Transaction rejected')
          } else {
            setError('Approval failed: ' + (approveErr?.shortMessage || approveErr?.message || 'Unknown error'))
          }
          setMintStatus('error')
          return null
        }
      }

      // Step 2: Mint
      console.log('Sending mint tx...')
      setMintStatus('minting')
      
      const mintTx = await walletClient.writeContract({
        address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
        abi: GLAZELETS_ABI,
        functionName: 'mint',
        args: [regionName],
      })
      
      console.log('Mint tx sent:', mintTx)
      setLastTxHash(mintTx)
      
      // Wait for mint to confirm
      console.log('Waiting for mint to confirm...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      
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
      
      if (err?.message?.includes('User rejected') || err?.message?.includes('rejected')) {
        setError('Transaction rejected')
      } else if (err?.message?.includes('insufficient')) {
        setError('Insufficient funds for gas')
      } else {
        setError(err?.shortMessage || err?.message || 'Mint failed')
      }
      return null
    }
  }, [
    address,
    isConnected,
    walletClient,
    mintPriceWei,
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
    isConnected,
    address,
    donutBalance: formattedBalance,
    hasEnoughDonut,
    totalSupply: totalSupply !== undefined ? Number(totalSupply) : 0,
    userMintCount: userMintCount !== undefined ? Number(userMintCount) : 0,
    canMint,
    isSoldOut,
    needsApproval,
    mint,
    mintStatus,
    error,
    lastTxHash,
    reset,
    mintPrice: Number(MINT_CONFIG.PRICE_DONUT),
    maxSupply: MINT_CONFIG.MAX_SUPPLY,
    maxPerWallet: MINT_CONFIG.MAX_PER_WALLET,
  }
}
