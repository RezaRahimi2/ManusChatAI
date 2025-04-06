import axios from 'axios';
import { Tool } from '@shared/schema';
import { ITool } from './toolManager';

/**
 * Tool for accessing and processing web content
 */
export class WebBrowser implements ITool {
  private tool: Tool;
  
  constructor(tool: Tool) {
    this.tool = tool;
  }
  
  getName(): string {
    return this.tool.name;
  }
  
  getType(): string {
    return this.tool.type;
  }
  
  getDescription(): string {
    return this.tool.description || 'Access and process web content from URLs';
  }
  
  isEnabled(): boolean {
    return this.tool.isEnabled !== false;
  }
  
  getParameters(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['visit', 'extract_content', 'search'],
          description: 'The action to perform with the web browser tool'
        },
        url: {
          type: 'string',
          description: 'The URL to visit or extract content from'
        },
        query: {
          type: 'string',
          description: 'The search query to use'
        },
        selector: {
          type: 'string',
          description: 'Optional CSS selector to extract specific content from the page'
        }
      },
      required: ['action']
    };
  }
  
  async execute(params: any): Promise<any> {
    const { action } = params;
    
    switch (action) {
      case 'visit':
        return this.visitUrl(params.url);
        
      case 'extract_content':
        return this.extractContent(params.url, params.selector);
        
      case 'search':
        return this.search(params.query);
        
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`
        };
    }
  }
  
  /**
   * Get the tool's configuration
   */
  getConfig(): Tool {
    return this.tool;
  }
  
  /**
   * Visit a URL and retrieve basic metadata
   */
  private async visitUrl(url: string): Promise<{
    success: boolean;
    title?: string;
    url?: string;
    error?: string;
    contentType?: string;
  }> {
    try {
      // Validate the URL
      if (!url || !url.match(/^https?:\/\/.+/)) {
        return {
          success: false,
          error: 'Invalid URL format. URL must start with http:// or https://'
        };
      }
      
      console.log(`Visiting URL: ${url}`);
      
      // Make a GET request to the URL
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MultiAgentSystem/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        },
        timeout: 10000, // 10 second timeout
        maxContentLength: 1024 * 1024 * 5 // 5MB limit
      });
      
      // Extract title if available
      const titleMatch = response.data.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : 'Unknown Title';
      
      return {
        success: true,
        title,
        url,
        contentType: response.headers['content-type']
      };
    } catch (error) {
      console.error('Error visiting URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Extract content from a URL
   */
  private async extractContent(
    url: string,
    selector?: string
  ): Promise<{
    success: boolean;
    content?: string;
    title?: string;
    error?: string;
    url?: string;
  }> {
    try {
      // Validate the URL
      if (!url || !url.match(/^https?:\/\/.+/)) {
        return {
          success: false,
          error: 'Invalid URL format. URL must start with http:// or https://'
        };
      }
      
      console.log(`Extracting content from URL: ${url}`);
      
      // Make a GET request to the URL
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MultiAgentSystem/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        },
        timeout: 15000, // 15 second timeout
        maxContentLength: 1024 * 1024 * 10 // 10MB limit
      });
      
      // Extract title if available
      const titleMatch = response.data.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : 'Unknown Title';
      
      // Simple HTML to text conversion for content
      // In a real implementation, we'd use a proper HTML parser
      let content = response.data;
      
      // Remove scripts and styles
      content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
      content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
      
      // Convert HTML to text (basic approach)
      content = content.replace(/<\/div>|<\/p>|<\/h[1-6]>|<br\s*\/?>/gi, '\n');
      content = content.replace(/<[^>]+>/g, ' ');
      
      // Clean up whitespace
      content = content.replace(/\s+/g, ' ').trim();
      
      // Decode HTML entities
      content = content.replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      
      // Truncate if too long (~ 8000 chars limit)
      if (content.length > 8000) {
        content = content.substring(0, 8000) + '... [content truncated due to length]';
      }
      
      return {
        success: true,
        title,
        content,
        url
      };
    } catch (error) {
      console.error('Error extracting content from URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Perform a web search (simplified implementation)
   * In a production environment, this would integrate with a real search API
   */
  private async search(query: string): Promise<{
    success: boolean;
    results?: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
    error?: string;
  }> {
    try {
      console.log(`Searching for: ${query}`);
      
      // This is a simplified mock response
      // In a real implementation, you would use a search API like Google Custom Search
      return {
        success: true,
        results: [
          {
            title: 'Search results are not available',
            url: 'https://example.com/search-results',
            snippet: 'In a production environment, this would connect to a real search engine API.'
          }
        ]
      };
    } catch (error) {
      console.error('Error during search:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}