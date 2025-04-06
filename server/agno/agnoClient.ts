import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file path and directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * AgnoClient - TypeScript client for the Agno Python bridge
 * This client communicates with the Agno Python bridge to interact with the Agno library.
 */

// Define interfaces for Agno models
interface AgnoModel {
  id: string;
  name: string;
  type: 'openai' | 'anthropic';
  config: {
    model: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

// Define interfaces for Agno agents
interface AgnoAgent {
  id: string;
  name: string;
  modelId?: string;
  systemPrompt?: string;
  tools?: string[];
}

// Define interfaces for Agno tools
interface AgnoTool {
  id: string;
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

// Define interfaces for Agno memory
interface AgnoMemory {
  id: string;
  modelId?: string;
  limit?: number;
}

// Define interfaces for messages
interface AgnoMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
}

export class AgnoClient {
  private baseUrl: string;
  private pythonProcess: any;
  private isReady: boolean = false;
  private readyPromise: Promise<boolean>;
  private readyResolver!: (value: boolean) => void;
  
  constructor(port: number = 9000) {
    this.baseUrl = `http://localhost:${port}`;
    
    // Setup ready promise
    this.readyPromise = new Promise((resolve) => {
      this.readyResolver = resolve;
    });
    
    // Start the Python bridge
    this.startPythonBridge();
  }
  
  /**
   * Start the Python bridge process
   */
  private startPythonBridge() {
    const bridgePath = path.join(__dirname, 'agnoBridge.py');
    console.log('Starting Agno Python bridge...', bridgePath);
    
    // Spawn the Python process
    this.pythonProcess = spawn('python', [bridgePath]);
    
    // Handle process output
    this.pythonProcess.stdout.on('data', (data: Buffer) => {
      console.log(`Agno Bridge stdout: ${data.toString()}`);
      
      // Check if the server is running
      if (data.toString().includes('Running on')) {
        this.isReady = true;
        this.readyResolver(true);
      }
    });
    
    this.pythonProcess.stderr.on('data', (data: Buffer) => {
      console.error(`Agno Bridge stderr: ${data.toString()}`);
    });
    
    this.pythonProcess.on('close', (code: number) => {
      console.log(`Agno Bridge process exited with code ${code}`);
      this.isReady = false;
    });
    
    // Handle process termination
    process.on('exit', () => {
      if (this.pythonProcess) {
        this.pythonProcess.kill();
      }
    });
  }
  
  /**
   * Check if the Agno bridge is ready
   */
  public async waitUntilReady(): Promise<boolean> {
    if (this.isReady) {
      return true;
    }
    
    return this.readyPromise;
  }
  
  /**
   * Create a new LLM model instance
   */
  public async createModel(model: AgnoModel): Promise<any> {
    await this.waitUntilReady();
    
    try {
      const response = await axios.post(`${this.baseUrl}/models`, model);
      return response.data;
    } catch (error) {
      console.error('Error creating model:', error);
      throw error;
    }
  }
  
  /**
   * Generate a response from a model
   */
  public async generateResponse(modelId: string, messages: AgnoMessage[]): Promise<any> {
    await this.waitUntilReady();
    
    try {
      const response = await axios.post(`${this.baseUrl}/models/${modelId}/generate`, { messages });
      return response.data;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }
  
  /**
   * Create a new agent
   */
  public async createAgent(agent: AgnoAgent): Promise<any> {
    await this.waitUntilReady();
    
    try {
      const response = await axios.post(`${this.baseUrl}/agents`, agent);
      return response.data;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }
  
  /**
   * Run an agent with a user message
   */
  public async runAgent(agentId: string, message: string, workspaceId?: number): Promise<any> {
    await this.waitUntilReady();
    
    try {
      const response = await axios.post(`${this.baseUrl}/agents/${agentId}/run`, { 
        message,
        workspaceId
      });
      return response.data;
    } catch (error) {
      console.error('Error running agent:', error);
      throw error;
    }
  }
  
  /**
   * Create a new tool
   */
  public async createTool(tool: AgnoTool): Promise<any> {
    await this.waitUntilReady();
    
    try {
      const response = await axios.post(`${this.baseUrl}/tools`, tool);
      return response.data;
    } catch (error) {
      console.error('Error creating tool:', error);
      throw error;
    }
  }
  
  /**
   * Create a new memory manager
   */
  public async createMemoryManager(memory: AgnoMemory): Promise<any> {
    await this.waitUntilReady();
    
    try {
      const response = await axios.post(`${this.baseUrl}/memory`, memory);
      return response.data;
    } catch (error) {
      console.error('Error creating memory manager:', error);
      throw error;
    }
  }
  
  /**
   * Add a memory to a memory manager
   */
  public async addMemory(memoryId: string, content: string): Promise<any> {
    await this.waitUntilReady();
    
    try {
      const response = await axios.post(`${this.baseUrl}/memory/${memoryId}/add`, { content });
      return response.data;
    } catch (error) {
      console.error('Error adding memory:', error);
      throw error;
    }
  }
  
  /**
   * Get the status of the Agno bridge
   */
  public async getStatus(): Promise<any> {
    await this.waitUntilReady();
    
    try {
      const response = await axios.get(`${this.baseUrl}/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting status:', error);
      throw error;
    }
  }
  
  /**
   * Stop the Agno bridge
   */
  public stop() {
    if (this.pythonProcess) {
      console.log('Stopping Agno Python bridge...');
      this.pythonProcess.kill();
      this.pythonProcess = null;
      this.isReady = false;
    }
  }
}

// Export a singleton instance
export const agnoClient = new AgnoClient();