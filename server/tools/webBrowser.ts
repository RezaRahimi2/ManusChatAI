import { Tool } from '@shared/schema';
import { ITool } from './toolManager';
import axios from 'axios';
import { JSDOM } from 'jsdom';

export class WebBrowser implements ITool {
  private toolData: Tool;
  
  constructor(toolData: Tool) {
    this.toolData = toolData;
  }
  
  getName(): string {
    return this.toolData.name;
  }
  
  getType(): string {
    return this.toolData.type;
  }
  
  getDescription(): string {
    return this.toolData.description || 'Search the web and browse websites';
  }
  
  isEnabled(): boolean {
    return this.toolData.isEnabled;
  }
  
  getParameters(): Record<string, any> {
    return {
      type: 'object',
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: ['search', 'visit', 'extract'],
          description: 'Action to perform: search the web, visit a URL, or extract content from a webpage',
        },
        query: {
          type: 'string',
          description: 'Search query when action is "search"',
        },
        url: {
          type: 'string',
          description: 'URL to visit or extract content from when action is "visit" or "extract"',
        },
        selector: {
          type: 'string',
          description: 'CSS selector to extract specific content when action is "extract"',
        }
      }
    };
  }
  
  async execute(params: any): Promise<any> {
    // Validate action
    if (!params.action) {
      throw new Error('Action parameter is required');
    }
    
    const config = this.toolData.config as Record<string, any> || {};
    const timeout = config.timeout || 30000;
    const userAgent = config.userAgent || 'Mozilla/5.0 Manus AI Browser';
    
    switch (params.action) {
      case 'search':
        return this.search(params.query, timeout, userAgent);
      case 'visit':
        return this.visit(params.url, timeout, userAgent);
      case 'extract':
        return this.extract(params.url, params.selector, timeout, userAgent);
      default:
        throw new Error(`Unknown action: ${params.action}`);
    }
  }
  
  private async search(query: string, timeout: number, userAgent: string): Promise<any> {
    if (!query) {
      throw new Error('Query parameter is required for search action');
    }
    
    try {
      // For demo purposes, we'll use DuckDuckGo's HTML site
      // In a production system, you'd use a proper search API
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout,
      });
      
      // Parse the HTML response
      const dom = new JSDOM(response.data);
      const document = dom.window.document;
      
      // Extract search results
      const results = Array.from(document.querySelectorAll('.result'))
        .slice(0, 5) // Limit to top 5 results
        .map(result => {
          const titleElement = result.querySelector('.result__title a');
          const snippetElement = result.querySelector('.result__snippet');
          const urlElement = result.querySelector('.result__url');
          
          return {
            title: titleElement?.textContent?.trim() || '',
            snippet: snippetElement?.textContent?.trim() || '',
            url: titleElement ? (titleElement as HTMLAnchorElement).href : '',
          };
        });
      
      return {
        query,
        results,
      };
    } catch (error) {
      console.error('Error searching the web:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async visit(url: string, timeout: number, userAgent: string): Promise<any> {
    if (!url) {
      throw new Error('URL parameter is required for visit action');
    }
    
    try {
      // Validate URL
      new URL(url);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout,
      });
      
      // Parse the HTML response
      const dom = new JSDOM(response.data);
      const document = dom.window.document;
      
      // Extract title and main content
      const title = document.querySelector('title')?.textContent || '';
      
      // Try to extract main content
      // For simplicity, grab text from paragraphs, headings, and list items
      const contentElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'));
      const content = contentElements
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 20) // Filter out empty or very short texts
        .join('\n\n');
      
      return {
        url,
        title,
        content: content.substring(0, 5000), // Limit to 5000 chars to prevent very large responses
      };
    } catch (error) {
      console.error('Error visiting URL:', error);
      throw new Error(`Visit failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async extract(url: string, selector: string, timeout: number, userAgent: string): Promise<any> {
    if (!url) {
      throw new Error('URL parameter is required for extract action');
    }
    
    if (!selector) {
      throw new Error('Selector parameter is required for extract action');
    }
    
    try {
      // Validate URL
      new URL(url);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout,
      });
      
      // Parse the HTML response
      const dom = new JSDOM(response.data);
      const document = dom.window.document;
      
      // Extract content using selector
      const elements = Array.from(document.querySelectorAll(selector));
      const extractedContent = elements
        .map(el => el.textContent?.trim())
        .filter(Boolean)
        .join('\n\n');
      
      return {
        url,
        selector,
        content: extractedContent.substring(0, 5000), // Limit to 5000 chars
        elementCount: elements.length,
      };
    } catch (error) {
      console.error('Error extracting content:', error);
      throw new Error(`Extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
