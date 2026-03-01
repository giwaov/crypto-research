const {makeContractCall,AnchorMode,PostConditionMode,uintCV,stringUtf8CV,stringAsciiCV} = require('@stacks/transactions');
const {STACKS_MAINNET,TransactionVersion} = require('@stacks/network');
const {generateWallet,getStxAddress} = require('@stacks/wallet-sdk');

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
  const account = wallet.accounts[0];
  const privateKey = account.stxPrivateKey;
  
  const r = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${ADDR}/nonces`);
  const d = await r.json();
  let nonce = BigInt(d.possible_next_nonce);
  
  console.log("Nonce:", nonce);
  console.log("\n=== Interacting with deployed contracts ===\n");

  // 1. Send a tip (tip-jar-v3) - 0.01 STX
  console.log("1. Sending tip...");
  const tip = await makeContractCall({
    contractAddress: ADDR, contractName: "tip-jar-v3", functionName: "tip",
    functionArgs: [uintCV(10000)], // 0.01 STX
    senderKey: privateKey, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(tip, "tip");

  await new Promise(r => setTimeout(r, 1500));

  // 2. Create another poll (voting-v2)
  console.log("\n2. Creating poll...");
  const poll = await makeContractCall({
    contractAddress: ADDR, contractName: "voting-v2", functionName: "create-poll",
    functionArgs: [stringUtf8CV("Stacks vs Lightning?")],
    senderKey: privateKey, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
  });
  await broadcast(poll, "create-poll");

  await new Promise(r => setTimeout(r, 1500));

  // 3. Create auction (auction-v3 - might not be ready yet)
  console.log("\n3. Creating auction...");
  try {
    const auction = await makeContractCall({
      contractAddress: ADDR, contractName: "auction-v3", functionName: "create-auction",
      functionArgs: [stringAsciiCV("Digital Art"), uintCV(500000), uintCV(100)],
      senderKey: privateKey, network: STACKS_MAINNET, anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow, nonce: nonce++, fee: 50000n,
    });
    await broadcast(auction, "create-auction");
  } catch (e) { console.log("auction-v3 not ready yet"); }

  console.log("\n=== Done! ===");
}

main().catch(console.error);
