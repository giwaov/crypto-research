import { deployERC20Token, deployNFTCollection } from '../blockchain/deployer.js';
import { postCastWithEmbeds } from '../social/farcaster.js';
import { generateTokenIdea } from '../ai/brain.js';
import { loadState, addDeployedToken, addCast } from '../state/manager.js';
import logger from '../utils/logger.js';

/**
 * Script to manually deploy a token
 * Usage: npm run deploy-token
 * Or with custom name: npx tsx src/scripts/deploy-token.ts "Token Name" "SYMBOL"
 */
async function main() {
  const args = process.argv.slice(2);
  
  let name: string;
  let symbol: string;

  if (args.length >= 2) {
    name = args[0];
    symbol = args[1];
  } else {
    // Generate creative token idea
    logger.info('Generating creative token idea...');
    const idea = await generateTokenIdea();
    name = idea.name;
    symbol = idea.symbol;
  }

  logger.info(`🦀 Deploying token: ${name} (${symbol})`);

  try {
    // Deploy the token
    const result = await deployERC20Token(name, symbol);
    
    console.log('\n✅ Token deployed successfully!\n');
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Address: ${result.contractAddress}`);
    console.log(`   Transaction: ${result.transactionHash}`);
    console.log(`   Explorer: ${result.explorerUrl}`);

    // Update state
    let state = await loadState();
    state = await addDeployedToken(state, {
      name,
      symbol,
      address: result.contractAddress,
      txHash: result.transactionHash,
    });

    // Post to Farcaster
    const castText = `🦀 Just deployed $${symbol} on @base! 

${name} is now live and ready for the community.

Check it out: ${result.explorerUrl}

Building onchain, one token at a time! 🔵`;

    try {
      const castResult = await postCastWithEmbeds(castText, [result.explorerUrl]);
      await addCast(state, {
        hash: castResult.cast.hash,
        text: castText,
      });
      console.log(`\n📢 Posted to Farcaster: ${castResult.cast.hash}`);
    } catch (error: any) {
      logger.warn('Could not post to Farcaster:', error.message);
    }

  } catch (error: any) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main();
