import { useState, useCallback } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits, encodeFunctionData } from 'viem'
import { sdk } from '@farcaster/miniapp-sdk'
import { CONTRACTS, MINT_CONFIG, ERC20_ABI, GLAZELETS_ABI } from '../config/wagmi'

export type MintStatus = 'idle' | 'approving' | 'minting' | 'success' | 'error'

export function useGlazelets() {
  const { address, isConnected } = useAccount()
  const [mintStatus, setMintStatus] = useState<MintStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null)

  // Read mint price from contract
  const { data: mintPriceRaw } = useReadContract({
    address: CONTRACTS.GLAZELETS_NFT as `0x${string}`,
    abi: GLAZELETS_ABI,
    functionName: 'mintPrice',
  })

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

  // Use contract mint price, fallback to config if not loaded yet
  const mintPriceWei = mintPriceRaw ?? BigInt(0)
  
  // Format mint price for display (assumes 18 decimals like DONUT)
  const mintPriceFormatted = mintPriceWei > 0 
    ? parseFloat(formatUnits(mintPriceWei, MINT_CONFIG.PRICE_DONUT_DECIMALS))
    : 0

  // Format balance for display
  const formattedBalance = donutBalance 
    ? parseFloat(formatUnits(donutBalance, MINT_CONFIG.PRICE_DONUT_DECIMALS))
    : 0
  
  // Checks - only valid if we have the mint price
  const hasEnoughDonut = (donutBalance && mintPriceWei > 0) ? donutBalance >= mintPriceWei : false
  const needsApproval = (donutAllowance && mintPriceWei > 0) ? donutAllowance < mintPriceWei : true
  const canMint = userMintCount !== undefined ? Number(userMintCount) < MINT_CONFIG.MAX_PER_WALLET : true
  const isSoldOut = totalSupply !== undefined ? Number(totalSupply) >= MINT_CONFIG.MAX_SUPPLY : false

  // Send transaction using Farcaster SDK ethProvider
  const sendTransaction = useCallback(async (to: `0x${string}`, data: `0x${string}`, from: `0x${string}`) => {
    console.log('Sending transaction via Farcaster ethProvider...')
    console.log('From:', from)
    console.log('To:', to)
    console.log('Data:', data)
    
    try {
      const txHash = await sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to,
          data,
        }],
      })
      
      console.log('Transaction hash:', txHash)
      return txHash as `0x${string}`
    } catch (err: unknown) {
      console.error('Transaction failed:', err)
      throw err
    }
  }, [])

  // Main mint function
  const mint = useCallback(async (regionName: string) => {
    console.log('=== MINT STARTED ===')
    console.log('Region:', regionName)
    console.log('Address:', address)
    console.log('Mint price (wei):', mintPriceWei.toString())
    
    if (!address || !isConnected) {
      console.error('Not connected')
      setError('Wallet not connected')
      return null
    }

    if (mintPriceWei === BigInt(0)) {
      console.error('Mint price not loaded')
      setError('Loading mint price...')
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

      // Step 1: Approve if needed (only approve exact mint amount from contract)
      if (needsApprovalNow) {
        console.log('Approval needed, sending approve tx...')
        setMintStatus('approving')
        
        try {
          // Encode approve function call - approve exact amount from contract
          const approveData = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACTS.GLAZELETS_NFT as `0x${string}`, mintPriceWei],
          })
          
          const approveTx = await sendTransaction(
            CONTRACTS.DONUT_TOKEN as `0x${string}`, 
            approveData, 
            address
          )
          
          console.log('Approve tx sent:', approveTx)
          setLastTxHash(approveTx)
          
          // Wait for approval to be mined
          console.log('Waiting for approval to confirm...')
          await new Promise(resolve => setTimeout(resolve, 5000))
          await refetchAllowance()
          console.log('Approval confirmed')
        } catch (approveErr: unknown) {
          console.error('Approve failed:', approveErr)
          const errMsg = approveErr instanceof Error ? approveErr.message : 'Unknown error'
          if (errMsg.includes('rejected') || errMsg.includes('cancelled')) {
            setError('Transaction rejected')
          } else {
            setError('Approval failed: ' + errMsg)
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
      
      const mintTx = await sendTransaction(
        CONTRACTS.GLAZELETS_NFT as `0x${string}`, 
        mintData, 
        address
      )
      
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
    } catch (err: unknown) {
      console.error('=== MINT ERROR ===', err)
      setMintStatus('error')
      
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      if (errMsg.includes('rejected') || errMsg.includes('cancelled')) {
        setError('Transaction rejected')
      } else if (errMsg.includes('insufficient')) {
        setError('Insufficient funds for gas')
      } else {
        setError(errMsg || 'Mint failed')
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
    mintPrice: mintPriceFormatted, // Now from contract!
    maxSupply: MINT_CONFIG.MAX_SUPPLY,
    maxPerWallet: MINT_CONFIG.MAX_PER_WALLET,
  }
}
