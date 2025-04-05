import { Tool, Agent } from '@shared/schema';
import { storage } from '../storage';
import { WebBrowser } from './webBrowser';
import { FileSystem } from './fileSystem';
import { CodeExecution } from './codeExecution';
import { ApiConnector } from './apiConnector';

// Interface for tool implementation
export interface ITool {
  getName(): string;
  getType(): string;
  getDescription(): string;
  isEnabled(): boolean;
  execute(params: any): Promise<any>;
  getParameters(): Record<string, any>;
}

export class ToolManager {
  private tools: Map<string, ITool> = new Map();
  
  constructor() {
    // Tools will be initialized when initialize() is called
  }
  
  async initialize(): Promise<void> {
    try {
      // Check if any tools exist in storage
      const storedTools = await storage.getAllTools();
      
      if (storedTools.length === 0) {
        // Create default tools
        await this.createDefaultTools();
      }
      
      // Initialize tool instances
      const allTools = await storage.getAllTools();
      
      // Create tool instances
      for (const toolData of allTools) {
        this.createToolInstance(toolData);
      }
      
      console.log(`Initialized ${this.tools.size} tools`);
    } catch (error) {
      console.error('Error initializing tools:', error);
    }
  }
  
  private async createDefaultTools(): Promise<void> {
    const defaultTools = [
      {
        name: 'Web Browser',
        description: 'Search the web and browse websites',
        type: 'web_browser',
        isEnabled: true,
        config: { 
          userAgent: 'Mozilla/5.0 Manus AI Browser',
          timeout: 30000
        }
      },
      {
        name: 'File System',
        description: 'Read and write files',
        type: 'file_system',
        isEnabled: true,
        config: {
          allowedExtensions: ['.txt', '.md', '.json', '.csv'],
          basePath: './workspace'
        }
      },
      {
        name: 'Code Execution',
        description: 'Execute code in isolated environment',
        type: 'code_execution',
        isEnabled: true,
        config: {
          languages: ['javascript', 'python', 'bash'],
          timeout: 10000
        }
      },
      {
        name: 'API Connector',
        description: 'Make API calls to external services',
        type: 'api_connector',
        isEnabled: true,
        config: {
          allowedDomains: ['api.openai.com', 'api.github.com'],
          timeout: 10000
        }
      }
    ];
    
    for (const tool of defaultTools) {
      await storage.createTool(tool);
    }
  }
  
  private createToolInstance(toolData: Tool): ITool {
    let tool: ITool;
    
    // Create appropriate tool type
    switch (toolData.type) {
      case 'web_browser':
        tool = new WebBrowser(toolData);
        break;
      case 'file_system':
        tool = new FileSystem(toolData);
        break;
      case 'code_execution':
        tool = new CodeExecution(toolData);
        break;
      case 'api_connector':
        tool = new ApiConnector(toolData);
        break;
      default:
        throw new Error(`Unknown tool type: ${toolData.type}`);
    }
    
    this.tools.set(toolData.type, tool);
    return tool;
  }
  
  async getAllTools(): Promise<Tool[]> {
    return storage.getAllTools();
  }
  
  async getToolById(id: number): Promise<Tool | undefined> {
    return storage.getToolById(id);
  }
  
  getToolByType(type: string): ITool | undefined {
    return this.tools.get(type);
  }
  
  async getToolsForAgent(agent: Agent): Promise<any[]> {
    if (!agent.tools || agent.tools.length === 0) {
      return [];
    }
    
    const tools = [];
    
    for (const toolType of agent.tools) {
      const tool = this.getToolByType(toolType);
      if (tool && tool.isEnabled()) {
        tools.push({
          type: 'function',
          function: {
            name: tool.getType(),
            description: tool.getDescription(),
            parameters: tool.getParameters()
          }
        });
      }
    }
    
    return tools;
  }
  
  async createTool(toolData: Omit<Tool, 'id'>): Promise<Tool> {
    const newTool = await storage.createTool(toolData);
    
    // Create tool instance
    this.createToolInstance(newTool);
    
    return newTool;
  }
  
  async updateTool(id: number, toolData: Partial<Tool>): Promise<Tool | undefined> {
    const tool = await storage.getToolById(id);
    
    if (!tool) {
      return undefined;
    }
    
    const updatedTool = await storage.updateTool(id, toolData);
    
    // Update tool instance
    if (updatedTool) {
      const toolType = updatedTool.type;
      // Remove old instance
      this.tools.delete(toolType);
      // Create new instance
      this.createToolInstance(updatedTool);
    }
    
    return updatedTool;
  }
  
  async deleteTool(id: number): Promise<void> {
    const tool = await storage.getToolById(id);
    
    if (tool) {
      await storage.deleteTool(id);
      
      // Remove tool instance
      this.tools.delete(tool.type);
    }
  }
}

// Export singleton instance
export const toolManager = new ToolManager();
