/**
 * Stacks Contract Deployment from Mnemonic
 * Deploys all 4 contracts to Stacks Mainnet
 */

const {
  makeContractDeploy,
  AnchorMode,
  PostConditionMode,
} = require("@stacks/transactions");
const { STACKS_MAINNET, TransactionVersion } = require("@stacks/network");
const { generateWallet, getStxAddress } = require("@stacks/wallet-sdk");
const fs = require("fs");
const path = require("path");

// Mnemonic - set via STX_MNEMONIC environment variable
const MNEMONIC = process.env.STX_MNEMONIC;
if (!MNEMONIC) throw new Error("STX_MNEMONIC environment variable is required");

// Network
const network = STACKS_MAINNET;

// Contract definitions (v2 - simplified for mainnet)
const contracts = [
  {
    name: "tip-jar-v2",
    path: "./stacks-tip-jar/contracts/tip-jar-v2.clar",
    description: "STX Tip Jar v2 - Accept tips",
  },
  {
    name: "voting-v2", 
    path: "./stacks-voting/contracts/voting-v2.clar",
    description: "On-chain Voting v2 - Create polls and vote",
  },
  {
    name: "nft-v2",
    path: "./stacks-nft-mint/contracts/nft-v2.clar", 
    description: "NFT Minting v2 - Simple NFT minting",
  },
  {
    name: "auction-v2",
    path: "./stacks-blind-auction/contracts/auction-v2.clar",
    description: "Auction v2 - Create and bid on auctions",
  },
];

async function deployContract(contractInfo, privateKey, nonce, address) {
  console.log(`\n📦 Deploying: ${contractInfo.name}`);
  console.log(`   ${contractInfo.description}`);

  const contractPath = path.resolve(__dirname, contractInfo.path);
  
  if (!fs.existsSync(contractPath)) {
    console.error(`   ❌ Contract file not found: ${contractPath}`);
    return null;
  }
  
  const codeBody = fs.readFileSync(contractPath, "utf8");
  console.log(`   📄 Contract size: ${codeBody.length} bytes`);

  const txOptions = {
    contractName: contractInfo.name,
    codeBody,
    senderKey: privateKey,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    nonce,
    fee: 150000n, // 0.15 STX fee
  };

  try {
    const transaction = await makeContractDeploy(txOptions);
    const serializedTxHex = transaction.serialize();
    // Convert hex string to Buffer for raw bytes
    const serializedTx = Buffer.from(serializedTxHex, 'hex');
    console.log(`   🔄 Broadcasting transaction...`);

    // Use direct API call
    const response = await fetch("https://api.mainnet.hiro.so/v2/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: serializedTx,
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText };
      }
      console.error(`   ❌ Broadcast error: ${response.status}`);
      console.error(`   Response: ${JSON.stringify(errorData, null, 2)}`);
      return { error: errorData.error || responseText, reason: errorData.reason };
    }

    // Success - response is the txid as a string (JSON format with quotes)
    const txid = responseText.replace(/"/g, '');
    console.log(`   ✅ Transaction ID: ${txid}`);
    return {
      name: contractInfo.name,
      contractId: `${address}.${contractInfo.name}`,
      txid: txid,
      explorer: `https://explorer.stacks.co/txid/${txid}?chain=mainnet`,
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

  // Generate wallet from mnemonic
  console.log("🔐 Deriving wallet from mnemonic...");
  const wallet = await generateWallet({
    secretKey: MNEMONIC,
    password: "",
  });

  // Get the first account
  const account = wallet.accounts[0];
  const privateKey = account.stxPrivateKey;
  const address = getStxAddress({ account, transactionVersion: TransactionVersion.Mainnet });

  console.log(`🔑 Deployer Address: ${address}`);

  // Check balance
  const balance = await getAccountBalance(address);
  const balanceSTX = Number(balance) / 1_000_000;
  console.log(`💰 Balance: ${balanceSTX.toFixed(6)} STX`);

  const estimatedCost = contracts.length * 0.15;
  if (balanceSTX < estimatedCost) {
    console.error(`\n❌ Insufficient balance! Need at least ~${estimatedCost} STX`);
    console.log(`   Current balance: ${balanceSTX.toFixed(6)} STX`);
    console.log(`\n💡 Get STX from an exchange or ask a friend to send you some.`);
    process.exit(1);
  }

  // Get starting nonce
  let nonce = await getAccountNonce(address);
  console.log(`📊 Starting nonce: ${nonce}\n`);

  // Deploy contracts
  const results = [];
  for (const contract of contracts) {
    const result = await deployContract(contract, privateKey, nonce, address);
    if (result && !result.error) {
      results.push(result);
      nonce++;
    } else if (result && result.error) {
      console.log(`   ⏭️  Skipping to next contract...`);
    }
    // Delay between deployments
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("                    DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════════════\n");

  if (results.length > 0) {
    console.log(`✅ Successfully submitted ${results.length}/${contracts.length} contracts:\n`);
    results.forEach((r) => {
      console.log(`  📦 ${r.name}`);
      console.log(`     Contract ID: ${r.contractId}`);
      console.log(`     TX: ${r.txid}`);
      console.log(`     Explorer: ${r.explorer}\n`);
    });

    console.log("\n📝 Next Steps:");
    console.log("  1. Wait for transactions to confirm (~10-30 minutes)");
    console.log("  2. Update CONTRACT_ADDRESS in each project's page.tsx with the contract IDs above");
    console.log("  3. Push updates to GitHub\n");

    // Save results
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
    console.log(`📄 Results saved to: ${outputFile}`);
  } else {
    console.log("❌ No contracts were deployed successfully.");
    console.log("\n💡 Common issues:");
    console.log("   - Insufficient STX balance for fees");
    console.log("   - Contract name already exists (try renaming)");
    console.log("   - Network congestion (try again later)");
  }
}

main().catch(console.error);
