import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  parseEther,
  formatEther,
  type Address,
  type Hash,
  type TransactionReceipt,
  type PublicClient,
  type WalletClient,
  type Chain
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { config } from '../config.js';
import logger from '../utils/logger.js';

// Get the appropriate chain based on config
const getChain = (): Chain => config.useTestnet ? baseSepolia : base;
const getRpcUrl = (): string => config.useTestnet ? config.baseSepoliaRpcUrl : config.baseRpcUrl;

// Create account from private key
const account = privateKeyToAccount(
  config.privateKey.startsWith('0x') 
    ? config.privateKey as `0x${string}`
    : `0x${config.privateKey}` as `0x${string}`
);

// Create clients
export const publicClient: PublicClient = createPublicClient({
  chain: getChain(),
  transport: http(getRpcUrl()),
});

export const walletClient: WalletClient = createWalletClient({
  account,
  chain: getChain(),
  transport: http(getRpcUrl()),
});

export const agentAddress: Address = account.address;

/**
 * Get the current ETH balance of the agent wallet
 */
export async function getBalance(): Promise<string> {
  const balance = await publicClient.getBalance({ address: agentAddress });
  return formatEther(balance);
}

/**
 * Get the current gas price
 */
export async function getGasPrice(): Promise<bigint> {
  return await publicClient.getGasPrice();
}

/**
 * Send ETH to an address
 */
export async function sendEth(to: Address, amountEth: string): Promise<Hash> {
  const amount = parseEther(amountEth);
  
  // Safety check
  if (parseFloat(amountEth) > config.maxEthPerTx) {
    throw new Error(`Amount ${amountEth} ETH exceeds max allowed ${config.maxEthPerTx} ETH`);
  }

  logger.info(`Sending ${amountEth} ETH to ${to}`);
  
  const hash = await walletClient.sendTransaction({
    account,
    chain: getChain(),
    to,
    value: amount,
  });

  logger.info(`Transaction sent: ${hash}`);
  return hash;
}

/**
 * Wait for a transaction to be mined
 */
export async function waitForTransaction(hash: Hash): Promise<TransactionReceipt> {
  logger.info(`Waiting for transaction ${hash} to be mined...`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  logger.info(`Transaction mined in block ${receipt.blockNumber}`);
  return receipt;
}

/**
 * Get transaction count (nonce) for the agent wallet
 */
export async function getTransactionCount(): Promise<number> {
  return await publicClient.getTransactionCount({ address: agentAddress });
}

/**
 * Get current block number
 */
export async function getBlockNumber(): Promise<bigint> {
  return await publicClient.getBlockNumber();
}

/**
 * Check if an address is a contract
 */
export async function isContract(address: Address): Promise<boolean> {
  const code = await publicClient.getBytecode({ address });
  return code !== undefined && code !== '0x';
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(hash: Hash): string {
  const baseUrl = config.useTestnet 
    ? 'https://sepolia.basescan.org' 
    : 'https://basescan.org';
  return `${baseUrl}/tx/${hash}`;
}

/**
 * Get explorer URL for an address
 */
export function getAddressExplorerUrl(address: Address): string {
  const baseUrl = config.useTestnet 
    ? 'https://sepolia.basescan.org' 
    : 'https://basescan.org';
  return `${baseUrl}/address/${address}`;
}

export { account };
