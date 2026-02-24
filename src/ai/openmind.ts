import axios, { AxiosInstance } from 'axios';
import { config } from '../config.js';
import logger from '../utils/logger.js';

export interface OpenMindChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenMindChatCompletion {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenMindCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

class OpenMindClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = config.openmindApiKey;
    this.baseUrl = config.openmindBaseUrl;
    this.defaultModel = config.openmindModel;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: 60000, // 60 second timeout
    });
  }

  /**
   * Check if OpenMind is configured and enabled for a specific feature
   */
  isEnabledFor(feature: string): boolean {
    if (!this.apiKey || this.apiKey === 'your_openmind_api_key_here') {
      return false;
    }
    return config.openmindFeatures.includes(feature);
  }

  /**
   * Create a chat completion using OpenMind API
   */
  async createChatCompletion(
    messages: OpenMindChatMessage[],
    options: OpenMindCompletionOptions = {}
  ): Promise<OpenMindChatCompletion> {
    try {
      logger.info('Calling OpenMind API...');

      const response = await this.client.post<OpenMindChatCompletion>('/v1/chat/completions', {
        model: options.model || this.defaultModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 1000,
        ...(options.response_format && { response_format: options.response_format }),
      });

      logger.info(`OpenMind API call successful (${response.data.usage?.total_tokens || 'unknown'} tokens)`);
      return response.data;
    } catch (error: any) {
      logger.error('OpenMind API error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`OpenMind API error: ${error.message}`);
    }
  }

  /**
   * Generate text completion from a prompt
   */
  async generateText(
    systemPrompt: string,
    userPrompt: string,
    options: OpenMindCompletionOptions = {}
  ): Promise<string> {
    const completion = await this.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options
    );

    return completion.choices[0]?.message?.content || '';
  }

  /**
   * Generate a JSON response
   */
  async generateJSON<T = any>(
    systemPrompt: string,
    userPrompt: string,
    options: Omit<OpenMindCompletionOptions, 'response_format'> = {}
  ): Promise<T> {
    const completion = await this.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        ...options,
        response_format: { type: 'json_object' },
      }
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenMind');
    }

    return JSON.parse(content) as T;
  }
}

// Export singleton instance
export const openmind = new OpenMindClient();
