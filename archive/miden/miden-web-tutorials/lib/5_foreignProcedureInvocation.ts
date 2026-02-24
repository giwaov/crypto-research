// Tutorial 5: Foreign Procedure Invocation (FPI)
//
// CONCEPTS:
// - FPI = one contract reading state from another contract (read-only cross-contract call)
// - Like Solidity's view/pure external calls, but with ZK proofs
// - Core primitive for price oracles, composable DeFi, etc.
//
// WHAT WE BUILD:
// - A "count reader" contract that reads from the counter contract via FPI
// - The reader calls get_count on the counter, then saves the result to its own storage
//
//   [Count Reader Contract] --FPI--> [Counter Contract]
//         copy_count()       reads    get_count()
//         saves to slot 0             returns count from slot 0

export async function foreignProcedureInvocation(): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('This must run in the browser');
    return;
  }

  const {
    AccountBuilder,
    AccountComponent,
    Address,
    AccountType,
    MidenArrays,
    SecretKey,
    StorageSlot,
    TransactionRequestBuilder,
    ForeignAccount,
    AccountStorageRequirements,
    WebClient,
    AccountStorageMode,
  } = await import('@demox-labs/miden-sdk');

  const client = await WebClient.createClient('https://rpc.testnet.miden.io');
  console.log('Current block:', (await client.syncState()).blockNum());

  // -----------------------------------------------------------------------
  // Step 1: The Count Reader Contract (MASM)
  // -----------------------------------------------------------------------
  // This contract has one procedure: copy_count
  // It expects the stack to contain:
  //   [account_id_prefix, account_id_suffix, get_count_proc_hash]
  // It calls tx::execute_foreign_procedure to read another contract's state
  // Then writes the result to its own storage slot 0

  console.log('\n[Step 1] Creating count reader contract...');

  const countReaderCode = `
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
`;

  const builder = client.createScriptBuilder();
  const readerComponent = AccountComponent.compile(
    countReaderCode, builder, [StorageSlot.emptyValue()],
  ).withSupportsAllTypes();

  const walletSeed = new Uint8Array(32);
  crypto.getRandomValues(walletSeed);
  const secretKey = SecretKey.rpoFalconWithRNG(walletSeed);
  const authComponent = AccountComponent.createAuthComponent(secretKey);

  const readerContract = new AccountBuilder(walletSeed)
    .accountType(AccountType.RegularAccountImmutableCode)
    .storageMode(AccountStorageMode.public())
    .withAuthComponent(authComponent)
    .withComponent(readerComponent)
    .build();

  await client.addAccountSecretKeyToWebStore(secretKey);
  await client.syncState();
  await client.newAccount(readerContract.account, false);
  console.log('Count reader ID:', readerContract.account.id().toString());

  // -----------------------------------------------------------------------
  // Step 2: Import the counter contract from testnet
  // -----------------------------------------------------------------------
  console.log('\n[Step 2] Importing counter contract...');
  const counterContractId = Address.fromBech32(
    'mtst1arjemrxne8lj5qz4mg9c8mtyxg954483',
  ).accountId();

  let counterAccount = await client.getAccount(counterContractId);
  if (!counterAccount) {
    await client.importAccountById(counterContractId);
    await client.syncState();
    counterAccount = await client.getAccount(counterContractId);
    if (!counterAccount) throw new Error('Counter contract not found');
  }
  console.log('Counter storage slot 0:', counterAccount.storage().getItem(0)?.toHex());

  // -----------------------------------------------------------------------
  // Step 3: Get the procedure hash for get_count
  // -----------------------------------------------------------------------
  // We need the hash of get_count so we can tell execute_foreign_procedure
  // which procedure to call on the counter contract

  const counterContractCode = `
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
`;

  const counterComponent = AccountComponent.compile(
    counterContractCode, builder, [StorageSlot.emptyValue()],
  ).withSupportsAllTypes();

  const getCountProcHash = counterComponent.getProcedureHash('get_count');
  console.log('\n[Step 3] get_count procedure hash:', getCountProcHash);

  // -----------------------------------------------------------------------
  // Step 4: Build the FPI transaction script
  // -----------------------------------------------------------------------
  // This script pushes the procedure hash and target account ID onto the stack,
  // then calls copy_count on our reader contract

  console.log('\n[Step 4] Building FPI transaction...');

  const readerLib = builder.buildLibrary(
    'external_contract::count_reader_contract',
    countReaderCode,
  );
  builder.linkDynamicLibrary(readerLib);

  const fpiScriptCode = `
    use.external_contract::count_reader_contract
    use.std::sys

    begin
        push.${getCountProcHash}
        # => [GET_COUNT_HASH]

        push.${counterAccount.id().suffix()}
        # => [account_id_suffix, GET_COUNT_HASH]

        push.${counterAccount.id().prefix()}
        # => [account_id_prefix, account_id_suffix, GET_COUNT_HASH]

        call.count_reader_contract::copy_count
        # => []

        exec.sys::truncate_stack
    end
`;

  const txScript = builder.compileTxScript(fpiScriptCode);

  // Declare the counter contract as a "foreign account" in our transaction
  const storageRequirements = new AccountStorageRequirements();
  const foreignAccount = ForeignAccount.public(counterContractId, storageRequirements);

  const txRequest = new TransactionRequestBuilder()
    .withCustomScript(txScript)
    .withForeignAccounts(new MidenArrays.ForeignAccountArray([foreignAccount]))
    .build();

  // -----------------------------------------------------------------------
  // Step 5: Execute and verify
  // -----------------------------------------------------------------------
  const txId = await client.submitNewTransaction(
    readerContract.account.id(), txRequest,
  );
  console.log('TX on MidenScan: https://testnet.midenscan.com/tx/' + txId.toHex());

  await client.syncState();

  // Read both contracts' storage to verify the copy
  const updatedCounter = await client.getAccount(counterAccount.id());
  const updatedReader = await client.getAccount(readerContract.account.id());

  console.log('\nCounter contract slot 0:', updatedCounter?.storage().getItem(0)?.toHex());
  console.log('Reader contract slot 0: ', updatedReader?.storage().getItem(0)?.toHex());

  const readerStorage = updatedReader?.storage().getItem(0);
  if (readerStorage) {
    const countValue = Number(
      BigInt('0x' + readerStorage.toHex().slice(-16).match(/../g)!.reverse().join('')),
    );
    console.log('\nCount copied via FPI:', countValue);
  }

  console.log('\n=== Tutorial 5 Complete ===');
  console.log('You learned:');
  console.log('  - FPI lets contracts read state from other contracts');
  console.log('  - tx::execute_foreign_procedure is the MASM call');
  console.log('  - You need the procedure hash + target account ID');
  console.log('  - ForeignAccount must be declared in the transaction request');
  console.log('  - This is how oracles and composable DeFi work on Miden!');
}
