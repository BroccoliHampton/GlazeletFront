import { useState, useCallback } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { parseUnits, formatUnits, maxUint256, encodeFunctionData } from 'viem'
import { sdk } from '@farcaster/miniapp-sdk'
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

  // Send transaction using Farcaster SDK
  const sendTransaction = useCallback(async (to: string, data: `0x${string}`) => {
    console.log('Sending transaction via Farcaster SDK...')
    console.log('To:', to)
    console.log('Data:', data)
    
    try {
      const result = await sdk.wallet.sendTransaction({
        chainId: `eip155:8453`, // Base mainnet
        transaction: {
          to,
          data,
        },
      })
      
      console.log('Transaction result:', result)
      
      if (result && 'transactionHash' in result) {
        return result.transactionHash as `0x${string}`
      }
      
      throw new Error('No transaction hash returned')
    } catch (err: any) {
      console.error('Transaction failed:', err)
      throw err
    }
  }, [])

  // Main mint function
  const mint = useCallback(async (regionName: string) => {
    console.log('=== MINT STARTED ===')
    console.log('Region:', regionName)
    console.log('Address:', address)
    
    if (!address || !isConnected) {
      console.error('Not connected')
      setError('Wallet not connected')
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
          // Encode approve function call
          const approveData = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACTS.GLAZELETS_NFT as `0x${string}`, maxUint256],
          })
          
          const approveTx = await sendTransaction(CONTRACTS.DONUT_TOKEN, approveData)
          
          console.log('Approve tx sent:', approveTx)
          setLastTxHash(approveTx)
          
          // Wait for approval to be mined
          console.log('Waiting for approval to confirm...')
          await new Promise(resolve => setTimeout(resolve, 5000))
          await refetchAllowance()
          console.log('Approval confirmed')
        } catch (approveErr: any) {
          console.error('Approve failed:', approveErr)
          if (approveErr?.message?.includes('rejected') || approveErr?.message?.includes('cancelled')) {
            setError('Transaction rejected')
          } else {
            setError('Approval failed: ' + (approveErr?.message || 'Unknown error'))
          }
          setMintStatus('error')
          return null
        }
      }

      // Step 2: Mint
      console.log('Sending mint tx...')
      setMintStatus('minting')
      
      // Encode mint function call
      const mintData = encodeFunctionData({
        abi: GLAZELETS_ABI,
        functionName: 'mint',
        args: [regionName],
      })
      
      const mintTx = await sendTransaction(CONTRACTS.GLAZELETS_NFT, mintData)
      
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
      
      if (err?.message?.includes('rejected') || err?.message?.includes('cancelled')) {
        setError('Transaction rejected')
      } else if (err?.message?.includes('insufficient')) {
        setError('Insufficient funds for gas')
      } else {
        setError(err?.message || 'Mint failed')
      }
      return null
    }
  }, [
    address,
    isConnected,
    mintPriceWei,
    sendTransaction,
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
