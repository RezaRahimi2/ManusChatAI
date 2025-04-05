import axios from 'axios';

// LiteLLM Models Response
export interface LiteLLMModelsResponse {
  data: LiteLLMModel[];
}

// LiteLLM Model Interface
export interface LiteLLMModel {
  id: string;
  mode: string;
  input_cost_per_token: number;
  output_cost_per_token: number;
  provider: string;
  context_window: number;
}

/**
 * List of LiteLLM supported providers
 * These are providers that can be accessed through LiteLLM
 */
export const LITELLM_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', description: 'OpenAI models including GPT-4, GPT-3.5' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude models from Anthropic' },
  { id: 'google', name: 'Google', description: 'Google models including Gemini' },
  { id: 'groq', name: 'Groq', description: 'Groq API for LLaMa and Mixtral models' },
  { id: 'together', name: 'Together.ai', description: 'Open-source and custom models' },
  { id: 'cohere', name: 'Cohere', description: 'Cohere models for text generation and embedding' },
  { id: 'mistral', name: 'Mistral', description: 'Mistral models including Mistral-7B' },
  { id: 'replicate', name: 'Replicate', description: 'Cloud-based model hosting platform' },
  { id: 'huggingface', name: 'Hugging Face', description: 'Hugging Face model hosting' },
  { id: 'azure', name: 'Azure OpenAI', description: 'Microsoft Azure OpenAI models' },
  { id: 'vertexai', name: 'Vertex AI', description: 'Google Cloud Vertex AI models' },
  { id: 'bedrock', name: 'AWS Bedrock', description: 'Amazon Web Services model platform' },
  { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek AI large language models' },
];

/**
 * Default models for LiteLLM providers
 */
export const DEFAULT_MODELS_FOR_LITELLM_PROVIDERS: Record<string, string[]> = {
  'groq': ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'],
  'together': ['togethercomputer/llama-3-8b-instruct', 'togethercomputer/llama-3-70b-instruct'],
  'cohere': ['command', 'command-light', 'command-r', 'command-r-plus'],
  'mistral': ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
  'gemini': ['gemini-1.0-pro', 'gemini-1.5-pro'],
  'deepseek': ['deepseek-coder', 'deepseek-llm-67b-chat', 'deepseek-llm-7b-chat', 'deepseek-math'],
};

/**
 * Gets the supported models for a provider
 * @param provider The provider name (e.g., 'openai', 'anthropic', etc.)
 * @returns An array of model names
 */
export function getSupportedModelsForProvider(provider: string): string[] {
  return DEFAULT_MODELS_FOR_LITELLM_PROVIDERS[provider] || [];
}

/**
 * Gets information about a specific provider
 * @param provider The provider name
 * @returns Provider information or undefined if not found
 */
export function getProviderInfo(provider: string) {
  return LITELLM_PROVIDERS.find(p => p.id === provider);
}

/**
 * Converts a provider setting to a LiteLLM compatible format
 * @param provider The provider settings
 * @returns LiteLLM compatible configuration
 */
export function convertToLiteLLMConfig(provider: any) {
  // Extract provider name, API key, and base URL
  const { provider: providerName, apiKey, baseUrl } = provider;
  
  // Create a configuration object based on the provider
  const config: any = {
    provider: providerName,
    api_key: apiKey,
  };
  
  // Add base URL if provided
  if (baseUrl) {
    config.base_url = baseUrl;
  }
  
  return config;
}

/**
 * Test connection to a LiteLLM provider and get available models
 * @param provider The provider name
 * @param apiKey API key
 * @param baseUrl Base URL
 * @param model Model name
 * @returns Test result
 */
export async function testLiteLLMConnection(
  provider: string,
  apiKey?: string,
  baseUrl?: string,
  model?: string
): Promise<any> {
  try {
    // Check if this is a supported provider
    const supportedProvider = getProviderInfo(provider);
    if (!supportedProvider) {
      return {
        success: false,
        message: `Unknown provider: ${provider}`,
      };
    }
    
    // Set the actual base URL - either from the input or a default one
    let actualBaseUrl = baseUrl;
    if (!actualBaseUrl) {
      switch (provider) {
        case 'groq':
          actualBaseUrl = 'https://api.groq.com/openai/v1';
          break;
        case 'together':
          actualBaseUrl = 'https://api.together.xyz/v1';
          break;
        case 'anthropic':
        case 'claude':
          actualBaseUrl = 'https://api.anthropic.com/v1';
          break;
        case 'cohere':
          actualBaseUrl = 'https://api.cohere.ai/v1';
          break;
        case 'mistral':
          actualBaseUrl = 'https://api.mistral.ai/v1';
          break;
        case 'gemini':
          actualBaseUrl = 'https://generativelanguage.googleapis.com';
          break;
        case 'openai':
          actualBaseUrl = 'https://api.openai.com/v1';
          break;
        case 'deepseek':
          actualBaseUrl = 'https://api.deepseek.com/v1';
          break;
        default:
          return {
            success: false,
            message: `No base URL provided for ${provider}`,
          };
      }
    }
    
    // Authentication headers
    const headers: Record<string, string> = {};
    
    // Most providers use Bearer token
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Construct the URL for model retrieval
    let url = '';
    
    // API endpoints differ by provider
    if (provider === 'gemini') {
      url = `${actualBaseUrl}/v1beta/models`;
      // Google might need different authorization header
      if (apiKey) {
        delete headers['Authorization']; // Remove Bearer prefix
        headers['x-goog-api-key'] = apiKey;
      }
    } else {
      // Default OpenAI-compatible endpoint
      url = `${actualBaseUrl}/models`;
    }
    
    // Make the request
    const response = await axios.get(url, { headers, timeout: 5000 });
    
    return {
      success: true,
      message: `Successfully connected to ${provider}`,
      data: response.data
    };
  } catch (error) {
    console.error(`Error testing connection to ${provider}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        message: `Error connecting to ${provider}: ${error.response.status} ${error.response.statusText}`,
        error: error.response.data
      };
    }
    return {
      success: false,
      message: `Error connecting to ${provider}: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}