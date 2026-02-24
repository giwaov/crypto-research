import axios from 'axios';
import { config } from '../config.js';
import logger from '../utils/logger.js';

const NEYNAR_API_URL = 'https://api.neynar.com/v2';

interface CastResponse {
  cast: {
    hash: string;
    author: {
      fid: number;
      username: string;
    };
    text: string;
    timestamp: string;
  };
}

interface UserResponse {
  user: {
    fid: number;
    username: string;
    display_name: string;
    pfp_url: string;
    follower_count: number;
    following_count: number;
  };
}

/**
 * Post a cast (message) to Farcaster
 */
export async function postCast(text: string, parentUrl?: string): Promise<CastResponse> {
  logger.info(`Posting to Farcaster: ${text.substring(0, 50)}...`);
  
  try {
    const response = await axios.post<CastResponse>(
      `${NEYNAR_API_URL}/farcaster/cast`,
      {
        signer_uuid: config.farcasterSignerUuid,
        text,
        parent: parentUrl,
      },
      {
        headers: {
          'api_key': config.neynarApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(`✅ Cast posted: ${response.data.cast.hash}`);
    return response.data;
  } catch (error: any) {
    logger.error('Failed to post cast:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Post a cast with embedded links (for sharing transactions)
 */
export async function postCastWithEmbeds(
  text: string, 
  embeds: string[]
): Promise<CastResponse> {
  logger.info(`Posting cast with embeds: ${text.substring(0, 50)}...`);
  
  try {
    const response = await axios.post<CastResponse>(
      `${NEYNAR_API_URL}/farcaster/cast`,
      {
        signer_uuid: config.farcasterSignerUuid,
        text,
        embeds: embeds.map(url => ({ url })),
      },
      {
        headers: {
          'api_key': config.neynarApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(`✅ Cast with embeds posted: ${response.data.cast.hash}`);
    return response.data;
  } catch (error: any) {
    logger.error('Failed to post cast with embeds:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Reply to a cast
 */
export async function replyCast(
  text: string, 
  parentHash: string
): Promise<CastResponse> {
  logger.info(`Replying to cast ${parentHash}`);
  
  try {
    const response = await axios.post<CastResponse>(
      `${NEYNAR_API_URL}/farcaster/cast`,
      {
        signer_uuid: config.farcasterSignerUuid,
        text,
        parent: parentHash,
      },
      {
        headers: {
          'api_key': config.neynarApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(`✅ Reply posted: ${response.data.cast.hash}`);
    return response.data;
  } catch (error: any) {
    logger.error('Failed to reply:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get user profile by FID
 */
export async function getUserProfile(fid: number): Promise<UserResponse> {
  try {
    const response = await axios.get<UserResponse>(
      `${NEYNAR_API_URL}/farcaster/user?fid=${fid}`,
      {
        headers: {
          'api_key': config.neynarApiKey,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    logger.error('Failed to get user profile:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get recent casts from a channel
 */
export async function getChannelCasts(channelId: string, limit: number = 10): Promise<any[]> {
  try {
    const response = await axios.get(
      `${NEYNAR_API_URL}/farcaster/feed/channels?channel_ids=${channelId}&limit=${limit}`,
      {
        headers: {
          'api_key': config.neynarApiKey,
        },
      }
    );

    return response.data.casts || [];
  } catch (error: any) {
    logger.error('Failed to get channel casts:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Search for casts by keyword
 */
export async function searchCasts(query: string, limit: number = 10): Promise<any[]> {
  try {
    const response = await axios.get(
      `${NEYNAR_API_URL}/farcaster/cast/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'api_key': config.neynarApiKey,
        },
      }
    );

    return response.data.result?.casts || [];
  } catch (error: any) {
    logger.error('Failed to search casts:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get trending casts
 */
export async function getTrendingCasts(limit: number = 10): Promise<any[]> {
  try {
    const response = await axios.get(
      `${NEYNAR_API_URL}/farcaster/feed/trending?limit=${limit}`,
      {
        headers: {
          'api_key': config.neynarApiKey,
        },
      }
    );

    return response.data.casts || [];
  } catch (error: any) {
    logger.error('Failed to get trending casts:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get mentions of the agent
 */
export async function getMentions(fid: number, limit: number = 20): Promise<any[]> {
  try {
    const response = await axios.get(
      `${NEYNAR_API_URL}/farcaster/notifications?fid=${fid}&type=mentions&limit=${limit}`,
      {
        headers: {
          'api_key': config.neynarApiKey,
        },
      }
    );

    return response.data.notifications || [];
  } catch (error: any) {
    logger.error('Failed to get mentions:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Like a cast
 */
export async function likeCast(castHash: string): Promise<void> {
  try {
    await axios.post(
      `${NEYNAR_API_URL}/farcaster/reaction`,
      {
        signer_uuid: config.farcasterSignerUuid,
        reaction_type: 'like',
        target: castHash,
      },
      {
        headers: {
          'api_key': config.neynarApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(`✅ Liked cast: ${castHash}`);
  } catch (error: any) {
    logger.error('Failed to like cast:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Recast (share) a cast
 */
export async function recast(castHash: string): Promise<void> {
  try {
    await axios.post(
      `${NEYNAR_API_URL}/farcaster/reaction`,
      {
        signer_uuid: config.farcasterSignerUuid,
        reaction_type: 'recast',
        target: castHash,
      },
      {
        headers: {
          'api_key': config.neynarApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(`✅ Recasted: ${castHash}`);
  } catch (error: any) {
    logger.error('Failed to recast:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Follow a user
 */
export async function followUser(targetFid: number): Promise<void> {
  try {
    await axios.post(
      `${NEYNAR_API_URL}/farcaster/user/follow`,
      {
        signer_uuid: config.farcasterSignerUuid,
        target_fids: [targetFid],
      },
      {
        headers: {
          'api_key': config.neynarApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info(`✅ Followed user: ${targetFid}`);
  } catch (error: any) {
    logger.error('Failed to follow user:', error.response?.data || error.message);
    throw error;
  }
}

export const farcaster = {
  postCast,
  postCastWithEmbeds,
  replyCast,
  getUserProfile,
  getChannelCasts,
  searchCasts,
  getTrendingCasts,
  getMentions,
  likeCast,
  recast,
  followUser,
};
