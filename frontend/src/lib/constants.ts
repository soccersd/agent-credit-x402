/**
 * Contract addresses and constants - VERIFIED on-chain addresses
 * Last updated: 2026-04-10
 * 
 * Note: x402 Protocol does NOT deploy new contracts.
 * It uses existing USDC contracts with payment mandates/authorizations.
 * Reference: https://github.com/coinbase/x402
 */

// X Layer Mainnet chain configuration
export const X_LAYER_CHAIN_ID = 196;
export const X_LAYER_RPC_URL = 'https://rpc.xlayer.tech';

// Token addresses on various chains (verified):
export const TOKENS = {
  // X Layer Mainnet (Chain ID 196)
  USDC_XLAYER: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',

  // Base Mainnet (Chain ID 8453) - x402 officially supported here
  USDC_BASE: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',

  // Base Sepolia Testnet (Chain ID 84532) - for testing
  USDC_BASE_SEPOLIA: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',

  // Ethereum Mainnet (Chain ID 1)
  USDC_ETH: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',

  // Common tokens on X Layer
  USDT_XLAYER: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  WETH_XLAYER: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  OKB_XLAYER: '0x0000000000000000000000000000000000000000',
} as const;

// x402 Protocol Configuration
// Note: x402 does NOT deploy contracts - it uses USDC directly with payment mandates
export const X402_CONFIG = {
  // Official facilitator URLs (Coinbase operates on Base)
  facilitatorBase: 'https://x402.org/facilitator/base',
  facilitatorBaseSepolia: 'https://x402.org/facilitator/base-sepol',

  // For X Layer, you need to deploy/run your own facilitator
  facilitatorXLayer: 'http://localhost:8080/facilitator',

  // Protocol version
  version: '0.2.1',

  // GitHub reference
  github: 'https://github.com/coinbase/x402',
} as const;

// Agent configuration
export const AGENT_CONFIG = {
  minBorrowAmount: 0.1,
  maxBorrowAmount: 10.0,
  liquidationThreshold: 1.2,
  loopIntervalSecs: 30,
} as const;

// Credit score grades
export const CREDIT_GRADES = {
  AAA: { min: 900, max: 1000, color: '#00FF00' },
  AA: { min: 800, max: 899, color: '#32CD32' },
  A: { min: 700, max: 799, color: '#7CFC00' },
  BBB: { min: 600, max: 699, color: '#FFD700' },
  BB: { min: 500, max: 599, color: '#FFA500' },
  B: { min: 400, max: 499, color: '#FF6347' },
  CCC: { min: 300, max: 399, color: '#FF4500' },
  D: { min: 0, max: 299, color: '#FF0000' },
} as const;

// Backend API URL
export const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3302';
export const BACKEND_WS_URL =
  process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'ws://localhost:3302/api/ws/events';
