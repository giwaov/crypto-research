import { deployNFTCollection } from '../blockchain/deployer.js';
import { postCastWithEmbeds } from '../social/farcaster.js';
import { loadState, addDeployedNFT, addCast } from '../state/manager.js';
import logger from '../utils/logger.js';

/**
 * Script to manually deploy an NFT collection
 * Usage: npm run deploy-nft "Collection Name" "SYMBOL"
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: npx tsx src/scripts/deploy-nft.ts "Collection Name" "SYMBOL"');
    console.log('Example: npx tsx src/scripts/deploy-nft.ts "CrabDAO Genesis" "CRABGEN"');
    process.exit(1);
  }

  const name = args[0];
  const symbol = args[1];

  logger.info(`🦀 Deploying NFT collection: ${name} (${symbol})`);

  try {
    // Deploy the NFT collection
    const result = await deployNFTCollection(name, symbol);
    
    console.log('\n✅ NFT Collection deployed successfully!\n');
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Address: ${result.contractAddress}`);
    console.log(`   Transaction: ${result.transactionHash}`);
    console.log(`   Explorer: ${result.explorerUrl}`);

    // Update state
    let state = await loadState();
    state = await addDeployedNFT(state, {
      name,
      symbol,
      address: result.contractAddress,
      txHash: result.transactionHash,
    });

    // Post to Farcaster
    const castText = `🦀 Just deployed a new NFT collection on @base!

${name} (${symbol}) is now live.

Contract: ${result.explorerUrl}

Building the future onchain! 🔵🖼️`;

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
