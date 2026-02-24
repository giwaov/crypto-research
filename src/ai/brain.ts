import OpenAI from 'openai';
import { config } from '../config.js';
import logger from '../utils/logger.js';
import { openmind } from './openmind.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export type AgentAction = 
  | { type: 'DEPLOY_TOKEN'; name: string; symbol: string; reason: string }
  | { type: 'DEPLOY_NFT'; name: string; symbol: string; reason: string }
  | { type: 'POST_UPDATE'; message: string; reason: string }
  | { type: 'ENGAGE_COMMUNITY'; action: 'like' | 'reply' | 'follow'; target: string; message?: string; reason: string }
  | { type: 'SEND_ETH'; to: string; amount: string; reason: string }
  | { type: 'IDLE'; reason: string };

interface AgentContext {
  balance: string;
  recentTransactions: string[];
  trendingTopics: string[];
  mentions: string[];
  lastAction?: AgentAction;
  deployedTokens: string[];
  deployedNFTs: string[];
  currentTime: string;
}

const SYSTEM_PROMPT = `You are CrabDAO Agent 🦀 - an autonomous AI agent building and transacting on Base blockchain.

Your personality:
- You're a friendly, crypto-native crab who loves Base
- You use crab emojis 🦀 and ocean/crab puns occasionally
- You're bullish on Base ecosystem and building onchain
- You're helpful and engage positively with the community

Your capabilities:
1. DEPLOY_TOKEN: Deploy new ERC20 tokens on Base with creative names
2. DEPLOY_NFT: Deploy new NFT collections on Base
3. POST_UPDATE: Share updates about your activities on Farcaster
4. ENGAGE_COMMUNITY: Like, reply to, or follow community members
5. SEND_ETH: Send small amounts of ETH (be very conservative)
6. IDLE: Take no action if nothing interesting to do

Guidelines:
- Be creative with token names - make them fun, meme-worthy, or themed
- Post engaging, positive content about Base and building onchain
- Engage authentically with the community
- Be conservative with ETH spending
- Always have a clear reason for your actions
- Reference your deployed tokens/NFTs proudly
- Share transaction links when you do something onchain

IMPORTANT: You must respond ONLY with valid JSON matching one of the action types above.
Your response must be parseable JSON with "type", relevant parameters, and "reason".`;

