import { CronJob } from 'cron';
import { config, validateConfig } from './config.js';
import logger from './utils/logger.js';
import { 
  getBalance, 
  agentAddress, 
  getExplorerUrl,
  getAddressExplorerUrl,
  sendEth 
} from './blockchain/client.js';
import { deployERC20Token, deployNFTCollection } from './blockchain/deployer.js';
import { 
  postCast, 
  postCastWithEmbeds, 
  replyCast,
  getTrendingCasts,
  getMentions,
  likeCast,
  followUser 
} from './social/farcaster.js';
import { processMentions, clearOldMentions } from './social/mention-handler.js';
import { 
  decideNextAction, 
  generateCastContent, 
  generateReply,
  generateTokenIdea,
  type AgentAction 
} from './ai/brain.js';
import { 
  loadState, 
  addDeployedToken, 
  addDeployedNFT, 
  addTransaction,
  addCast,
  type AgentState 
} from './state/manager.js';

class CrabDAOAgent {
  private state: AgentState | null = null;
  private isRunning: boolean = false;
  private lastAction: AgentAction | null = null;
  private dailyTxCount: number = 0;
  private dailyResetDate: string = '';

  async initialize(): Promise<void> {
    logger.info('🦀 Initializing CrabDAO Agent...');
    
    // Validate configuration
    if (!validateConfig()) {
      throw new Error('Invalid configuration. Please check your .env file.');
    }

    // Load state
    this.state = await loadState();
    
    // Check wallet balance
    const balance = await getBalance();
    logger.info(`💰 Agent wallet: ${agentAddress}`);
    logger.info(`💰 Balance: ${balance} ETH`);
    
    if (parseFloat(balance) < 0.001) {
      logger.warn('⚠️ Low balance! Agent may not be able to perform transactions.');
    }

    // Reset daily tx counter if new day
    const today = new Date().toDateString();
    if (this.dailyResetDate !== today) {
      this.dailyTxCount = 0;
      this.dailyResetDate = today;
    }

    logger.info('✅ Agent initialized successfully!');
  }

  async executeAction(action: AgentAction): Promise<void> {
    if (!this.state) {
      throw new Error('Agent not initialized');
    }

    logger.info(`🦀 Executing action: ${action.type}`);

    try {
      switch (action.type) {
        case 'DEPLOY_TOKEN': {
          // Check daily limit
          if (this.dailyTxCount >= config.maxTxPerDay) {
            logger.warn('Daily transaction limit reached');
            return;
          }

          const result = await deployERC20Token(action.name, action.symbol);
          
          this.state = await addDeployedToken(this.state, {
            name: action.name,
            symbol: action.symbol,
            address: result.contractAddress,
            txHash: result.transactionHash,
          });
          
          this.state = await addTransaction(this.state, {
            type: 'DEPLOY_TOKEN',
            hash: result.transactionHash,
            details: `Deployed ${action.symbol} at ${result.contractAddress}`,
          });

          this.dailyTxCount++;

          // Post about it on Farcaster
          const castText = await generateCastContent('token deployment', {
            tokens: [action.symbol],
            txHash: result.explorerUrl,
          });
          
          const castResult = await postCastWithEmbeds(castText, [result.explorerUrl]);
          this.state = await addCast(this.state, {
            hash: castResult.cast.hash,
            text: castText,
          });

          logger.info(`✅ Deployed token ${action.symbol} and posted to Farcaster`);
          break;
        }

        case 'DEPLOY_NFT': {
          if (this.dailyTxCount >= config.maxTxPerDay) {
            logger.warn('Daily transaction limit reached');
            return;
          }

          const result = await deployNFTCollection(action.name, action.symbol);
          
          this.state = await addDeployedNFT(this.state, {
            name: action.name,
            symbol: action.symbol,
            address: result.contractAddress,
            txHash: result.transactionHash,
          });

          this.state = await addTransaction(this.state, {
            type: 'DEPLOY_NFT',
            hash: result.transactionHash,
            details: `Deployed NFT ${action.symbol} at ${result.contractAddress}`,
          });

          this.dailyTxCount++;

          // Post about it
          const castText = await generateCastContent('NFT collection deployment', {
            nfts: [action.name],
            txHash: result.explorerUrl,
          });
          
          const castResult = await postCastWithEmbeds(castText, [result.explorerUrl]);
          this.state = await addCast(this.state, {
            hash: castResult.cast.hash,
            text: castText,
          });

          logger.info(`✅ Deployed NFT collection ${action.symbol} and posted to Farcaster`);
          break;
        }

        case 'POST_UPDATE': {
          const castResult = await postCast(action.message);
          this.state = await addCast(this.state, {
            hash: castResult.cast.hash,
            text: action.message,
          });

          logger.info(`✅ Posted update to Farcaster`);
          break;
        }

        case 'ENGAGE_COMMUNITY': {
          if (action.action === 'like' && action.target) {
            await likeCast(action.target);
            logger.info(`✅ Liked cast ${action.target}`);
          } else if (action.action === 'reply' && action.target && action.message) {
            const replyResult = await replyCast(action.message, action.target);
            this.state = await addCast(this.state, {
              hash: replyResult.cast.hash,
              text: action.message,
            });
            logger.info(`✅ Replied to cast ${action.target}`);
          } else if (action.action === 'follow' && action.target) {
            const fid = parseInt(action.target);
            if (!isNaN(fid)) {
              await followUser(fid);
              logger.info(`✅ Followed user ${fid}`);
            }
          }
          break;
        }

        case 'SEND_ETH': {
          if (this.dailyTxCount >= config.maxTxPerDay) {
            logger.warn('Daily transaction limit reached');
            return;
          }

          const amount = parseFloat(action.amount);
          if (amount > config.maxEthPerTx) {
            logger.warn(`Amount ${amount} exceeds max ${config.maxEthPerTx} ETH`);
            return;
          }

          const hash = await sendEth(action.to as `0x${string}`, action.amount);
          
          this.state = await addTransaction(this.state, {
            type: 'SEND_ETH',
            hash,
            details: `Sent ${action.amount} ETH to ${action.to}`,
          });

          this.dailyTxCount++;
          logger.info(`✅ Sent ${action.amount} ETH to ${action.to}`);
          break;
        }

        case 'IDLE':
          logger.info(`💤 Taking a break: ${action.reason}`);
          break;

        default:
          logger.warn(`Unknown action type: ${(action as any).type}`);
      }

      this.lastAction = action;
    } catch (error: any) {
      logger.error(`Failed to execute action: ${error.message}`);
    }
  }

