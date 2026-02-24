import { config } from '../config.js';
import logger from '../utils/logger.js';
import { 
  getMentions, 
  replyCast, 
  likeCast,
  postCastWithEmbeds 
} from './farcaster.js';
import { generateReply } from '../ai/brain.js';
import { deployERC20Token } from '../blockchain/deployer.js';
import { getBalance, agentAddress, getAddressExplorerUrl } from '../blockchain/client.js';
import { loadState, addDeployedToken, addCast, addTransaction } from '../state/manager.js';

interface Mention {
  cast: {
    hash: string;
    text: string;
    author: {
      fid: number;
      username: string;
    };
  };
  type: string;
}

// Track processed mentions to avoid duplicates
const processedMentions = new Set<string>();

/**
 * Commands the agent responds to when mentioned
 */
const COMMANDS = {
  DEPLOY: /\b(deploy|create|launch|mint)\s*(token|coin|erc20)/i,
  BALANCE: /\b(balance|wallet|eth|funds)/i,
  STATS: /\b(stats|status|info|about)/i,
  GM: /\bgm\b/i,
  HELP: /\b(help|commands|what can you do)/i,
};

/**
 * Process incoming mentions and respond appropriately
 */
export async function processMentions(): Promise<number> {
  logger.info('🔍 Checking for mentions...');
  
  try {
    const mentions = await getMentions(config.farcasterFid, 20);
    let processed = 0;

    for (const mention of mentions as Mention[]) {
      const castHash = mention.cast?.hash;
      
      // Skip if already processed or invalid
      if (!castHash || processedMentions.has(castHash)) {
        continue;
      }

      const text = mention.cast.text || '';
      const author = mention.cast.author?.username || 'fren';
      
      logger.info(`📩 Processing mention from @${author}: ${text.substring(0, 50)}...`);

      try {
        // Like the mention
        await likeCast(castHash);
        
        // Determine response based on content
        let response: string | null = null;

        if (COMMANDS.HELP.test(text)) {
          response = `🦀 Hey @${author}! I'm CrabDAO Agent, building on @base!

Commands:
• "deploy token" - I'll deploy a new token
• "balance" - Check my wallet
• "stats" - See my activity
• "gm" - Say gm back!

I also respond to general questions! 🔵`;
        } 
        else if (COMMANDS.DEPLOY.test(text)) {
          response = await handleDeployRequest(author, castHash);
        }
        else if (COMMANDS.BALANCE.test(text)) {
          const balance = await getBalance();
          response = `🦀 @${author} My wallet has ${balance} ETH on Base!

View: ${getAddressExplorerUrl(agentAddress)} 🔵`;
        }
        else if (COMMANDS.STATS.test(text)) {
          const state = await loadState();
          response = `🦀 @${author} Here are my stats:

📊 Tokens deployed: ${state.stats.totalTokensDeployed}
🖼️ NFTs deployed: ${state.stats.totalNFTsDeployed}
📝 Casts: ${state.stats.totalCasts}
⛓️ Transactions: ${state.stats.totalTransactions}

Building onchain 24/7! 🔵`;
        }
        else if (COMMANDS.GM.test(text)) {
          response = `🦀 GM @${author}! 

Hope you're having a great day building on @base! 🔵`;
        }
        else {
          // General AI-powered reply
          response = await generateReply(text, author);
        }

        // Post the reply
        if (response) {
          const replyResult = await replyCast(response, castHash);
          
          const state = await loadState();
          await addCast(state, {
            hash: replyResult.cast.hash,
            text: response,
          });
          
          processed++;
        }

        // Mark as processed
        processedMentions.add(castHash);
        
        // Rate limiting - wait a bit between responses
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error: any) {
        logger.error(`Failed to process mention ${castHash}:`, error.message);
      }
    }

    logger.info(`✅ Processed ${processed} mentions`);
    return processed;
    
  } catch (error: any) {
    logger.error('Error processing mentions:', error.message);
    return 0;
  }
}

/**
 * Handle a deploy token request from a user
 */
async function handleDeployRequest(requester: string, castHash: string): Promise<string> {
  logger.info(`🚀 Deploy request from @${requester}`);
  
  try {
    const balance = await getBalance();
    
    if (parseFloat(balance) < 0.001) {
      return `🦀 @${requester} I'd love to deploy a token for you, but I'm low on gas! 

Send some ETH to ${agentAddress} and I'll get building! 🔵`;
    }

    // Generate a fun token name
    const themes = ['Crab', 'Ocean', 'Base', 'Builder', 'Onchain'];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const timestamp = Date.now().toString().slice(-4);
    const name = `${theme}Coin ${timestamp}`;
    const symbol = `${theme.substring(0, 3).toUpperCase()}${timestamp}`;

    // Deploy the token
    const result = await deployERC20Token(name, symbol);
    
    // Update state
    let state = await loadState();
    state = await addDeployedToken(state, {
      name,
      symbol,
      address: result.contractAddress,
      txHash: result.transactionHash,
    });
    
    await addTransaction(state, {
      type: 'DEPLOY_TOKEN',
      hash: result.transactionHash,
      details: `Deployed ${symbol} for @${requester}`,
    });

    return `🦀 @${requester} Done! Just deployed $${symbol} on @base for you!

Contract: ${result.contractAddress}
TX: ${result.explorerUrl}

Enjoy your new token! 🔵`;

  } catch (error: any) {
    logger.error('Deploy request failed:', error.message);
    return `🦀 @${requester} Oops! Something went wrong deploying the token. I'll try again later! 🔵`;
  }
}

/**
 * Clear old processed mentions (memory management)
 */
export function clearOldMentions(): void {
  if (processedMentions.size > 1000) {
    processedMentions.clear();
    logger.info('Cleared processed mentions cache');
  }
}

export const mentionHandler = {
  processMentions,
  clearOldMentions,
};
