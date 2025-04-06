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
    deepseek: process.env.DEEPSEEK_API_KEY || '',
  };
  
  private baseUrls: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    ollama: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    lmstudio: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
    perplexity: 'https://api.perplexity.ai',
    xai: 'https://api.x.ai/v1',
    deepseek: 'https://api.deepseek.com/v1',
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

    // LiteLLM supported providers that we'll handle differently
    const litellmSupportedProviders = [
      'groq', 'together', 'gemini', 'claude', 'azure', 'replicate',
      'cohere', 'mistral', 'vertexai', 'bedrock', 'huggingface'
    ];

    // Check if this is a LiteLLM-supported provider or the litellm provider itself
    // Note: deepseek is handled directly and not through LiteLLM
    if (litellmSupportedProviders.includes(provider) || provider === 'litellm') {
      return this.generateWithLiteLLM(provider === 'litellm' ? 'openai' : provider, model, messages, temperature, maxTokens, tools);
    }
    
    // Check if this is a provider added via LiteLLM (prefixed with litellm-)
    if (provider.startsWith('litellm-')) {
      try {
        // Extract the actual provider name from the prefix
        const actualProvider = provider.replace('litellm-', '');
        
        // Get the provider settings to properly set API key and base URL
        const { storage } = await import('../storage');
        const providerSettings = await storage.getLLMProviderSettings(provider);
        
        if (providerSettings?.apiKey) {
          // Update our API keys for this request
          this.apiKeys[actualProvider] = providerSettings.apiKey;
          
          // Set base URL if provided in settings
          if (providerSettings.baseUrl) {
            this.baseUrls[actualProvider] = providerSettings.baseUrl;
          }
          
          // Use the LiteLLM method but with the actual provider name
          return this.generateWithLiteLLM(actualProvider, model, messages, temperature, maxTokens, tools);
        } else {
          throw new Error(`API key for ${provider} is required but not found in settings`);
        }
      } catch (error) {
        console.error(`Error using LiteLLM provider ${provider}:`, error);
        throw new Error(`Failed to use LiteLLM provider: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Handle directly supported providers
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
      case 'deepseek':
        return this.generateDeepSeek(model, messages, temperature, maxTokens);
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

  private async generateDeepSeek(
    model: string,
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<LLMResponse> {
    try {
      if (!this.apiKeys.deepseek) {
        throw new Error('DeepSeek API key is required but not set');
      }
      
      // Set default model if not specified
      const actualModel = model || 'deepseek-chat';
      
      // Fix for DeepSeek API requiring system message at the beginning
      let processedMessages = [...messages];
      
      // For all DeepSeek models, ensure system message is first
      if (actualModel.startsWith('deepseek')) {
        // Find system message if it exists
        const systemMessageIndex = processedMessages.findIndex(msg => msg.role === 'system');
        
        if (systemMessageIndex !== -1 && systemMessageIndex !== 0) {
          // If system message exists but isn't first, move it to the front
          const systemMessage = processedMessages.splice(systemMessageIndex, 1)[0];
          processedMessages.unshift(systemMessage);
        } else if (systemMessageIndex === -1) {
          // If no system message exists, add a default one
          processedMessages.unshift({
            role: 'system',
            content: 'You are a helpful assistant specialized in reasoning and problem-solving.'
          });
        }
      }
      
      const response = await axios.post(
        `${this.baseUrls.deepseek}/chat/completions`,
        {
          model: actualModel,
          messages: processedMessages,
          temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKeys.deepseek}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('DeepSeek API Error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`DeepSeek API Error: ${error instanceof Error ? error.message : String(error)}`);
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

      // Handle provider-specific authentication and headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Most providers use Bearer authentication
      if (this.apiKeys[provider]) {
        headers['Authorization'] = `Bearer ${this.apiKeys[provider]}`;
      }
      
      // Handle specific providers with different auth mechanisms
      if (provider === 'gemini') {
        delete headers['Authorization']; // Remove Bearer prefix
        headers['x-goog-api-key'] = this.apiKeys[provider];
      }

      // Default to OpenAI-compatible /chat/completions endpoint
      let endpoint = '/chat/completions';
      
      // Handle provider-specific endpoints if needed
      if (provider === 'gemini') {
        endpoint = `/v1beta/models/${actualModel}:generateContent`;
      }

      const response = await axios.post(
        `${this.baseUrls[provider]}${endpoint}`,
        payload,
        { headers }
      );

      // Transform non-standard responses to OpenAI format if needed
      if (provider === 'gemini' && response.data.candidates) {
        return {
          choices: [{
            message: {
              role: 'assistant',
              content: response.data.candidates[0]?.content?.parts[0]?.text || '',
            }
          }]
        };
      }

      return response.data;
    } catch (error) {
      console.error(`${provider} API Error:`, error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`${provider} API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Use LiteLLM to generate response - this allows handling many different providers
  private async generateWithLiteLLM(
    provider: string,
    model: string,
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number,
    tools?: LLMTool[]
  ): Promise<LLMResponse> {
    try {
      // For LiteLLM providers we'll use our custom OpenAI-compatible approach
      // with appropriate customizations for each provider
      
      // Ensure we have the provider set up
      if (!this.apiKeys[provider]) {
        throw new Error(`API key for ${provider} is required but not set`);
      }
      
      // Add the provider to the baseUrls if needed
      if (!this.baseUrls[provider]) {
        // Set a default URL for the provider if we don't have one
        switch(provider) {
          case 'groq':
            this.baseUrls[provider] = 'https://api.groq.com/openai/v1';
            break;
          case 'together':
            this.baseUrls[provider] = 'https://api.together.xyz/v1';
            break;
          case 'anthropic':
          case 'claude':
            this.baseUrls[provider] = 'https://api.anthropic.com/v1';
            break;
          case 'cohere':
            this.baseUrls[provider] = 'https://api.cohere.ai/v1';
            break;
          case 'mistral':
            this.baseUrls[provider] = 'https://api.mistral.ai/v1';
            break;
          case 'gemini':
            this.baseUrls[provider] = 'https://generativelanguage.googleapis.com';
            break;
          case 'deepseek':
            this.baseUrls[provider] = 'https://api.deepseek.com/v1';
            break;
          default:
            throw new Error(`Base URL for ${provider} is required but not set`);
        }
      }
      
      // Now use the custom OpenAI-compatible method to handle the request
      return this.generateCustomOpenAICompatible(provider, model, messages, temperature, maxTokens, tools);
    } catch (error) {
      console.error(`LiteLLM API Error for ${provider}:`, error);
      throw new Error(`LiteLLM API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}