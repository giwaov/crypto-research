// Tutorial 4: Unauthenticated Note Transfer Chain
//
// CONCEPTS:
// - Unauthenticated notes can be created AND consumed in the same block
// - This enables faster-than-blocktime settlement
// - Uses delegated proving (offloads ZK proof generation to a remote server)
// - Great for: order books, payment channels, micropayments
//
// FLOW:
// Alice -> Wallet1 -> Wallet2 -> Wallet3 -> Wallet4 -> Wallet5
// Each hop creates a P2ID note and immediately consumes it

export async function unauthenticatedNoteTransfer(): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('This must run in the browser');
    return;
  }

  const {
    WebClient,
    AccountStorageMode,
    NoteType,
    TransactionProver,
    Note,
    NoteAssets,
    MidenArrays,
    Felt,
    FungibleAsset,
    NoteAndArgsArray,
    NoteAndArgs,
    TransactionRequestBuilder,
    OutputNote,
  } = await import('@demox-labs/miden-sdk');

  // --- Setup with delegated prover ---
  // Delegated proving = offload ZK proof generation to a fast server
  // Trustless: the prover can't steal funds, but sees transaction details
  const client = await WebClient.createClient('https://rpc.testnet.miden.io');
  const prover = TransactionProver.newRemoteProver(
    'https://tx-prover.testnet.miden.io',
  );
  console.log('Latest block:', (await client.syncState()).blockNum());

  // --- Create accounts ---
  console.log('\n[Step 1] Creating Alice + 5 wallets...');
  const alice = await client.newWallet(AccountStorageMode.public(), true, 0);
  console.log('Alice:', alice.id().toString());

  const wallets = [];
  for (let i = 0; i < 5; i++) {
    const w = await client.newWallet(AccountStorageMode.public(), true, 0);
    wallets.push(w);
    console.log(`Wallet ${i + 1}:`, w.id().toString());
  }

  // --- Create faucet and fund Alice ---
  console.log('\n[Step 2] Creating faucet + minting to Alice...');
  const faucet = await client.newFaucet(
    AccountStorageMode.public(), false, 'MID', 8, BigInt(1_000_000), 0,
  );
  console.log('Faucet:', faucet.id().toString());

  // Mint using delegated prover (faster in browser)
  {
    const txResult = await client.executeTransaction(
      faucet.id(),
      client.newMintTransactionRequest(
        alice.id(), faucet.id(), NoteType.Public, BigInt(10_000),
      ),
    );
    const proven = await client.proveTransaction(txResult, prover);
    const height = await client.submitProvenTransaction(proven, txResult);
    await client.applyTransaction(txResult, height);
  }

  console.log('Waiting 7s for settlement...');
  await new Promise((r) => setTimeout(r, 7000));
  await client.syncState();

  // Consume minted notes
  console.log('\n[Step 3] Consuming minted notes...');
  const noteIds = (await client.getConsumableNotes(alice.id())).map((rec) =>
    rec.inputNoteRecord().id().toString(),
  );
  {
    const txResult = await client.executeTransaction(
      alice.id(),
      client.newConsumeTransactionRequest(noteIds),
    );
    const proven = await client.proveTransaction(txResult, prover);
    const height = await client.submitProvenTransaction(proven, txResult);
    await client.applyTransaction(txResult, height);
    await client.syncState();
  }

  // --- Transfer chain with unauthenticated notes ---
  // Each iteration: create P2ID note from sender, immediately consume on receiver
  // No waiting for block confirmation between create and consume!
  console.log('\n[Step 4] Unauthenticated transfer chain...');
  console.log('Alice -> W1 -> W2 -> W3 -> W4 -> W5\n');

  const startTime = Date.now();

  for (let i = 0; i < wallets.length; i++) {
    const sender = i === 0 ? alice : wallets[i - 1];
    const receiver = wallets[i];
    console.log(`--- Hop ${i + 1}: ${sender.id().toString().slice(0, 10)} -> ${receiver.id().toString().slice(0, 10)} ---`);

    // Build a P2ID note with 50 MID
    const assets = new NoteAssets([new FungibleAsset(faucet.id(), BigInt(50))]);
    const p2idNote = Note.createP2IDNote(
      sender.id(), receiver.id(), assets, NoteType.Public, new Felt(BigInt(0)),
    );

    // Create the note (sender's transaction)
    console.log('  Creating note...');
    {
      const txResult = await client.executeTransaction(
        sender.id(),
        new TransactionRequestBuilder()
          .withOwnOutputNotes(new MidenArrays.OutputNoteArray([OutputNote.full(p2idNote)]))
          .build(),
      );
      const proven = await client.proveTransaction(txResult, prover);
      const height = await client.submitProvenTransaction(proven, txResult);
      await client.applyTransaction(txResult, height);
    }

    // Consume the note AS UNAUTHENTICATED (no block wait!)
    // This is the key difference — withUnauthenticatedInputNotes
    console.log('  Consuming (unauthenticated)...');
    {
      const consumeRequest = new TransactionRequestBuilder()
        .withUnauthenticatedInputNotes(
          new NoteAndArgsArray([new NoteAndArgs(p2idNote, null)]),
        )
        .build();

      const txResult = await client.executeTransaction(receiver.id(), consumeRequest);
      const proven = await client.proveTransaction(txResult, prover);
      const height = await client.submitProvenTransaction(proven, txResult);
      const execResult = await client.applyTransaction(txResult, height);

      const txId = execResult.executedTransaction().id().toHex().toString();
      console.log(`  TX: https://testnet.midenscan.com/tx/${txId}`);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`\nTotal chain time: ${elapsed}ms (${wallets.length} hops)`);

  console.log('\n=== Tutorial 4 Complete ===');
  console.log('You learned:');
  console.log('  - Unauthenticated notes skip block confirmation');
  console.log('  - Create + consume in same batch = sub-blocktime settlement');
  console.log('  - Delegated proving speeds up browser-based ZK proofs');
  console.log('  - This pattern enables DEX order books and payment channels');
  console.log('Next: Run Tutorial 5 for cross-contract calls (FPI).');
}
