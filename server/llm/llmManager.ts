import axios from 'axios';
import { z } from 'zod';

// Define interfaces for different LLM providers
interface LLMMessage {
  role: string;
  content: string;
}

interface LLMTool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

interface LLMGenerateParams {
  provider: string;
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: LLMTool[];
}

interface LLMResponse {
  choices: {
    message: {
      role: string;
      content: string;
      tool_calls?: any[];
    };
  }[];
}

export class LLMManager {
  private apiKeys: Record<string, string> = {
    openai: process.env.OPENAI_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || '',
  };
  
  private baseUrls: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    ollama: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    lmstudio: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
  };

  constructor() {
    // Load API keys from environment
    this.loadApiKeys();
  }

  private loadApiKeys(): void {
    // Additional keys could be loaded here
    console.log(`LLM providers configured: ${Object.keys(this.baseUrls).join(', ')}`);
  }

  async generateResponse(params: LLMGenerateParams): Promise<LLMResponse> {
    const { provider, model, messages, temperature = 0.7, maxTokens = 1000, tools } = params;

    switch (provider) {
      case 'openai':
        return this.generateOpenAI(model, messages, temperature, maxTokens, tools);
      case 'anthropic':
        return this.generateAnthropic(model, messages, temperature, maxTokens);
      case 'ollama':
        return this.generateOllama(model, messages, temperature, maxTokens);
      case 'lmstudio':
        return this.generateLMStudio(model, messages, temperature, maxTokens);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  private async generateOpenAI(
    model: string,
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number,
    tools?: LLMTool[]
  ): Promise<LLMResponse> {
    try {
      const payload: any = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await axios.post(
        `${this.baseUrls.openai}/chat/completions`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKeys.openai}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`OpenAI API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateAnthropic(
    model: string,
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<LLMResponse> {
    try {
      // Anthropic uses a different format for messages
      let systemMessage = '';
      let prompt = '';

      // Extract system message and build the prompt
      for (const message of messages) {
        if (message.role === 'system') {
          systemMessage = message.content;
        } else if (message.role === 'user') {
          prompt += `\n\nHuman: ${message.content}`;
        } else if (message.role === 'assistant') {
          prompt += `\n\nAssistant: ${message.content}`;
        }
      }

      // Add final assistant prompt
      prompt += '\n\nAssistant: ';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKeys.anthropic,
        'anthropic-version': '2023-06-01',
      };

      const payload: Record<string, any> = {
        model,
        prompt,
        max_tokens_to_sample: maxTokens,
        temperature,
      };

      if (systemMessage) {
        payload.system = systemMessage;
      }

      const response = await axios.post(
        `${this.baseUrls.anthropic}/complete`,
        payload,
        { headers }
      );

      // Transform to OpenAI-like format
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: response.data.completion || '',
            },
          },
        ],
      };
    } catch (error) {
      console.error('Anthropic API Error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Anthropic API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateOllama(
    model: string,
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<LLMResponse> {
    try {
      // Ollama has a simpler format - convert messages to a prompt
      const actualModel = model.startsWith('ollama/') ? model.substring(7) : model;
      
      // Check if Ollama supports chat format
      let useChatFormat = false;
      try {
        const tagResponse = await axios.get(`${this.baseUrls.ollama}/api/tags`);
        useChatFormat = tagResponse.data?.models?.some((m: any) => 
          m.name === actualModel && m.details?.supports_chat === true
        ) ?? false;
      } catch (e) {
        console.warn("Couldn't check Ollama model capabilities, using prompt format");
      }
      
      if (useChatFormat) {
        // Use chat format for models that support it
        const response = await axios.post(
          `${this.baseUrls.ollama}/api/chat`,
          {
            model: actualModel,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            options: {
              temperature,
              num_predict: maxTokens,
            },
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: response.data.message?.content || '',
              },
            },
          ],
        };
      } else {
        // Fallback to prompt format
        // Format messages into a prompt
        let prompt = '';
        for (const message of messages) {
          if (message.role === 'system') {
            prompt += `System: ${message.content}\n\n`;
          } else if (message.role === 'user') {
            prompt += `User: ${message.content}\n\n`;
          } else if (message.role === 'assistant') {
            prompt += `Assistant: ${message.content}\n\n`;
          }
        }

        const response = await axios.post(
          `${this.baseUrls.ollama}/api/generate`,
          {
            model: actualModel,
            prompt,
            options: {
              temperature,
              num_predict: maxTokens,
            },
            stream: false,
          },
          { headers: { 'Content-Type': 'application/json' } }
        );

        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: response.data.response || '',
              },
            },
          ],
        };
      }
    } catch (error) {
      console.error('Ollama API Error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Ollama API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateLMStudio(
    model: string,
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<LLMResponse> {
    try {
      // LM Studio implements OpenAI-compatible API
      const actualModel = model.startsWith('lmstudio/') ? model.substring(9) : model;

      const response = await axios.post(
        `${this.baseUrls.lmstudio}/chat/completions`,
        {
          model: actualModel,
          messages,
          temperature,
          max_tokens: maxTokens,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      return response.data;
    } catch (error) {
      console.error('LM Studio API Error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`LM Studio API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
