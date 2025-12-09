import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Contract addresses - UPDATE THESE after deployment
export const CONTRACTS = {
  DONUT_TOKEN: '0x0000000000000000000000000000000000000000', // TODO: Add DONUT token address on Base
  GLAZELETS_NFT: '0x0000000000000000000000000000000000000000', // TODO: Add after contract deployment
  BURN_ADDRESS: '0x000000000000000000000000000000000000dEaD',
} as const

// Mint configuration
export const MINT_CONFIG = {
  PRICE_DONUT: 69n, // 69 DONUT tokens
  PRICE_DONUT_DECIMALS: 18,
  MAX_SUPPLY: 808,
  MAX_PER_WALLET: 4,
} as const

// Wagmi config with Farcaster Mini App connector
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    farcasterMiniApp(),
  ],
})

// ERC20 ABI for DONUT token interactions
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

// Glazelets NFT ABI
export const GLAZELETS_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_origin', type: 'string' }],
    outputs: [],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'mintsPerWallet',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'mintPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const
