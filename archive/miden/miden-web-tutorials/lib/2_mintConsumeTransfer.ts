// Tutorial 2: Mint Tokens, Consume Notes, Transfer to Another Account
//
// CONCEPTS:
// - Minting creates a "note" (like a cashier's check) — NOT directly in your wallet
// - You must CONSUME a note to add tokens to your balance
// - P2ID (Pay-to-ID) notes lock tokens to a specific recipient
//
// FLOW:
// 1. Create Alice wallet + faucet
// 2. Mint 1000 MID to Alice (creates a note)
// 3. Alice consumes the note (tokens enter her wallet)
// 4. Alice sends 100 MID to Bob via P2ID note

export async function mintConsumeTransfer(): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('This must run in the browser');
    return;
  }

  const { WebClient, AccountStorageMode, NoteType, Address } = await import(
    '@demox-labs/miden-sdk'
  );

  const client = await WebClient.createClient('https://rpc.testnet.miden.io');
  const state = await client.syncState();
  console.log('Latest block number:', state.blockNum());

  // Step 1: Create Alice + faucet
  console.log('\n[Step 1] Creating Alice wallet and faucet...');
  const alice = await client.newWallet(AccountStorageMode.public(), true, 0);
  console.log('Alice ID:', alice.id().toString());

  const faucet = await client.newFaucet(
    AccountStorageMode.public(), false, 'MID', 8, BigInt(1_000_000), 0,
  );
  console.log('Faucet ID:', faucet.id().toString());

  await client.syncState();

  // Step 2: Mint 1000 MID to Alice
  // This creates a PUBLIC note containing 1000 tokens addressed to Alice
  console.log('\n[Step 2] Minting 1000 MID to Alice...');
  const mintTxRequest = client.newMintTransactionRequest(
    alice.id(),       // recipient
    faucet.id(),      // minter
    NoteType.Public,  // visible on-chain
    BigInt(1000),     // amount
  );
  await client.submitNewTransaction(faucet.id(), mintTxRequest);

  // Wait for the note to be committed in a block
  console.log('Waiting 12s for block confirmation...');
  await new Promise((r) => setTimeout(r, 12000));
  await client.syncState();

  // Step 3: Consume the note — move tokens into Alice's wallet
  console.log('\n[Step 3] Finding and consuming notes...');
  const consumableNotes = await client.getConsumableNotes(alice.id());
  console.log(`Found ${consumableNotes.length} consumable note(s)`);

  const noteIds = consumableNotes.map((n) => n.inputNoteRecord().id().toString());
  const consumeTxRequest = client.newConsumeTransactionRequest(noteIds);
  await client.submitNewTransaction(alice.id(), consumeTxRequest);
  await client.syncState();
  console.log('Notes consumed! Tokens are now in Alice\'s wallet.');

  // Step 4: Send 100 MID to Bob
  // This creates a P2ID note locked to Bob's account
  console.log('\n[Step 4] Sending 100 MID to Bob...');
  const bob = await client.newWallet(AccountStorageMode.public(), true, 0);
  console.log('Bob ID:', bob.id().toString());

  const sendTxRequest = client.newSendTransactionRequest(
    alice.id(),       // sender
    bob.id(),         // recipient
    faucet.id(),      // which token
    NoteType.Public,  // public note
    BigInt(100),      // amount
  );
  await client.submitNewTransaction(alice.id(), sendTxRequest);
  console.log('100 MID sent to Bob!');

  console.log('\n=== Tutorial 2 Complete ===');
  console.log('You learned:');
  console.log('  - Minting creates notes, not direct balance changes');
  console.log('  - Consuming a note adds tokens to your wallet');
  console.log('  - P2ID notes are how you transfer tokens');
  console.log('Next: Run Tutorial 3 to interact with a smart contract.');
}
