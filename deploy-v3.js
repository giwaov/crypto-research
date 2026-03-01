const {makeContractDeploy,AnchorMode,PostConditionMode} = require('@stacks/transactions');
const {STACKS_MAINNET,TransactionVersion} = require('@stacks/network');
const {generateWallet,getStxAddress} = require('@stacks/wallet-sdk');
const fs = require('fs');

async function deploy() {
  const mnemonic = process.env.STX_MNEMONIC;
  if (!mnemonic) throw new Error("STX_MNEMONIC environment variable is required");
  const wallet = await generateWallet({secretKey:mnemonic,password:''});
  const account = wallet.accounts[0];
  const privateKey = account.stxPrivateKey;
  const address = getStxAddress({account,transactionVersion:TransactionVersion.Mainnet});
  
  const r = await fetch('https://api.mainnet.hiro.so/extended/v1/address/'+address+'/nonces');
  const d = await r.json();
  let nonce = BigInt(d.possible_next_nonce);
  
  console.log('Address:', address);
  console.log('Nonce:', nonce);
  
  const contracts = [
    {name:'tip-jar-v3',path:'stacks-tip-jar/contracts/tip-jar-v3.clar'},
    {name:'auction-v3',path:'stacks-blind-auction/contracts/auction-v3.clar'}
  ];
  
  for (const c of contracts) {
    const code = fs.readFileSync(c.path,'utf8');
    console.log('\nDeploying', c.name, '...');
    const tx = await makeContractDeploy({contractName:c.name,codeBody:code,senderKey:privateKey,network:STACKS_MAINNET,anchorMode:AnchorMode.Any,postConditionMode:PostConditionMode.Allow,nonce:nonce++,fee:100000n});
    const resp = await fetch('https://api.mainnet.hiro.so/v2/transactions',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:Buffer.from(tx.serialize(),'hex')});
    const txt = await resp.text();
    console.log('TX:', txt.replace(/"/g,''));
  }
}
deploy();
