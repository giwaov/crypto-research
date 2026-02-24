(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[974],{2542:(e,t,o)=>{Promise.resolve().then(o.bind(o,2789))},2789:(e,t,o)=>{"use strict";o.r(t),o.d(t,{default:()=>i});var n=o(5155),a=o(2115);let c=[{label:"Tutorial 1: Create Wallet & Deploy Faucet",fn:async function(){let{WebClient:e,AccountStorageMode:t}=await Promise.all([o.e(767),o.e(223)]).then(o.bind(o,6400)),n=await e.createClient("https://rpc.testnet.miden.io");console.log("Latest block number:",(await n.syncState()).blockNum()),console.log("Creating wallet for Alice..."),console.log("Alice Account ID:",(await n.newWallet(t.public(),!0,0)).id().toString()),console.log("Deploying faucet..."),console.log("Faucet Account ID:",(await n.newFaucet(t.public(),!1,"MID",8,BigInt(1e6),0)).id().toString()),console.log("\n=== Tutorial 1 Complete ==="),console.log("You now have:"),console.log("  - A wallet (Alice) that can hold tokens"),console.log("  - A faucet that can mint MID tokens"),console.log("Next: Run Tutorial 2 to mint and transfer tokens.")},color:"#e65100"},{label:"Tutorial 2: Mint, Consume & Transfer Tokens",fn:async function(){let{WebClient:e,AccountStorageMode:t,NoteType:n,Address:a}=await Promise.all([o.e(767),o.e(223)]).then(o.bind(o,6400)),c=await e.createClient("https://rpc.testnet.miden.io");console.log("Latest block number:",(await c.syncState()).blockNum()),console.log("\n[Step 1] Creating Alice wallet and faucet...");let i=await c.newWallet(t.public(),!0,0);console.log("Alice ID:",i.id().toString());let l=await c.newFaucet(t.public(),!1,"MID",8,BigInt(1e6),0);console.log("Faucet ID:",l.id().toString()),await c.syncState(),console.log("\n[Step 2] Minting 1000 MID to Alice...");let r=c.newMintTransactionRequest(i.id(),l.id(),n.Public,BigInt(1e3));await c.submitNewTransaction(l.id(),r),console.log("Waiting 12s for block confirmation..."),await new Promise(e=>setTimeout(e,12e3)),await c.syncState(),console.log("\n[Step 3] Finding and consuming notes...");let s=await c.getConsumableNotes(i.id());console.log(`Found ${s.length} consumable note(s)`);let u=s.map(e=>e.inputNoteRecord().id().toString()),d=c.newConsumeTransactionRequest(u);await c.submitNewTransaction(i.id(),d),await c.syncState(),console.log("Notes consumed! Tokens are now in Alice's wallet."),console.log("\n[Step 4] Sending 100 MID to Bob...");let g=await c.newWallet(t.public(),!0,0);console.log("Bob ID:",g.id().toString());let p=c.newSendTransactionRequest(i.id(),g.id(),l.id(),n.Public,BigInt(100));await c.submitNewTransaction(i.id(),p),console.log("100 MID sent to Bob!"),console.log("\n=== Tutorial 2 Complete ==="),console.log("You learned:"),console.log("  - Minting creates notes, not direct balance changes"),console.log("  - Consuming a note adds tokens to your wallet"),console.log("  - P2ID notes are how you transfer tokens"),console.log("Next: Run Tutorial 3 to interact with a smart contract.")},color:"#ef6c00"},{label:"Tutorial 3: Increment Counter Contract",fn:async function(){let{Address:e,AccountBuilder:t,AccountComponent:n,AccountStorageMode:a,AccountType:c,SecretKey:i,StorageMap:l,StorageSlot:r,TransactionRequestBuilder:s,WebClient:u}=await Promise.all([o.e(767),o.e(223)]).then(o.bind(o,6400)),d=await u.createClient("https://rpc.testnet.miden.io");console.log("Current block:",(await d.syncState()).blockNum());let g=`
  use.miden::active_account   # read state of the account being executed against
  use.miden::native_account   # write state (set_item)
  use.std::sys                # system utilities

  const.COUNTER_SLOT=0        # storage slot index where we keep the count

  #! get_count: Read the counter value from storage
  #! Stack input:  []
  #! Stack output: [count]
  export.get_count
      push.COUNTER_SLOT          # push slot index 0 onto stack
      # => [0]

      exec.active_account::get_item  # read the word at slot 0
      # => [value3, value2, value1, value0]
      # A "word" is 4 field elements. Our count is in value0.

      movdn.4 dropw              # keep only the first element
      # => [count]
  end

  #! increment_count: Read count, add 1, write back
  #! Stack input:  []
  #! Stack output: []
  export.increment_count
      push.COUNTER_SLOT          # push slot index
      # => [0]

      exec.active_account::get_item  # read current value
      # => [value3, value2, value1, count]

      add.1                      # count + 1
      # => [value3, value2, value1, count+1]

      debug.stack                # print stack (visible in debug mode)

      push.COUNTER_SLOT          # where to write
      # => [0, value3, value2, value1, count+1]

      exec.native_account::set_item  # write the updated word
      # => [OLD_VALUE]

      dropw                      # clean up
      # => []
  end
`;console.log("\n[Step 1] Importing counter contract from testnet...");let p=e.fromBech32("mtst1arjemrxne8lj5qz4mg9c8mtyxg954483").accountId(),m=await d.getAccount(p);if(!m&&(await d.importAccountById(p),await d.syncState(),!(m=await d.getAccount(p))))throw Error("Counter contract not found");console.log("Counter contract loaded. Current storage slot 0:",m.storage().getItem(0)?.toHex()),console.log("\n[Step 2] Creating caller account...");let w=d.createScriptBuilder(),h=new l,b=r.map(h),_=n.compile(g,w,[b]).withSupportsAllTypes(),T=new Uint8Array(32);crypto.getRandomValues(T);let f=i.rpoFalconWithRNG(T),S=n.createAuthComponent(f),x=new t(T).accountType(c.RegularAccountImmutableCode).storageMode(a.public()).withAuthComponent(S).withComponent(_).build();await d.addAccountSecretKeyToWebStore(f),await d.newAccount(x.account,!1),await d.syncState(),console.log("Caller account:",x.account.id().toString()),console.log("\n[Step 3] Building and executing transaction script...");let y=w.buildLibrary("external_contract::counter_contract",g);w.linkDynamicLibrary(y);let C=`
use.external_contract::counter_contract
begin
    call.counter_contract::increment_count
end
`,v=w.compileTxScript(C),A=new s().withCustomScript(v).build();await d.submitNewTransaction(m.id(),A),await d.syncState();let k=await d.getAccount(m.id()),I=k?.storage().getItem(0);I&&console.log("\nCounter value after increment:",Number(BigInt("0x"+I.toHex().slice(-16).match(/../g).reverse().join("")))),console.log("\n=== Tutorial 3 Complete ==="),console.log("You learned:"),console.log("  - MASM smart contracts store state in numbered slots"),console.log("  - get_item / set_item read and write storage"),console.log("  - Transaction scripts call procedures on contracts"),console.log("  - The counter incremented on the live testnet!"),console.log("Next: Run Tutorial 4 for unauthenticated note transfers.")},color:"#f57c00"},{label:"Tutorial 4: Unauthenticated Note Transfers",fn:async function(){let{WebClient:e,AccountStorageMode:t,NoteType:n,TransactionProver:a,Note:c,NoteAssets:i,MidenArrays:l,Felt:r,FungibleAsset:s,NoteAndArgsArray:u,NoteAndArgs:d,TransactionRequestBuilder:g,OutputNote:p}=await Promise.all([o.e(767),o.e(223)]).then(o.bind(o,6400)),m=await e.createClient("https://rpc.testnet.miden.io"),w=a.newRemoteProver("https://tx-prover.testnet.miden.io");console.log("Latest block:",(await m.syncState()).blockNum()),console.log("\n[Step 1] Creating Alice + 5 wallets...");let h=await m.newWallet(t.public(),!0,0);console.log("Alice:",h.id().toString());let b=[];for(let e=0;e<5;e++){let o=await m.newWallet(t.public(),!0,0);b.push(o),console.log(`Wallet ${e+1}:`,o.id().toString())}console.log("\n[Step 2] Creating faucet + minting to Alice...");let _=await m.newFaucet(t.public(),!1,"MID",8,BigInt(1e6),0);console.log("Faucet:",_.id().toString());{let e=await m.executeTransaction(_.id(),m.newMintTransactionRequest(h.id(),_.id(),n.Public,BigInt(1e4))),t=await m.proveTransaction(e,w),o=await m.submitProvenTransaction(t,e);await m.applyTransaction(e,o)}console.log("Waiting 7s for settlement..."),await new Promise(e=>setTimeout(e,7e3)),await m.syncState(),console.log("\n[Step 3] Consuming minted notes...");let T=(await m.getConsumableNotes(h.id())).map(e=>e.inputNoteRecord().id().toString());{let e=await m.executeTransaction(h.id(),m.newConsumeTransactionRequest(T)),t=await m.proveTransaction(e,w),o=await m.submitProvenTransaction(t,e);await m.applyTransaction(e,o),await m.syncState()}console.log("\n[Step 4] Unauthenticated transfer chain..."),console.log("Alice -> W1 -> W2 -> W3 -> W4 -> W5\n");let f=Date.now();for(let e=0;e<b.length;e++){let t=0===e?h:b[e-1],o=b[e];console.log(`--- Hop ${e+1}: ${t.id().toString().slice(0,10)} -> ${o.id().toString().slice(0,10)} ---`);let a=new i([new s(_.id(),BigInt(50))]),T=c.createP2IDNote(t.id(),o.id(),a,n.Public,new r(BigInt(0)));console.log("  Creating note...");{let e=await m.executeTransaction(t.id(),new g().withOwnOutputNotes(new l.OutputNoteArray([p.full(T)])).build()),o=await m.proveTransaction(e,w),n=await m.submitProvenTransaction(o,e);await m.applyTransaction(e,n)}console.log("  Consuming (unauthenticated)...");{let e=new g().withUnauthenticatedInputNotes(new u([new d(T,null)])).build(),t=await m.executeTransaction(o.id(),e),n=await m.proveTransaction(t,w),a=await m.submitProvenTransaction(n,t),c=(await m.applyTransaction(t,a)).executedTransaction().id().toHex().toString();console.log(`  TX: https://testnet.midenscan.com/tx/${c}`)}}let S=Date.now()-f;console.log(`
Total chain time: ${S}ms (${b.length} hops)`),console.log("\n=== Tutorial 4 Complete ==="),console.log("You learned:"),console.log("  - Unauthenticated notes skip block confirmation"),console.log("  - Create + consume in same batch = sub-blocktime settlement"),console.log("  - Delegated proving speeds up browser-based ZK proofs"),console.log("  - This pattern enables DEX order books and payment channels"),console.log("Next: Run Tutorial 5 for cross-contract calls (FPI).")},color:"#fb8c00"},{label:"Tutorial 5: Foreign Procedure Invocation",fn:async function(){let{AccountBuilder:e,AccountComponent:t,Address:n,AccountType:a,MidenArrays:c,SecretKey:i,StorageSlot:l,TransactionRequestBuilder:r,ForeignAccount:s,AccountStorageRequirements:u,WebClient:d,AccountStorageMode:g}=await Promise.all([o.e(767),o.e(223)]).then(o.bind(o,6400)),p=await d.createClient("https://rpc.testnet.miden.io");console.log("Current block:",(await p.syncState()).blockNum()),console.log("\n[Step 1] Creating count reader contract...");let m=`
    use.miden::active_account
    use.miden::native_account
    use.miden::tx                    # <-- tx module has execute_foreign_procedure
    use.std::sys

    # Stack input: [account_id_prefix, account_id_suffix, get_count_proc_hash]
    export.copy_count
        exec.tx::execute_foreign_procedure
        # => [count]
        # The VM calls get_count on the foreign account and returns the result!

        push.0
        # => [slot_index, count]

        debug.stack

        exec.native_account::set_item dropw
        # => []  (saved count to our slot 0)

        exec.sys::truncate_stack
    end
`,w=p.createScriptBuilder(),h=t.compile(m,w,[l.emptyValue()]).withSupportsAllTypes(),b=new Uint8Array(32);crypto.getRandomValues(b);let _=i.rpoFalconWithRNG(b),T=t.createAuthComponent(_),f=new e(b).accountType(a.RegularAccountImmutableCode).storageMode(g.public()).withAuthComponent(T).withComponent(h).build();await p.addAccountSecretKeyToWebStore(_),await p.syncState(),await p.newAccount(f.account,!1),console.log("Count reader ID:",f.account.id().toString()),console.log("\n[Step 2] Importing counter contract...");let S=n.fromBech32("mtst1arjemrxne8lj5qz4mg9c8mtyxg954483").accountId(),x=await p.getAccount(S);if(!x&&(await p.importAccountById(S),await p.syncState(),!(x=await p.getAccount(S))))throw Error("Counter contract not found");console.log("Counter storage slot 0:",x.storage().getItem(0)?.toHex());let y=`
    use.miden::active_account
    use.miden::native_account
    use.std::sys

    const.COUNTER_SLOT=0

    export.get_count
        push.COUNTER_SLOT
        exec.active_account::get_item
        movdn.4 dropw
    end

    export.increment_count
        push.COUNTER_SLOT
        exec.active_account::get_item
        add.1
        debug.stack
        push.COUNTER_SLOT
        exec.native_account::set_item
        dropw
    end
`,C=t.compile(y,w,[l.emptyValue()]).withSupportsAllTypes().getProcedureHash("get_count");console.log("\n[Step 3] get_count procedure hash:",C),console.log("\n[Step 4] Building FPI transaction...");let v=w.buildLibrary("external_contract::count_reader_contract",m);w.linkDynamicLibrary(v);let A=`
    use.external_contract::count_reader_contract
    use.std::sys

    begin
        push.${C}
        # => [GET_COUNT_HASH]

        push.${x.id().suffix()}
        # => [account_id_suffix, GET_COUNT_HASH]

        push.${x.id().prefix()}
        # => [account_id_prefix, account_id_suffix, GET_COUNT_HASH]

        call.count_reader_contract::copy_count
        # => []

        exec.sys::truncate_stack
    end
`,k=w.compileTxScript(A),I=new u,N=s.public(S,I),R=new r().withCustomScript(k).withForeignAccounts(new c.ForeignAccountArray([N])).build();console.log("TX on MidenScan: https://testnet.midenscan.com/tx/"+(await p.submitNewTransaction(f.account.id(),R)).toHex()),await p.syncState();let D=await p.getAccount(x.id()),O=await p.getAccount(f.account.id());console.log("\nCounter contract slot 0:",D?.storage().getItem(0)?.toHex()),console.log("Reader contract slot 0: ",O?.storage().getItem(0)?.toHex());let P=O?.storage().getItem(0);P&&console.log("\nCount copied via FPI:",Number(BigInt("0x"+P.toHex().slice(-16).match(/../g).reverse().join("")))),console.log("\n=== Tutorial 5 Complete ==="),console.log("You learned:"),console.log("  - FPI lets contracts read state from other contracts"),console.log("  - tx::execute_foreign_procedure is the MASM call"),console.log("  - You need the procedure hash + target account ID"),console.log("  - ForeignAccount must be declared in the transaction request"),console.log("  - This is how oracles and composable DeFi work on Miden!")},color:"#ffa726"}];function i(){let[e,t]=(0,a.useState)(null),o=async e=>{t(e);try{await c[e].fn()}catch(e){console.error("Tutorial error:",e)}t(null)};return(0,n.jsxs)("main",{style:{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",color:"#fff",padding:"2rem"},children:[(0,n.jsx)("h1",{style:{fontSize:"2.5rem",marginBottom:"0.5rem"},children:"Miden Contract Tutorials"}),(0,n.jsx)("p",{style:{color:"#aaa",marginBottom:"2rem"},children:"Open browser console (F12) to see logs. Run tutorials in order."}),(0,n.jsx)("div",{style:{display:"flex",flexDirection:"column",gap:"1rem",maxWidth:"500px",width:"100%"},children:c.map((t,a)=>(0,n.jsx)("button",{onClick:()=>o(a),disabled:null!==e,style:{padding:"1rem 1.5rem",fontSize:"1.1rem",cursor:null!==e?"wait":"pointer",background:"transparent",border:`2px solid ${t.color}`,color:"#fff",borderRadius:"12px",transition:"all 0.2s",opacity:null!==e&&e!==a?.4:1},children:e===a?"Running... (check console)":t.label},a))}),(0,n.jsx)("p",{style:{color:"#666",marginTop:"2rem",fontSize:"0.85rem"},children:"Powered by @demox-labs/miden-sdk | Testnet RPC: rpc.testnet.miden.io"})]})}}},e=>{e.O(0,[441,794,358],()=>e(e.s=2542)),_N_E=e.O()}]);