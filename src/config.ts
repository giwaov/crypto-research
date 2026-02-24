import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Blockchain
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
  baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  baseSepoliaRpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  useTestnet: process.env.USE_TESTNET === 'true',
  
  // AI - OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',

  // AI - OpenMind
  openmindApiKey: process.env.OPENMIND_API_KEY || '',
  openmindBaseUrl: process.env.OPENMIND_BASE_URL || 'https://api.openmind.network',
  openmindModel: process.env.OPENMIND_MODEL || 'openmind-1',
  openmindFeatures: (process.env.OPENMIND_FEATURES || '').split(',').map(f => f.trim()).filter(Boolean),

  // Farcaster
  neynarApiKey: process.env.NEYNAR_API_KEY || '',
  farcasterSignerUuid: process.env.FARCASTER_SIGNER_UUID || '',
  farcasterFid: parseInt(process.env.FARCASTER_FID || '0'),
  
  // Agent
  agentName: process.env.AGENT_NAME || 'CrabDAO Agent',
  actionIntervalMinutes: parseInt(process.env.ACTION_INTERVAL_MINUTES || '30'),
  maxEthPerTx: parseFloat(process.env.MAX_ETH_PER_TX || '0.001'),
  maxTxPerDay: parseInt(process.env.MAX_TX_PER_DAY || '10'),
  
  // Optional
  basescanApiKey: process.env.BASESCAN_API_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;

export function validateConfig(): boolean {
  const required = [
    ['PRIVATE_KEY', config.privateKey],
    ['OPENAI_API_KEY', config.openaiApiKey],
    ['NEYNAR_API_KEY', config.neynarApiKey],
    ['FARCASTER_SIGNER_UUID', config.farcasterSignerUuid],
  ];

  const missing = required.filter(([_, value]) => !value);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(([name]) => console.error(`   - ${name}`));
    return false;
  }

  return true;
}
