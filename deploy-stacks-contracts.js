/**
 * Stacks Contract Deployment Script
 * Deploys all 4 contracts to Stacks Mainnet
 * 
 * Usage:
 *   Set environment variable: $env:STX_PRIVATE_KEY = "your-private-key-here"
 *   Run: node deploy-stacks-contracts.js
 */

const {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  getAddressFromPrivateKey,
  TransactionVersion,
} = require("@stacks/transactions");
const { StacksMainnet } = require("@stacks/network");
const fs = require("fs");
const path = require("path");

// Configuration
const network = new StacksMainnet();
const PRIVATE_KEY = process.env.STX_PRIVATE_KEY;

// Contract definitions
const contracts = [
  {
    name: "tip-jar",
    path: "./stacks-tip-jar/contracts/tip-jar.clar",
    description: "STX Tip Jar - Accept tips with messages",
  },
  {
    name: "voting",
    path: "./stacks-voting/contracts/voting.clar",
    description: "On-chain Voting - Create polls and cast votes",
  },
  {
    name: "nft-mint",
    path: "./stacks-nft-mint/contracts/nft-mint.clar",
    description: "NFT Minting - SIP-009 compliant NFT",
  },
  {
    name: "blind-auction",
    path: "./stacks-blind-auction/contracts/blind-auction.clar",
    description: "Blind Auction - Sealed-bid auction with commit-reveal",
  },
];

async function deployContract(contractInfo, privateKey, nonce) {
  console.log(`\n📦 Deploying: ${contractInfo.name}`);
  console.log(`   ${contractInfo.description}`);

  // Read contract source
  const contractPath = path.resolve(__dirname, contractInfo.path);
  
  if (!fs.existsSync(contractPath)) {
    console.error(`   ❌ Contract file not found: ${contractPath}`);
    return null;
  }
  
  const codeBody = fs.readFileSync(contractPath, "utf8");
  console.log(`   📄 Contract size: ${codeBody.length} bytes`);

  // Create deployment transaction
  const txOptions = {
    contractName: contractInfo.name,
    codeBody,
    senderKey: privateKey,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    nonce,
    fee: 100000n, // 0.1 STX - adjust if needed
  };

  try {
    const transaction = await makeContractDeploy(txOptions);
    console.log(`   🔄 Broadcasting transaction...`);

    const broadcastResponse = await broadcastTransaction({
      transaction,
      network,
    });

    if (broadcastResponse.error) {
      console.error(`   ❌ Broadcast error: ${broadcastResponse.error}`);
      console.error(`   Reason: ${broadcastResponse.reason}`);
      return { error: broadcastResponse.error, reason: broadcastResponse.reason };
    }

    console.log(`   ✅ Transaction ID: ${broadcastResponse.txid}`);
    return {
      name: contractInfo.name,
      txid: broadcastResponse.txid,
      explorer: `https://explorer.stacks.co/txid/${broadcastResponse.txid}?chain=mainnet`,
    };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { error: error.message };
  }
}

async function getAccountNonce(address) {
  try {
    const response = await fetch(
      `https://api.mainnet.hiro.so/extended/v1/address/${address}/nonces`
    );
    const data = await response.json();
    return BigInt(data.possible_next_nonce);
  } catch (error) {
    console.error("Failed to fetch nonce:", error.message);
    return 0n;
  }
}

async function getAccountBalance(address) {
  try {
    const response = await fetch(
      `https://api.mainnet.hiro.so/extended/v1/address/${address}/balances`
    );
    const data = await response.json();
    return BigInt(data.stx.balance);
  } catch (error) {
    console.error("Failed to fetch balance:", error.message);
    return 0n;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("        STACKS CONTRACT DEPLOYMENT - MAINNET");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Check private key
  if (!PRIVATE_KEY) {
    console.error("❌ ERROR: STX_PRIVATE_KEY environment variable not set!");
    console.log("\nTo set your private key:");
    console.log('  PowerShell: $env:STX_PRIVATE_KEY = "your-private-key-here"');
    console.log("  CMD: set STX_PRIVATE_KEY=your-private-key-here");
    console.log("\n⚠️  Never share your private key with anyone!");
    process.exit(1);
  }

  // Get address from private key
  const address = getAddressFromPrivateKey(PRIVATE_KEY, TransactionVersion.Mainnet);
  console.log(`🔑 Deployer Address: ${address}`);

  // Check balance
  const balance = await getAccountBalance(address);
  const balanceSTX = Number(balance) / 1_000_000;
  console.log(`💰 Balance: ${balanceSTX.toFixed(6)} STX`);

  const estimatedCost = contracts.length * 0.1; // ~0.1 STX per contract
  if (balanceSTX < estimatedCost) {
    console.error(`\n❌ Insufficient balance! Need at least ~${estimatedCost} STX`);
    console.log(`   Current balance: ${balanceSTX.toFixed(6)} STX`);
    process.exit(1);
  }

  // Get starting nonce
  let nonce = await getAccountNonce(address);
  console.log(`📊 Starting nonce: ${nonce}\n`);

  // Deploy contracts
  const results = [];
  for (const contract of contracts) {
    const result = await deployContract(contract, PRIVATE_KEY, nonce);
    if (result && !result.error) {
      results.push(result);
      nonce++; // Increment nonce for next transaction
    }
    // Small delay between deployments
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("                    DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════════════\n");

  if (results.length > 0) {
    console.log("✅ Successfully submitted contracts:\n");
    results.forEach((r) => {
      console.log(`  📦 ${r.name}`);
      console.log(`     Contract: ${address}.${r.name}`);
      console.log(`     TX: ${r.txid}`);
      console.log(`     Explorer: ${r.explorer}\n`);
    });

    console.log("\n📝 Next Steps:");
    console.log("  1. Wait for transactions to confirm (~10-20 minutes)");
    console.log("  2. Update CONTRACT_ADDRESS in each project's page.tsx:");
    contracts.forEach((c) => {
      console.log(`     - ${c.name}: "${address}.${c.name}"`);
    });
    console.log("  3. Push updates to GitHub");
  } else {
    console.log("❌ No contracts were deployed successfully.");
  }

  // Save results to file
  const outputFile = path.join(__dirname, "deployment-results.json");
  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        network: "mainnet",
        deployer: address,
        timestamp: new Date().toISOString(),
        contracts: results,
      },
      null,
      2
    )
  );
  console.log(`\n📄 Results saved to: ${outputFile}`);
}

main().catch(console.error);
