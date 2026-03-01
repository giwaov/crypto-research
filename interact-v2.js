/**
 * Interact with v2 Deployed Stacks Contracts
 */

const {
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  uintCV,
  stringUtf8CV,
  stringAsciiCV,
} = require("@stacks/transactions");
const { STACKS_MAINNET, TransactionVersion } = require("@stacks/network");
const { generateWallet, getStxAddress } = require("@stacks/wallet-sdk");

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
    try { errorData = JSON.parse(responseText); } catch { errorData = { error: responseText }; }
    console.error(`   ❌ ${name} failed: ${JSON.stringify(errorData)}`);
    return null;
  }

  const txid = responseText.replace(/"/g, "");
  console.log(`   ✅ ${name} TX: ${txid}`);
  console.log(`      https://explorer.stacks.co/txid/${txid}?chain=mainnet`);
  return txid;
}

async function getAccountNonce(address) {
  const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/nonces`);
  const data = await response.json();
  return BigInt(data.possible_next_nonce);
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("        INTERACT WITH v2 CONTRACTS (voting-v2, nft-v2)");
  console.log("═══════════════════════════════════════════════════════════\n");

  const wallet = await generateWallet({ secretKey: MNEMONIC, password: "" });
  const account = wallet.accounts[0];
  const privateKey = account.stxPrivateKey;
  const address = getStxAddress({ account, transactionVersion: TransactionVersion.Mainnet });

  console.log(`🔑 Address: ${address}\n`);
  let nonce = await getAccountNonce(address);
  console.log(`📊 Starting nonce: ${nonce}\n`);

  const results = [];

  // 1. Create a Poll (voting-v2)
  console.log("📦 1. Creating a poll on voting-v2...");
  try {
    const tx = await makeContractCall({
      contractAddress: CONTRACT_OWNER,
      contractName: "voting-v2",
      functionName: "create-poll",
      functionArgs: [stringUtf8CV("Best Bitcoin L2?")],
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      nonce: nonce++,
      fee: 50000n,
    });
    const txid = await broadcastTx(tx, "create-poll");
    if (txid) results.push({ action: "create-poll", txid });
  } catch (e) { console.error(`   ❌ Error: ${e.message}`); }

  await new Promise((r) => setTimeout(r, 2000));

  // 2. Vote on poll 0 (voting-v2)
  console.log("\n📦 2. Voting on poll 0...");
  try {
    const tx = await makeContractCall({
      contractAddress: CONTRACT_OWNER,
      contractName: "voting-v2",
      functionName: "vote-a",
      functionArgs: [uintCV(0)],
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      nonce: nonce++,
      fee: 50000n,
    });
    const txid = await broadcastTx(tx, "vote-a");
    if (txid) results.push({ action: "vote-a", txid });
  } catch (e) { console.error(`   ❌ Error: ${e.message}`); }

  await new Promise((r) => setTimeout(r, 2000));

  // 3. Mint NFT (nft-v2) - costs 1 STX
  console.log("\n📦 3. Minting NFT from nft-v2...");
  try {
    const tx = await makeContractCall({
      contractAddress: CONTRACT_OWNER,
      contractName: "nft-v2",
      functionName: "mint",
      functionArgs: [],
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      nonce: nonce++,
      fee: 50000n,
    });
    const txid = await broadcastTx(tx, "mint");
    if (txid) results.push({ action: "mint", txid });
  } catch (e) { console.error(`   ❌ Error: ${e.message}`); }

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("                    ACTIVITY SUMMARY");
  console.log("═══════════════════════════════════════════════════════════\n");

  if (results.length > 0) {
    console.log(`✅ Submitted ${results.length} contract interactions:\n`);
    results.forEach((r) => console.log(`  📦 ${r.action}: ${r.txid}\n`));
  } else {
    console.log("❌ No transactions submitted.");
  }
}

main().catch(console.error);
