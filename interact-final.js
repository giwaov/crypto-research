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
  console.log(`${name}: ${resp.ok ? 'OK' : 'FAIL'} ${txt.replace(/"/g, '')}`);
}

async function main() {
  const wallet = await generateWallet({secretKey: MNEMONIC, password: ""});
  const pk = wallet.accounts[0].stxPrivateKey;
  
  const r = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${ADDR}/nonces`);
  let nonce = BigInt((await r.json()).possible_next_nonce);
  console.log("Starting nonce:", nonce);

  // Create poll 4
  console.log("\n1. Creating poll 4...");
  let tx = await makeContractCall({
    contractAddress: ADDR, contractName: "voting-v2", functionName: "create-poll",
    functionArgs: [stringUtf8CV("DeFi or NFTs?")],
    senderKey: pk, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tx, "poll 4");

  // Vote B on poll 3
  console.log("\n2. Vote B on poll 3...");
  tx = await makeContractCall({
    contractAddress: ADDR, contractName: "voting-v2", functionName: "vote-b",
    functionArgs: [uintCV(3)],
    senderKey: pk, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tx, "vote-b poll3");

  // Mint NFT #4
  console.log("\n3. Minting NFT #4...");
  tx = await makeContractCall({
    contractAddress: ADDR, contractName: "nft-v2", functionName: "mint",
    functionArgs: [],
    senderKey: pk, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tx, "mint #4");

  // Tip #5
  console.log("\n4. Sending tip...");
  tx = await makeContractCall({
    contractAddress: ADDR, contractName: "tip-jar-v3", functionName: "tip",
    functionArgs: [uintCV(30000)],
    senderKey: pk, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tx, "tip #5");

  // Vote A on poll 4
  console.log("\n5. Vote A on poll 4...");
  tx = await makeContractCall({
    contractAddress: ADDR, contractName: "voting-v2", functionName: "vote-a",
    functionArgs: [uintCV(4)],
    senderKey: pk, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tx, "vote-a poll4");

  // Mint NFT #5
  console.log("\n6. Minting NFT #5...");
  tx = await makeContractCall({
    contractAddress: ADDR, contractName: "nft-v2", functionName: "mint",
    functionArgs: [],
    senderKey: pk, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tx, "mint #5");

  console.log("\nDone! Final batch complete.");
}

main().catch(console.error);
