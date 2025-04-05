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
    perplexity: process.env.PERPLEXITY_API_KEY || '',
    xai: process.env.XAI_API_KEY || '',
  };
  
  private baseUrls: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    ollama: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    lmstudio: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
    perplexity: 'https://api.perplexity.ai',
    xai: 'https://api.x.ai/v1',
  };

  constructor() {
    // Load API keys from environment
    this.loadApiKeys();
  }

  private loadApiKeys(): void {
    // Additional keys could be loaded here
    console.log(`LLM providers configured: ${Object.keys(this.baseUrls).join(', ')}`);
  }
  
  // Update API keys and base URLs from storage
  async updateSettings(): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const providers = await storage.getAllLLMProviderSettings();
      
      for (const provider of providers) {
        // Update API key if provided
        if (provider.apiKey) {
          this.apiKeys[provider.provider] = provider.apiKey;
        }
        
        // Update base URL if provided
        if (provider.baseUrl) {
          this.baseUrls[provider.provider] = provider.baseUrl;
        }
      }
    } catch (error) {
      console.error('Error loading LLM provider settings:', error);
    }
  }

  async generateResponse(params: LLMGenerateParams): Promise<LLMResponse> {
    const { provider, model, messages, temperature = 0.7, maxTokens = 1000, tools } = params;
    
    // Update settings from storage before making the request
    await this.updateSettings();

    switch (provider) {
      case 'openai':
        return this.generateOpenAI(model, messages, temperature, maxTokens, tools);
      case 'anthropic':
        return this.generateAnthropic(model, messages, temperature, maxTokens);
      case 'ollama':
        return this.generateOllama(model, messages, temperature, maxTokens);
      case 'lmstudio':
        return this.generateLMStudio(model, messages, temperature, maxTokens);
      case 'perplexity':
        return this.generatePerplexity(model, messages, temperature, maxTokens);
      case 'xai':
        return this.generateXAI(model, messages, temperature, maxTokens);
      default:
        // Check if this is a custom provider
        if (this.baseUrls[provider] && this.apiKeys[provider]) {
          // Assume custom providers are OpenAI-compatible
          return this.generateCustomOpenAICompatible(provider, model, messages, temperature, maxTokens, tools);
        }
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
  
  private async generatePerplexity(
    model: string,
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<LLMResponse> {
    try {
      if (!this.apiKeys.perplexity) {
        throw new Error('Perplexity API key is required but not set');
      }
      
      // Set default model if not specified
      const actualModel = model || 'llama-3.1-sonar-small-128k-online';
      
      const payload = {
        model: actualModel,
        messages,
        temperature,
        max_tokens: maxTokens || 1000,
        top_p: 0.9,
        frequency_penalty: 1,
        presence_penalty: 0,
        stream: false,
      };
      
      const response = await axios.post(
        `${this.baseUrls.perplexity}/chat/completions`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKeys.perplexity}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Perplexity API Error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Perplexity API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async generateXAI(
    model: string,
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<LLMResponse> {
    try {
      if (!this.apiKeys.xai) {
        throw new Error('xAI API key is required but not set');
      }
      
      // Set default model if not specified
      const actualModel = model || 'grok-2-1212';
      
      const response = await axios.post(
        `${this.baseUrls.xai}/chat/completions`,
        {
          model: actualModel,
          messages,
          temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKeys.xai}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('xAI API Error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`xAI API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateCustomOpenAICompatible(
    provider: string,
    model: string,
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number,
    tools?: LLMTool[]
  ): Promise<LLMResponse> {
    try {
      if (!this.apiKeys[provider]) {
        throw new Error(`API key for ${provider} is required but not set`);
      }
      
      if (!this.baseUrls[provider]) {
        throw new Error(`Base URL for ${provider} is required but not set`);
      }

      // Set default model if not specified
      const actualModel = model || 'default-model';
      
      const payload: any = {
        model: actualModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await axios.post(
        `${this.baseUrls[provider]}/chat/completions`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKeys[provider]}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`${provider} API Error:`, error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`${provider} API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
