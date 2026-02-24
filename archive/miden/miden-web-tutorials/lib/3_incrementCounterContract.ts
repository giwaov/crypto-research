// Tutorial 3: Increment a Counter Smart Contract
//
// CONCEPTS:
// - Smart contracts in Miden are accounts with custom MASM code
// - Transaction scripts call procedures on contracts
// - The counter contract stores a count in storage slot 0
//
// MASM CONTRACT (counter):
//   get_count   — reads slot 0 and returns the value
//   increment   — reads slot 0, adds 1, writes back
//
// FLOW:
// 1. Import the existing counter contract from testnet
// 2. Build a transaction script that calls increment_count
// 3. Execute, prove, and submit the transaction
// 4. Read the updated count

export async function incrementCounterContract(): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('This must run in the browser');
    return;
  }

  const {
    Address,
    AccountBuilder,
    AccountComponent,
    AccountStorageMode,
    AccountType,
    SecretKey,
    StorageMap,
    StorageSlot,
    TransactionRequestBuilder,
    WebClient,
  } = await import('@demox-labs/miden-sdk');

  const client = await WebClient.createClient('https://rpc.testnet.miden.io');
  console.log('Current block:', (await client.syncState()).blockNum());

  // -----------------------------------------------------------------------
  // The Counter Contract — written in Miden Assembly (MASM)
  // -----------------------------------------------------------------------
  // This is the actual smart contract code. Let's walk through it:

  const counterContractCode = `
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
`;

  // -----------------------------------------------------------------------
  // Step 1: Import the counter contract that's already deployed on testnet
  // -----------------------------------------------------------------------
  console.log('\n[Step 1] Importing counter contract from testnet...');
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
  console.log('Counter contract loaded. Current storage slot 0:',
    counterAccount.storage().getItem(0)?.toHex());

  // -----------------------------------------------------------------------
  // Step 2: Build an account that can call the counter contract
  // -----------------------------------------------------------------------
  console.log('\n[Step 2] Creating caller account...');
  const builder = client.createScriptBuilder();
  const storageMap = new StorageMap();
  const storageSlotMap = StorageSlot.map(storageMap);

  const component = AccountComponent.compile(
    counterContractCode, builder, [storageSlotMap],
  ).withSupportsAllTypes();

  const walletSeed = new Uint8Array(32);
  crypto.getRandomValues(walletSeed);
  const secretKey = SecretKey.rpoFalconWithRNG(walletSeed);
  const authComponent = AccountComponent.createAuthComponent(secretKey);

  const result = new AccountBuilder(walletSeed)
    .accountType(AccountType.RegularAccountImmutableCode)
    .storageMode(AccountStorageMode.public())
    .withAuthComponent(authComponent)
    .withComponent(component)
    .build();

  await client.addAccountSecretKeyToWebStore(secretKey);
  await client.newAccount(result.account, false);
  await client.syncState();
  console.log('Caller account:', result.account.id().toString());

  // -----------------------------------------------------------------------
  // Step 3: Build the transaction script
  // -----------------------------------------------------------------------
  // This script tells the VM: "call increment_count on the counter contract"
  console.log('\n[Step 3] Building and executing transaction script...');

  const accountCodeLib = builder.buildLibrary(
    'external_contract::counter_contract',
    counterContractCode,
  );
  builder.linkDynamicLibrary(accountCodeLib);

  const txScriptCode = `
use.external_contract::counter_contract
begin
    call.counter_contract::increment_count
end
`;

  const txScript = builder.compileTxScript(txScriptCode);
  const txRequest = new TransactionRequestBuilder()
    .withCustomScript(txScript)
    .build();

  // -----------------------------------------------------------------------
  // Step 4: Execute, prove, submit
  // -----------------------------------------------------------------------
  await client.submitNewTransaction(counterAccount.id(), txRequest);
  await client.syncState();

  // -----------------------------------------------------------------------
  // Step 5: Read the updated count
  // -----------------------------------------------------------------------
  const updated = await client.getAccount(counterAccount.id());
  const countHex = updated?.storage().getItem(0);

  if (countHex) {
    const counterValue = Number(
      BigInt('0x' + countHex.toHex().slice(-16).match(/../g)!.reverse().join('')),
    );
    console.log('\nCounter value after increment:', counterValue);
  }

  console.log('\n=== Tutorial 3 Complete ===');
  console.log('You learned:');
  console.log('  - MASM smart contracts store state in numbered slots');
  console.log('  - get_item / set_item read and write storage');
  console.log('  - Transaction scripts call procedures on contracts');
  console.log('  - The counter incremented on the live testnet!');
  console.log('Next: Run Tutorial 4 for unauthenticated note transfers.');
}
