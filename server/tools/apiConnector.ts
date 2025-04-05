import { Tool } from '@shared/schema';
import { ITool } from './toolManager';
import axios, { AxiosRequestConfig, Method } from 'axios';
import { URL } from 'url';

export class ApiConnector implements ITool {
  private toolData: Tool;
  private allowedDomains: string[];
  private timeout: number;
  
  constructor(toolData: Tool) {
    this.toolData = toolData;
    
    const config = toolData.config as Record<string, any> || {};
    this.allowedDomains = config.allowedDomains || [];
    this.timeout = config.timeout || 10000;
  }
  
  getName(): string {
    return this.toolData.name;
  }
  
  getType(): string {
    return this.toolData.type;
  }
  
  getDescription(): string {
    return this.toolData.description || 'Make API calls to external services';
  }
  
  isEnabled(): boolean {
    return this.toolData.isEnabled;
  }
  
  getParameters(): Record<string, any> {
    return {
      type: 'object',
      required: ['url', 'method'],
      properties: {
        url: {
          type: 'string',
          description: 'URL to make the API request to',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          description: 'HTTP method for the request',
        },
        headers: {
          type: 'object',
          description: 'HTTP headers to include in the request',
        },
        data: {
          type: 'object',
          description: 'Data to send in the request body for POST/PUT requests',
        },
        params: {
          type: 'object',
          description: 'URL parameters to include in the request',
        }
      }
    };
  }
  
  async execute(params: any): Promise<any> {
    if (!params.url) {
      throw new Error('URL parameter is required');
    }
    
    if (!params.method) {
      throw new Error('Method parameter is required');
    }
    
    // Validate URL domain
    const domain = this.extractDomain(params.url);
    if (!this.isDomainAllowed(domain)) {
      throw new Error(`Domain not allowed: ${domain}`);
    }
    
    return this.makeApiCall(
      params.url,
      params.method,
      params.headers,
      params.data,
      params.params
    );
  }
  
  private extractDomain(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }
  
  private isDomainAllowed(domain: string): boolean {
    // If no allowed domains are specified, all are disallowed
    if (this.allowedDomains.length === 0) {
      return false;
    }
    
    // Check if domain is in allowed list
    return this.allowedDomains.some(allowedDomain => {
      // Allow exact match
      if (domain === allowedDomain) {
        return true;
      }
      
      // Allow subdomains if allowed domain starts with a dot
      if (allowedDomain.startsWith('.') && domain.endsWith(allowedDomain)) {
        return true;
      }
      
      return false;
    });
  }
  
  private async makeApiCall(
    url: string,
    method: string,
    headers: Record<string, string> = {},
    data: any = null,
    params: Record<string, string> = {}
  ): Promise<any> {
    try {
      const config: AxiosRequestConfig = {
        url,
        method: method as Method,
        headers,
        timeout: this.timeout,
      };
      
      if (params && Object.keys(params).length > 0) {
        config.params = params;
      }
      
      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
      }
      
      const response = await axios(config);
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorResponse = {
          error: true,
          status: error.response?.status,
          statusText: error.response?.statusText || error.message,
          message: error.message,
        };
        
        if (error.response?.data) {
          return {
            ...errorResponse,
            data: error.response.data,
          };
        }
        
        return errorResponse;
      }
      
      throw new Error(`API call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
