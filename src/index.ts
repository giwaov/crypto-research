import { config, validateConfig } from './config.js';
import logger from './utils/logger.js';
import { agentAddress, getBalance, getAddressExplorerUrl } from './blockchain/index.js';

async function main() {
  console.log(`
  🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀
  
     ██████╗██████╗  █████╗ ██████╗ 
    ██╔════╝██╔══██╗██╔══██╗██╔══██╗
    ██║     ██████╔╝███████║██████╔╝
    ██║     ██╔══██╗██╔══██║██╔══██╗
    ╚██████╗██║  ██║██║  ██║██████╔╝
     ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ 
                                     
       ██████╗  █████╗  ██████╗      
       ██╔══██╗██╔══██╗██╔═══██╗     
       ██║  ██║███████║██║   ██║     
       ██║  ██║██╔══██║██║   ██║     
       ██████╔╝██║  ██║╚██████╔╝     
       ╚═════╝ ╚═╝  ╚═╝ ╚═════╝      
                                     
       A G E N T  🔵  B A S E        
  
  🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀
  `);

  // Validate config
  if (!validateConfig()) {
    console.error('\n❌ Configuration error. Please set up your .env file.');
    console.log('\nCopy .env.example to .env and fill in your values:');
    console.log('  - PRIVATE_KEY: Your wallet private key');
    console.log('  - OPENAI_API_KEY: Your OpenAI API key');
    console.log('  - NEYNAR_API_KEY: Your Neynar API key');
    console.log('  - FARCASTER_SIGNER_UUID: Your Farcaster signer UUID');
    process.exit(1);
  }

  try {
    const balance = await getBalance();
    
    console.log('\n✅ Configuration validated successfully!\n');
    console.log('📊 Agent Information:');
    console.log(`   Name: ${config.agentName}`);
    console.log(`   Wallet: ${agentAddress}`);
    console.log(`   Balance: ${balance} ETH`);
    console.log(`   Network: ${config.useTestnet ? 'Base Sepolia (Testnet)' : 'Base Mainnet'}`);
    console.log(`   Explorer: ${getAddressExplorerUrl(agentAddress)}`);
    console.log(`\n⚙️  Agent Settings:`);
    console.log(`   Action Interval: ${config.actionIntervalMinutes} minutes`);
    console.log(`   Max ETH per TX: ${config.maxEthPerTx} ETH`);
    console.log(`   Max TX per Day: ${config.maxTxPerDay}`);
    
    console.log('\n🚀 To start the agent, run:');
    console.log('   npm run agent\n');
    
  } catch (error: any) {
    console.error('\n❌ Error connecting to blockchain:', error.message);
    process.exit(1);
  }
}

main();
