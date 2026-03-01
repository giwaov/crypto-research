/**
 * Interact with Deployed Stacks Contracts
 * Generates on-chain activity for all 4 contracts
 */

const {
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  uintCV,
  stringUtf8CV,
  stringAsciiCV,
  listCV,
  bufferCV,
} = require("@stacks/transactions");
const { STACKS_MAINNET, TransactionVersion } = require("@stacks/network");
const { generateWallet, getStxAddress } = require("@stacks/wallet-sdk");
const crypto = require("crypto");

// Config
const MNEMONIC = process.env.STX_MNEMONIC;
if (!MNEMONIC) throw new Error("STX_MNEMONIC environment variable is required");
const CONTRACT_OWNER = "SP3E0DQAHTXJHH5YT9TZCSBW013YXZB25QFDVXXWY";
const network = STACKS_MAINNET;

async function broadcastTx(transaction, name) {
  const serializedTxHex = transaction.serialize();
  const serializedTx = Buffer.from(serializedTxHex, "hex");

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
    console.error(`   ❌ ${name} failed: ${JSON.stringify(errorData)}`);
    return null;
  }

  const txid = responseText.replace(/"/g, "");
  console.log(`   ✅ ${name} TX: ${txid}`);
  console.log(`      Explorer: https://explorer.stacks.co/txid/${txid}?chain=mainnet`);
  return txid;
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

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("        INTERACT WITH DEPLOYED CONTRACTS");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Generate wallet
  const wallet = await generateWallet({ secretKey: MNEMONIC, password: "" });
  const account = wallet.accounts[0];
  const privateKey = account.stxPrivateKey;
  const address = getStxAddress({ account, transactionVersion: TransactionVersion.Mainnet });

  console.log(`🔑 Address: ${address}\n`);

  let nonce = await getAccountNonce(address);
  console.log(`📊 Starting nonce: ${nonce}\n`);

  const results = [];

  // 1. Create a Poll (voting contract)
  console.log("📦 1. Creating a poll on voting contract...");
  try {
    const pollTx = await makeContractCall({
      contractAddress: CONTRACT_OWNER,
      contractName: "voting",
      functionName: "create-poll",
      functionArgs: [
        stringUtf8CV("Best Bitcoin L2?"),
        stringUtf8CV("Vote for your favorite Bitcoin Layer 2 solution"),
        listCV([
          stringUtf8CV("Stacks"),
          stringUtf8CV("Lightning"),
          stringUtf8CV("RSK"),
        ]),
        uintCV(1000), // duration in blocks (~7 days)
      ],
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      nonce: nonce++,
      fee: 50000n,
    });
    const txid = await broadcastTx(pollTx, "create-poll");
    if (txid) results.push({ contract: "voting", action: "create-poll", txid });
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }

  await new Promise((r) => setTimeout(r, 2000));

  // 2. Mint an NFT (nft-mint contract)
  console.log("\n📦 2. Minting an NFT...");
  try {
    const mintTx = await makeContractCall({
      contractAddress: CONTRACT_OWNER,
      contractName: "nft-mint",
      functionName: "mint",
      functionArgs: [],
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      nonce: nonce++,
      fee: 50000n,
    });
    const txid = await broadcastTx(mintTx, "mint");
    if (txid) results.push({ contract: "nft-mint", action: "mint", txid });
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }

  await new Promise((r) => setTimeout(r, 2000));

  // 3. Send a Tip (tip-jar contract)
  console.log("\n📦 3. Sending a tip...");
  try {
    const tipTx = await makeContractCall({
      contractAddress: CONTRACT_OWNER,
      contractName: "tip-jar",
      functionName: "tip",
      functionArgs: [
        uintCV(100000), // 0.1 STX
        stringUtf8CV("Great work on these contracts!"),
      ],
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      nonce: nonce++,
      fee: 50000n,
    });
    const txid = await broadcastTx(tipTx, "tip");
    if (txid) results.push({ contract: "tip-jar", action: "tip", txid });
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }

  await new Promise((r) => setTimeout(r, 2000));

  // 4. Create an Auction (blind-auction contract)
  console.log("\n📦 4. Creating a blind auction...");
  try {
    const auctionTx = await makeContractCall({
      contractAddress: CONTRACT_OWNER,
      contractName: "blind-auction",
      functionName: "create-auction",
      functionArgs: [
        stringAsciiCV("Rare Digital Collectible"),
        stringUtf8CV("A unique on-chain collectible item"),
        uintCV(1000000), // 1 STX minimum bid
        uintCV(500), // commit duration (~3.5 days)
        uintCV(200), // reveal duration (~1.5 days)
      ],
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      nonce: nonce++,
      fee: 50000n,
    });
    const txid = await broadcastTx(auctionTx, "create-auction");
    if (txid) results.push({ contract: "blind-auction", action: "create-auction", txid });
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("                    ACTIVITY SUMMARY");
  console.log("═══════════════════════════════════════════════════════════\n");

  if (results.length > 0) {
    console.log(`✅ Successfully submitted ${results.length} contract interactions:\n`);
    results.forEach((r) => {
      console.log(`  📦 ${r.contract}.${r.action}`);
      console.log(`     TX: ${r.txid}\n`);
    });
    console.log("⏳ Wait ~10-30 minutes for transactions to confirm.");
  } else {
    console.log("❌ No transactions were submitted successfully.");
  }
}

main().catch(console.error);
