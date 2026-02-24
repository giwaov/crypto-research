import { 
  encodeDeployData, 
  parseEther,
  type Address,
  type Hash 
} from 'viem';
import { publicClient, walletClient, agentAddress, waitForTransaction, getExplorerUrl, account } from './client.js';
import { ERC20_ABI, ERC20_BYTECODE, ERC721_ABI, ERC721_BYTECODE } from './contracts.js';
import logger from '../utils/logger.js';

export interface TokenDeploymentResult {
  contractAddress: Address;
  transactionHash: Hash;
  name: string;
  symbol: string;
  totalSupply: string;
  explorerUrl: string;
}

export interface NFTDeploymentResult {
  contractAddress: Address;
  transactionHash: Hash;
  name: string;
  symbol: string;
  explorerUrl: string;
}

/**
 * Deploy a new ERC20 token on Base
 */
export async function deployERC20Token(
  name: string,
  symbol: string,
  totalSupply: string = '1000000' // Default 1 million tokens
): Promise<TokenDeploymentResult> {
  logger.info(`Deploying ERC20 token: ${name} (${symbol})`);
  
  // Convert total supply to wei (18 decimals)
  const totalSupplyWei = parseEther(totalSupply);
  
  // Encode constructor arguments with bytecode
  const deployData = encodeDeployData({
    abi: ERC20_ABI,
    bytecode: ERC20_BYTECODE,
    args: [name, symbol, totalSupplyWei],
  });

  // Deploy the contract
  const hash = await walletClient.sendTransaction({
    account,
    chain: publicClient.chain,
    data: deployData,
  });

  logger.info(`Token deployment transaction sent: ${hash}`);
  
  // Wait for deployment
  const receipt = await waitForTransaction(hash);
  
  if (!receipt.contractAddress) {
    throw new Error('Contract deployment failed - no contract address');
  }

  const result: TokenDeploymentResult = {
    contractAddress: receipt.contractAddress,
    transactionHash: hash,
    name,
    symbol,
    totalSupply,
    explorerUrl: getExplorerUrl(hash),
  };

  logger.info(`✅ Token deployed at: ${result.contractAddress}`);
  
  return result;
}

/**
 * Deploy a new NFT collection (ERC721) on Base
 */
export async function deployNFTCollection(
  name: string,
  symbol: string
): Promise<NFTDeploymentResult> {
  logger.info(`Deploying NFT collection: ${name} (${symbol})`);
  
  const deployData = encodeDeployData({
    abi: ERC721_ABI,
    bytecode: ERC721_BYTECODE,
    args: [name, symbol],
  });

  const hash = await walletClient.sendTransaction({
    account,
    chain: publicClient.chain,
    data: deployData,
  });

  logger.info(`NFT deployment transaction sent: ${hash}`);
  
  const receipt = await waitForTransaction(hash);
  
  if (!receipt.contractAddress) {
    throw new Error('NFT deployment failed - no contract address');
  }

  const result: NFTDeploymentResult = {
    contractAddress: receipt.contractAddress,
    transactionHash: hash,
    name,
    symbol,
    explorerUrl: getExplorerUrl(hash),
  };

  logger.info(`✅ NFT collection deployed at: ${result.contractAddress}`);
  
  return result;
}

/**
 * Transfer ERC20 tokens to an address
 */
export async function transferTokens(
  tokenAddress: Address,
  to: Address,
  amount: string
): Promise<Hash> {
  logger.info(`Transferring ${amount} tokens from ${tokenAddress} to ${to}`);
  
  const amountWei = parseEther(amount);
  
  const hash = await walletClient.writeContract({
    account,
    chain: publicClient.chain,
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to, amountWei],
  });

  logger.info(`Transfer transaction: ${hash}`);
  await waitForTransaction(hash);
  
  return hash;
}

/**
 * Get token balance for an address
 */
export async function getTokenBalance(
  tokenAddress: Address,
  holderAddress: Address
): Promise<string> {
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [holderAddress],
  });

  // Convert from wei to tokens (18 decimals)
  return (Number(balance) / 1e18).toString();
}

/**
 * Get token info
 */
export async function getTokenInfo(tokenAddress: Address): Promise<{
  name: string;
  symbol: string;
  totalSupply: string;
}> {
  const [name, symbol, totalSupply] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'name',
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'symbol',
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'totalSupply',
    }),
  ]);

  return {
    name: name as string,
    symbol: symbol as string,
    totalSupply: (Number(totalSupply) / 1e18).toString(),
  };
}

/**
 * Mint an NFT to an address
 */
export async function mintNFT(
  collectionAddress: Address,
  to: Address
): Promise<Hash> {
  logger.info(`Minting NFT from ${collectionAddress} to ${to}`);
  
  const hash = await walletClient.writeContract({
    account,
    chain: publicClient.chain,
    address: collectionAddress,
    abi: ERC721_ABI,
    functionName: 'mint',
    args: [to],
  });

  logger.info(`Mint transaction: ${hash}`);
  await waitForTransaction(hash);
  
  return hash;
}
