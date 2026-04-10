#!/usr/bin/env node

/**
 * Generate an Ethereum wallet address for the Agent
 * Run with: node generate-wallet.js
 * 
 * This creates a random wallet and prints the address.
 * You can fund this address with test OKB/USDC on X Layer.
 */

const { ethers } = require("ethers");

async function generateWallet() {
  // Create a random wallet
  const wallet = ethers.Wallet.createRandom();

  console.log("==========================================");
  console.log("  AGENT WALLET GENERATED");
  console.log("==========================================\n");
  console.log(`Address: ${wallet.address}`);
  console.log(`Private Key: ${wallet.privateKey}`);
  console.log(`Mnemonic: ${wallet.mnemonic?.phrase}\n`);
  console.log("==========================================");
  console.log("  NEXT STEPS");
  console.log("==========================================\n");
  console.log("1. Copy the Address above");
  console.log("2. Open backend/.env");
  console.log("3. Replace AGENT_WALLET with your new address");
  console.log("4. Fund the wallet with OKB/USDC on X Layer");
  console.log("5. NEVER share your Private Key or Mnemonic!\n");
  console.log("X Layer Network Info:");
  console.log("  - Chain ID: 196");
  console.log("  - RPC: https://rpc.xlayer.tech");
  console.log("  - Explorer: https://www.oklink.com/xlayer\n");
}

generateWallet().catch(console.error);
