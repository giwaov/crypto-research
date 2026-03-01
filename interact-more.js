const {makeContractCall,AnchorMode,PostConditionMode,uintCV,stringUtf8CV} = require('@stacks/transactions');
const {STACKS_MAINNET} = require('@stacks/network');
const {generateWallet} = require('@stacks/wallet-sdk');

const MNEMONIC = process.env.STX_MNEMONIC;
if (!MNEMONIC) throw new Error("STX_MNEMONIC environment variable is required");
const ADDR = "SP3E0DQAHTXJHH5YT9TZCSBW013YXZB25QFDVXXWY";

async function broadcast(tx, name) {
  const resp = await fetch("https://api.mainnet.hiro.so/v2/transactions", {
    method: "POST", headers: {"Content-Type": "application/octet-stream"},
    body: Buffer.from(tx.serialize(), "hex"),
  });
  const txt = await resp.text();
  const txid = txt.replace(/"/g, '');
  console.log(`${name}: ${resp.ok ? '✅' : '❌'} ${txid}`);
  return resp.ok ? txid : null;
}

async function main() {
  const wallet = await generateWallet({secretKey: MNEMONIC, password: ""});
  const privateKey = wallet.accounts[0].stxPrivateKey;
  
  const r = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${ADDR}/nonces`);
  const d = await r.json();
  let nonce = BigInt(d.possible_next_nonce);
  
  console.log("Starting nonce:", nonce);
  console.log("\n=== More contract interactions ===\n");

  // 1. Vote B on poll 1
  console.log("1. Vote B on poll 1...");
  const vote1 = await makeContractCall({
    contractAddress: ADDR, contractName: "voting-v2", functionName: "vote-b",
    functionArgs: [uintCV(1)],
    senderKey: privateKey, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(vote1, "vote-b poll 1");

  // 2. Mint NFT #2
  console.log("\n2. Minting NFT #2...");
  const mint = await makeContractCall({
    contractAddress: ADDR, contractName: "nft-v2", functionName: "mint",
    functionArgs: [],
    senderKey: privateKey, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(mint, "mint NFT #2");

  // 3. Send tip
  console.log("\n3. Sending tip...");
  const tip = await makeContractCall({
    contractAddress: ADDR, contractName: "tip-jar-v3", functionName: "tip",
    functionArgs: [uintCV(15000)], // 0.015 STX
    senderKey: privateKey, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tip, "tip");

  // 4. Create poll 3
  console.log("\n4. Creating poll 3...");
  const poll3 = await makeContractCall({
    contractAddress: ADDR, contractName: "voting-v2", functionName: "create-poll",
    functionArgs: [stringUtf8CV("Best L2: Stacks?")],
    senderKey: privateKey, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(poll3, "create poll 3");

  // 5. Vote A on poll 2
  console.log("\n5. Vote A on poll 2...");
  const vote2 = await makeContractCall({
    contractAddress: ADDR, contractName: "voting-v2", functionName: "vote-a",
    functionArgs: [uintCV(2)],
    senderKey: privateKey, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(vote2, "vote-a poll 2");

  console.log("\n=== Done! ===");
}

main().catch(console.error);