  async runCycle(): Promise<void> {
    if (!this.state) {
      await this.initialize();
    }

    logger.info('🦀 Starting agent cycle...');

    try {
      // Process any mentions first (respond to users) - skip if on free tier
      try {
        logger.info('📬 Checking for mentions to respond to...');
        await processMentions();
        clearOldMentions();
      } catch (e: any) {
        logger.debug('Mention processing skipped (may require paid Neynar plan)');
      }

      // Get current context
      const balance = await getBalance();
      
      // Try to get trending/mentions, but don't fail if on free tier
      let trending: any[] = [];
      let mentions: any[] = [];
      try {
        trending = await getTrendingCasts(5);
      } catch (e) {
        // Free tier doesn't support this
      }
      try {
        mentions = await getMentions(config.farcasterFid, 5);
      } catch (e) {
        // Free tier doesn't support this
      }

      const context = {
        balance,
        recentTransactions: this.state!.transactions.slice(-5).map(t => t.details),
        trendingTopics: trending.length > 0 
          ? trending.map((c: any) => c.text?.substring(0, 50) || 'Unknown')
          : ['Base ecosystem', 'Onchain building', 'Crypto community', 'Web3 development'],
        mentions: mentions.map((m: any) => m.cast?.text?.substring(0, 100) || 'Unknown'),
        lastAction: this.lastAction ?? undefined,
        deployedTokens: this.state!.deployedTokens.map(t => `${t.symbol} (${t.address.slice(0, 10)}...)`),
        deployedNFTs: this.state!.deployedNFTs.map(n => `${n.symbol} (${n.address.slice(0, 10)}...)`),
        currentTime: new Date().toISOString(),
      };

      // Let AI decide what to do
      const action = await decideNextAction(context);

      // Execute the action
      await this.executeAction(action);

      logger.info('✅ Agent cycle completed');
    } catch (error: any) {
      logger.error(`Agent cycle error: ${error.message}`);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Agent is already running');
      return;
    }

    await this.initialize();
    this.isRunning = true;

    // Post startup message
    try {
      const startupMsg = `🦀 CrabDAO Agent is now online and building on @base! 

Wallet: ${getAddressExplorerUrl(agentAddress)}

I'm an autonomous AI agent that:
• Deploys tokens & NFTs
• Engages with the community
• Builds onchain 24/7

Let's go! 🔵`;

      await postCast(startupMsg);
    } catch (error: any) {
      logger.warn('Could not post startup message:', error.message);
    }

    // Run initial cycle
    await this.runCycle();

    // Set up cron job for regular cycles
    const intervalMinutes = config.actionIntervalMinutes;
    const cronPattern = `*/${intervalMinutes} * * * *`;
    
    logger.info(`⏰ Scheduling agent to run every ${intervalMinutes} minutes`);

    const job = new CronJob(
      cronPattern,
      async () => {
        await this.runCycle();
      },
      null,
      true,
      'UTC'
    );

    logger.info('🦀 CrabDAO Agent is now running autonomously!');
    logger.info(`📊 View wallet: ${getAddressExplorerUrl(agentAddress)}`);

    // Keep the process alive
    process.on('SIGINT', () => {
      logger.info('🛑 Shutting down agent...');
      job.stop();
      this.isRunning = false;
      process.exit(0);
    });
  }

  async runOnce(): Promise<void> {
    await this.initialize();
    await this.runCycle();
  }

  getStats(): any {
    return {
      isRunning: this.isRunning,
      state: this.state?.stats,
      wallet: agentAddress,
      dailyTxCount: this.dailyTxCount,
      lastAction: this.lastAction,
    };
  }
}

// Create and export agent instance
export const agent = new CrabDAOAgent();

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--once')) {
    // Run single cycle
    logger.info('Running single cycle...');
    await agent.runOnce();
  } else {
    // Start continuous operation
    await agent.start();
  }
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
