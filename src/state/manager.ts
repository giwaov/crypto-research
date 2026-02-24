import fs from 'fs/promises';
import path from 'path';

export interface AgentState {
  deployedTokens: Array<{
    name: string;
    symbol: string;
    address: string;
    txHash: string;
    deployedAt: string;
  }>;
  deployedNFTs: Array<{
    name: string;
    symbol: string;
    address: string;
    txHash: string;
    deployedAt: string;
  }>;
  transactions: Array<{
    type: string;
    hash: string;
    timestamp: string;
    details: string;
  }>;
  casts: Array<{
    hash: string;
    text: string;
    timestamp: string;
  }>;
  stats: {
    totalTransactions: number;
    totalCasts: number;
    totalTokensDeployed: number;
    totalNFTsDeployed: number;
    startedAt: string;
    lastActionAt: string;
  };
}

const STATE_FILE = 'agent-state.json';

export function getDefaultState(): AgentState {
  return {
    deployedTokens: [],
    deployedNFTs: [],
    transactions: [],
    casts: [],
    stats: {
      totalTransactions: 0,
      totalCasts: 0,
      totalTokensDeployed: 0,
      totalNFTsDeployed: 0,
      startedAt: new Date().toISOString(),
      lastActionAt: new Date().toISOString(),
    },
  };
}

export async function loadState(): Promise<AgentState> {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data) as AgentState;
  } catch {
    return getDefaultState();
  }
}

export async function saveState(state: AgentState): Promise<void> {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

export async function addDeployedToken(
  state: AgentState,
  token: { name: string; symbol: string; address: string; txHash: string }
): Promise<AgentState> {
  state.deployedTokens.push({
    ...token,
    deployedAt: new Date().toISOString(),
  });
  state.stats.totalTokensDeployed++;
  state.stats.lastActionAt = new Date().toISOString();
  await saveState(state);
  return state;
}

export async function addDeployedNFT(
  state: AgentState,
  nft: { name: string; symbol: string; address: string; txHash: string }
): Promise<AgentState> {
  state.deployedNFTs.push({
    ...nft,
    deployedAt: new Date().toISOString(),
  });
  state.stats.totalNFTsDeployed++;
  state.stats.lastActionAt = new Date().toISOString();
  await saveState(state);
  return state;
}

export async function addTransaction(
  state: AgentState,
  tx: { type: string; hash: string; details: string }
): Promise<AgentState> {
  state.transactions.push({
    ...tx,
    timestamp: new Date().toISOString(),
  });
  state.stats.totalTransactions++;
  state.stats.lastActionAt = new Date().toISOString();
  
  // Keep only last 100 transactions
  if (state.transactions.length > 100) {
    state.transactions = state.transactions.slice(-100);
  }
  
  await saveState(state);
  return state;
}

export async function addCast(
  state: AgentState,
  cast: { hash: string; text: string }
): Promise<AgentState> {
  state.casts.push({
    ...cast,
    timestamp: new Date().toISOString(),
  });
  state.stats.totalCasts++;
  state.stats.lastActionAt = new Date().toISOString();
  
  // Keep only last 100 casts
  if (state.casts.length > 100) {
    state.casts = state.casts.slice(-100);
  }
  
  await saveState(state);
  return state;
}

export const stateManager = {
  loadState,
  saveState,
  addDeployedToken,
  addDeployedNFT,
  addTransaction,
  addCast,
  getDefaultState,
};