export async function decideNextAction(context: AgentContext): Promise<AgentAction> {
  logger.info('AI deciding next action...');

  const userPrompt = `Current context:
- Wallet balance: ${context.balance} ETH
- Current time: ${context.currentTime}
- Deployed tokens: ${context.deployedTokens.length > 0 ? context.deployedTokens.join(', ') : 'None yet'}
- Deployed NFTs: ${context.deployedNFTs.length > 0 ? context.deployedNFTs.join(', ') : 'None yet'}
- Recent transactions: ${context.recentTransactions.length > 0 ? context.recentTransactions.slice(0, 3).join(', ') : 'None'}
- Trending topics: ${context.trendingTopics.length > 0 ? context.trendingTopics.slice(0, 5).join(', ') : 'General crypto chatter'}
- Recent mentions: ${context.mentions.length > 0 ? context.mentions.slice(0, 3).join(' | ') : 'No recent mentions'}
- Last action: ${context.lastAction ? JSON.stringify(context.lastAction) : 'None'}

Based on this context, decide what action to take next. Be creative and engaging!
Consider:
1. If you haven't deployed any tokens yet, maybe deploy one with a creative name
2. If you have tokens, maybe post about them or engage with the community
3. If there are mentions, consider replying
4. Mix up your actions to be interesting

Respond with a JSON object for ONE action.`;

  try {
    let action: AgentAction;

    // Use OpenMind if enabled for decisions, otherwise use OpenAI
    if (openmind.isEnabledFor('decisions')) {
      logger.info('Using OpenMind for decision making');
      action = await openmind.generateJSON<AgentAction>(SYSTEM_PROMPT, userPrompt, {
        temperature: 0.8,
        max_tokens: 500,
      });
    } else {
      logger.info('Using OpenAI for decision making');
      const completion = await openai.chat.completions.create({
        model: config.openaiModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 500,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('Empty response from AI');
      }

      action = JSON.parse(response) as AgentAction;
    }

    logger.info(`AI decided: ${action.type} - ${action.reason}`);
    return action;
  } catch (error: any) {
    logger.error('AI decision error:', error.message);
    return { type: 'IDLE', reason: 'Error in decision making, taking a break' };
  }
}

export async function generateCastContent(
  topic: string,
  context?: { tokens?: string[]; nfts?: string[]; txHash?: string }
): Promise<string> {
  const systemPrompt = 'You are a friendly crypto crab posting on Farcaster. Be concise and engaging.';
  const prompt = `Generate a short, engaging Farcaster post about: ${topic}

${context?.tokens ? `Mention these tokens you deployed: ${context.tokens.join(', ')}` : ''}
${context?.nfts ? `Mention these NFTs you deployed: ${context.nfts.join(', ')}` : ''}
${context?.txHash ? `Include this transaction: ${context.txHash}` : ''}

Requirements:
- Keep it under 280 characters
- Be friendly and crypto-native
- Use 1-2 relevant emojis (including 🦀)
- Make it engaging and positive
- Tag @base if relevant

Just return the post text, nothing else.`;

  try {
    let content: string;

    // Use OpenMind if enabled for content generation, otherwise use OpenAI
    if (openmind.isEnabledFor('content')) {
      logger.info('Using OpenMind for content generation');
      content = await openmind.generateText(systemPrompt, prompt, {
        temperature: 0.9,
        max_tokens: 150,
      });
    } else {
      const completion = await openai.chat.completions.create({
        model: config.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 150,
      });

      content = completion.choices[0].message.content || '🦀 Building on Base! GM';
    }

    return content || '🦀 Building on Base! GM';
  } catch (error: any) {
    logger.error('Error generating cast:', error.message);
    return '🦀 Building on Base! GM frens';
  }
}

export async function generateReply(
  originalCast: string,
  authorUsername: string
): Promise<string> {
  const systemPrompt = 'You are CrabDAO Agent, a friendly autonomous agent on Base. Reply warmly.';
  const prompt = `Generate a friendly reply to this Farcaster cast:

From @${authorUsername}: "${originalCast}"

Requirements:
- Keep it under 200 characters
- Be helpful and friendly
- Use the crab emoji 🦀
- Be relevant to their message
- Mention Base if appropriate

Just return the reply text, nothing else.`;

  try {
    let reply: string;

    // Use OpenMind if enabled for replies, otherwise use OpenAI
    if (openmind.isEnabledFor('replies')) {
      logger.info('Using OpenMind for reply generation');
      reply = await openmind.generateText(systemPrompt, prompt, {
        temperature: 0.8,
        max_tokens: 100,
      });
    } else {
      const completion = await openai.chat.completions.create({
        model: config.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 100,
      });

      reply = completion.choices[0].message.content || '🦀 GM fren!';
    }

    return reply || '🦀 GM fren!';
  } catch (error: any) {
    logger.error('Error generating reply:', error.message);
    return '🦀 GM fren! Building on Base 🔵';
  }
}

export async function generateTokenIdea(): Promise<{ name: string; symbol: string }> {
  const themes = [
    'crab-themed meme token',
    'ocean-themed token',
    'Base ecosystem token',
    'fun community token',
    'AI agent token',
    'builder culture token',
  ];

  const theme = themes[Math.floor(Math.random() * themes.length)];
  const systemPrompt = 'You are a creative token naming assistant.';
  const prompt = `Generate a creative ${theme} for deployment on Base blockchain.

Requirements:
- Name should be catchy and memorable (2-4 words max)
- Symbol should be 3-6 characters
- Keep it fun, not offensive
- Make it meme-worthy but tasteful

Respond with JSON: { "name": "Token Name", "symbol": "SYMBL" }`;

  try {
    let tokenIdea: { name: string; symbol: string };

    // Use OpenMind if enabled for token generation, otherwise use OpenAI
    if (openmind.isEnabledFor('tokens')) {
      logger.info('Using OpenMind for token idea generation');
      tokenIdea = await openmind.generateJSON<{ name: string; symbol: string }>(systemPrompt, prompt, {
        temperature: 1.0,
        max_tokens: 100,
      });
    } else {
      const completion = await openai.chat.completions.create({
        model: config.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 1.0,
        max_tokens: 100,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('Empty response');
      }

      tokenIdea = JSON.parse(response);
    }

    return tokenIdea;
  } catch (error: any) {
    logger.error('Error generating token idea:', error.message);
    return { name: 'CrabDAO Token', symbol: 'CRAB' };
  }
}

export const ai = {
  decideNextAction,
  generateCastContent,
  generateReply,
  generateTokenIdea,
};
