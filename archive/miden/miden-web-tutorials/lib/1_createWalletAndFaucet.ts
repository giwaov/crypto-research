// Tutorial 1: Create a Wallet Account & Deploy a Fungible Faucet
//
// CONCEPTS:
// - Public vs private accounts (public = state visible on-chain)
// - Accounts = smart contracts in Miden (native account abstraction)
// - Faucets = special accounts that can mint new tokens
//
// WHAT HAPPENS:
// 1. Connect to Miden testnet via WebClient
// 2. Create a public wallet for "Alice"
// 3. Deploy a faucet that can mint "MID" tokens

export async function createWalletAndFaucet(): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('This must run in the browser');
    return;
  }

  const { WebClient, AccountStorageMode } = await import('@demox-labs/miden-sdk');

  // --- Connect to testnet ---
  const client = await WebClient.createClient('https://rpc.testnet.miden.io');
  const state = await client.syncState();
  console.log('Latest block number:', state.blockNum());

  // --- Create Alice's wallet ---
  // AccountStorageMode.public() = account state visible on-chain
  // true = mutable (code can be upgraded)
  // 0 = RPO Falcon 512 auth scheme
  console.log('Creating wallet for Alice...');
  const alice = await client.newWallet(AccountStorageMode.public(), true, 0);
  console.log('Alice Account ID:', alice.id().toString());

  // --- Deploy a fungible faucet ---
  // This creates a token factory that can mint "MID" tokens
  // Parameters: storage mode, immutable, symbol, decimals, max supply, auth scheme
  console.log('Deploying faucet...');
  const faucet = await client.newFaucet(
    AccountStorageMode.public(), // public so anyone can verify minting
    false,                       // immutable — rules can't change
    'MID',                       // token symbol
    8,                           // decimals (1 MID = 100,000,000 base units)
    BigInt(1_000_000),           // max supply
    0,                           // RPO Falcon 512
  );
  console.log('Faucet Account ID:', faucet.id().toString());

  console.log('\n=== Tutorial 1 Complete ===');
  console.log('You now have:');
  console.log('  - A wallet (Alice) that can hold tokens');
  console.log('  - A faucet that can mint MID tokens');
  console.log('Next: Run Tutorial 2 to mint and transfer tokens.');
}
