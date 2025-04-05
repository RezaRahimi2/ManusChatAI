import { users, type User, type InsertUser, Agent, InsertAgent, Tool, Message, Workspace, InsertWorkspace, Memory, LLMProviderSettings } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Agent methods
  getAllAgents(): Promise<Agent[]>;
  getAgentById(id: number): Promise<Agent | undefined>;
  createAgent(agent: Omit<Agent, 'id'>): Promise<Agent>;
  updateAgent(id: number, agent: Partial<Agent>): Promise<Agent | undefined>;
  deleteAgent(id: number): Promise<void>;
  
  // Workspace methods
  getAllWorkspaces(): Promise<Workspace[]>;
  getWorkspaceById(id: number): Promise<Workspace | undefined>;
  createWorkspace(workspace: Omit<Workspace, 'id'>): Promise<Workspace>;
  updateWorkspace(id: number, workspace: Partial<Workspace>): Promise<Workspace | undefined>;
  deleteWorkspace(id: number): Promise<void>;
  
  // Message methods
  getAllMessages(): Promise<Message[]>;
  getMessageById(id: number): Promise<Message | undefined>;
  getMessagesByWorkspace(workspaceId: number): Promise<Message[]>;
  createMessage(message: Omit<Message, 'id'>): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  
  // Tool methods
  getAllTools(): Promise<Tool[]>;
  getToolById(id: number): Promise<Tool | undefined>;
  createTool(tool: Omit<Tool, 'id'>): Promise<Tool>;
  updateTool(id: number, tool: Partial<Tool>): Promise<Tool | undefined>;
  deleteTool(id: number): Promise<void>;
  
  // Memory methods
  getAllMemories(): Promise<Memory[]>;
  getMemoryById(id: number): Promise<Memory | undefined>;
  getMemoryByKey(key: string): Promise<Memory | undefined>;
  createMemory(memory: Omit<Memory, 'id'>): Promise<Memory>;
  deleteMemory(id: number): Promise<void>;
  deleteMemoryByKey(key: string): Promise<void>;
  
  // LLM Provider Settings methods
  getLLMProviderSettings(provider: string): Promise<LLMProviderSettings | undefined>;
  getAllLLMProviderSettings(): Promise<LLMProviderSettings[]>;
  setLLMProviderSettings(settings: LLMProviderSettings): Promise<LLMProviderSettings>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private agents: Map<number, Agent>;
  private workspaces: Map<number, Workspace>;
  private messages: Map<number, Message>;
  private tools: Map<number, Tool>;
  private memories: Map<number, Memory>;
  private llmProviders: Map<string, LLMProviderSettings>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.agents = new Map();
    this.workspaces = new Map();
    this.messages = new Map();
    this.tools = new Map();
    this.memories = new Map();
    this.llmProviders = new Map();
    this.currentId = 1;
    
    // Initialize default LLM providers
    this.initializeLLMProviders();
    
    // Initialize with a default workspace
    this.createWorkspace({
      name: "Main Workspace",
      createdAt: Date.now()
    });
  }
  
  private initializeLLMProviders(): void {
    // Set up default LLM providers
    const defaultProviders: LLMProviderSettings[] = [
      { provider: 'openai', isEnabled: false },
      { provider: 'anthropic', isEnabled: false },
      { provider: 'ollama', baseUrl: 'http://localhost:11434', isEnabled: true },
      { provider: 'lmstudio', baseUrl: 'http://localhost:1234/v1', isEnabled: true },
      { provider: 'perplexity', isEnabled: false },
      { provider: 'xai', isEnabled: false }
    ];
    
    for (const provider of defaultProviders) {
      this.llmProviders.set(provider.provider, provider);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Agent methods
  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }
  
  async getAgentById(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }
  
  async createAgent(agent: Omit<Agent, 'id'>): Promise<Agent> {
    const id = this.currentId++;
    const newAgent: Agent = { ...agent, id };
    this.agents.set(id, newAgent);
    return newAgent;
  }
  
  async updateAgent(id: number, update: Partial<Agent>): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    
    const updatedAgent: Agent = { ...agent, ...update };
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }
  
  async deleteAgent(id: number): Promise<void> {
    this.agents.delete(id);
  }
  
  // Workspace methods
  async getAllWorkspaces(): Promise<Workspace[]> {
    return Array.from(this.workspaces.values());
  }
  
  async getWorkspaceById(id: number): Promise<Workspace | undefined> {
    return this.workspaces.get(id);
  }
  
  async createWorkspace(workspace: Omit<Workspace, 'id'>): Promise<Workspace> {
    const id = this.currentId++;
    const newWorkspace: Workspace = { ...workspace, id };
    this.workspaces.set(id, newWorkspace);
    return newWorkspace;
  }
  
  async updateWorkspace(id: number, update: Partial<Workspace>): Promise<Workspace | undefined> {
    const workspace = this.workspaces.get(id);
    if (!workspace) return undefined;
    
    const updatedWorkspace: Workspace = { ...workspace, ...update };
    this.workspaces.set(id, updatedWorkspace);
    return updatedWorkspace;
  }
  
  async deleteWorkspace(id: number): Promise<void> {
    this.workspaces.delete(id);
    // Also delete all messages in this workspace
    for (const [msgId, message] of this.messages.entries()) {
      if (message.workspaceId === id) {
        this.messages.delete(msgId);
      }
    }
  }
  
  // Message methods
  async getAllMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }
  
  async getMessageById(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async getMessagesByWorkspace(workspaceId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.workspaceId === workspaceId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }
  
  async createMessage(message: Omit<Message, 'id'>): Promise<Message> {
    const id = this.currentId++;
    const newMessage: Message = { ...message, id };
    this.messages.set(id, newMessage);
    return newMessage;
  }
  
  async deleteMessage(id: number): Promise<void> {
    this.messages.delete(id);
  }
  
  // Tool methods
  async getAllTools(): Promise<Tool[]> {
    return Array.from(this.tools.values());
  }
  
  async getToolById(id: number): Promise<Tool | undefined> {
    return this.tools.get(id);
  }
  
  async createTool(tool: Omit<Tool, 'id'>): Promise<Tool> {
    const id = this.currentId++;
    const newTool: Tool = { ...tool, id };
    this.tools.set(id, newTool);
    return newTool;
  }
  
  async updateTool(id: number, update: Partial<Tool>): Promise<Tool | undefined> {
    const tool = this.tools.get(id);
    if (!tool) return undefined;
    
    const updatedTool: Tool = { ...tool, ...update };
    this.tools.set(id, updatedTool);
    return updatedTool;
  }
  
  async deleteTool(id: number): Promise<void> {
    this.tools.delete(id);
  }
  
  // Memory methods
  async getAllMemories(): Promise<Memory[]> {
    return Array.from(this.memories.values());
  }
  
  async getMemoryById(id: number): Promise<Memory | undefined> {
    return this.memories.get(id);
  }
  
  async getMemoryByKey(key: string): Promise<Memory | undefined> {
    return Array.from(this.memories.values()).find(
      memory => memory.key === key
    );
  }
  
  async createMemory(memory: Omit<Memory, 'id'>): Promise<Memory> {
    const id = this.currentId++;
    const newMemory: Memory = { ...memory, id };
    this.memories.set(id, newMemory);
    return newMemory;
  }
  
  async deleteMemory(id: number): Promise<void> {
    this.memories.delete(id);
  }
  
  async deleteMemoryByKey(key: string): Promise<void> {
    const memory = Array.from(this.memories.values()).find(
      memory => memory.key === key
    );
    
    if (memory) {
      this.memories.delete(memory.id);
    }
  }
  
  // LLM Provider Settings methods
  async getLLMProviderSettings(provider: string): Promise<LLMProviderSettings | undefined> {
    return this.llmProviders.get(provider);
  }
  
  async getAllLLMProviderSettings(): Promise<LLMProviderSettings[]> {
    return Array.from(this.llmProviders.values());
  }
  
  async setLLMProviderSettings(settings: LLMProviderSettings): Promise<LLMProviderSettings> {
    this.llmProviders.set(settings.provider, settings);
    return settings;
  }
}

export const storage = new MemStorage();
