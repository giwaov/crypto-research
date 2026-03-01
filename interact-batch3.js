const {makeContractCall,AnchorMode,PostConditionMode,uintCV} = require('@stacks/transactions');
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

  // 1. Mint NFT #3
  console.log("\n1. Minting NFT #3...");
  let tx = await makeContractCall({
    contractAddress: ADDR, contractName: "nft-v2", functionName: "mint",
    functionArgs: [], senderKey: pk, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tx, "mint #3");

  // 2. Vote B on poll 2
  console.log("\n2. Vote B on poll 2...");
  tx = await makeContractCall({
    contractAddress: ADDR, contractName: "voting-v2", functionName: "vote-b",
    functionArgs: [uintCV(2)], senderKey: pk, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tx, "vote-b #2");

  // 3. Vote A on poll 3
  console.log("\n3. Vote A on poll 3...");
  tx = await makeContractCall({
    contractAddress: ADDR, contractName: "voting-v2", functionName: "vote-a",
    functionArgs: [uintCV(3)], senderKey: pk, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tx, "vote-a #3");

  // 4. Send tip
  console.log("\n4. Sending tip...");
  tx = await makeContractCall({
    contractAddress: ADDR, contractName: "tip-jar-v3", functionName: "tip",
    functionArgs: [uintCV(25000)], senderKey: pk, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tx, "tip #4");

  console.log("\nDone!");
}

main().catch(console.error);
