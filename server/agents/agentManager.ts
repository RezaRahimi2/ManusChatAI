import { Agent, InsertAgent } from '@shared/schema';
import { storage } from '../storage';
import { BaseAgent } from './baseAgent';
import { Orchestrator } from './orchestrator';
import { ResearchAgent } from './researchAgent';
import { CodeAgent } from './codeAgent';
import { WriterAgent } from './writerAgent';
import { LLMManager } from '../llm/llmManager';
import { memoryManager } from '../memory/memory';
import { toolManager } from '../tools/toolManager';

class AgentManager {
  private agents: Map<number, BaseAgent> = new Map();
  private llmManager: LLMManager;
  
  constructor() {
    this.llmManager = new LLMManager();
  }
  
  async initialize() {
    // Setup default tools
    await toolManager.initialize();
    
    // Check if agents exist in storage
    const storedAgents = await this.getAllAgents();
    
    if (storedAgents.length === 0) {
      // Create default agents if none exist
      await this.createDefaultAgents();
    } else {
      // Load existing agents
      for (const agentData of storedAgents) {
        this.createAgentInstance(agentData);
      }
    }
  }
  
  async createDefaultAgents() {
    // Create orchestrator
    await this.createAgent({
      name: 'Orchestrator',
      description: 'Main coordination agent',
      type: 'orchestrator',
      systemPrompt: 'You are the Orchestrator, a coordination agent responsible for delegating tasks to specialized agents. You analyze user requests, break them down into subtasks, and determine which agents should handle each part. After receiving responses from all agents, you synthesize their outputs into a coherent response for the user.',
      model: 'gpt-4',
      provider: 'openai',
      temperature: 0.7,
      maxTokens: 4000,
      tools: ['web_browser'],
      isActive: true
    });
    
    // Create research agent
    await this.createAgent({
      name: 'Research Agent',
      description: 'Retrieves and analyzes information',
      type: 'research',
      systemPrompt: 'You are the Research Agent, specialized in finding, analyzing, and summarizing information. You have access to web search and can browse web pages to extract relevant information. Provide comprehensive, accurate, and properly cited information.',
      model: 'claude-3-sonnet',
      provider: 'anthropic',
      temperature: 0.5,
      maxTokens: 4000,
      tools: ['web_browser'],
      isActive: true
    });
    
    // Create code agent
    await this.createAgent({
      name: 'Code Agent',
      description: 'Generates and analyzes code',
      type: 'code',
      systemPrompt: 'You are the Code Agent, specialized in generating, analyzing, and debugging code. You excel at understanding programming concepts, implementing algorithms, and providing clean, efficient solutions. Explain your code thoroughly and consider best practices.',
      model: 'ollama/codellama',
      provider: 'ollama',
      temperature: 0.2,
      maxTokens: 8000,
      tools: ['code_execution'],
      isActive: true
    });
    
    // Create writer agent
    await this.createAgent({
      name: 'Writer Agent',
      description: 'Creates written content',
      type: 'writer',
      systemPrompt: 'You are the Writer Agent, specialized in creating high-quality written content. You excel at crafting engaging narratives, clear explanations, and persuasive arguments. Adapt your tone, style, and structure based on the specific content needs.',
      model: 'lmstudio/mistral',
      provider: 'lmstudio',
      temperature: 0.8,
      maxTokens: 4000,
      tools: [],
      isActive: true
    });
  }
  
  private createAgentInstance(agentData: Agent): BaseAgent {
    let agent: BaseAgent;
    
    // Create appropriate agent type
    switch (agentData.type) {
      case 'orchestrator':
        agent = new Orchestrator(
          agentData,
          this.llmManager,
          memoryManager,
          toolManager
        );
        break;
      case 'research':
        agent = new ResearchAgent(
          agentData,
          this.llmManager,
          memoryManager,
          toolManager
        );
        break;
      case 'code':
        agent = new CodeAgent(
          agentData,
          this.llmManager,
          memoryManager,
          toolManager
        );
        break;
      case 'writer':
        agent = new WriterAgent(
          agentData,
          this.llmManager,
          memoryManager,
          toolManager
        );
        break;
      default:
        agent = new BaseAgent(
          agentData,
          this.llmManager,
          memoryManager,
          toolManager
        );
    }
    
    this.agents.set(agentData.id, agent);
    return agent;
  }
  
  async getAllAgents(): Promise<Agent[]> {
    return storage.getAllAgents();
  }
  
  async getAgentById(id: number): Promise<Agent | undefined> {
    return storage.getAgentById(id);
  }
  
  getAgentInstance(id: number): BaseAgent | undefined {
    return this.agents.get(id);
  }
  
  async createAgent(agentData: InsertAgent): Promise<Agent> {
    const newAgent = await storage.createAgent({
      ...agentData,
      createdAt: Date.now()
    });
    
    // Create agent instance
    this.createAgentInstance(newAgent);
    
    return newAgent;
  }
  
  async updateAgent(id: number, agentData: Partial<Agent>): Promise<Agent | undefined> {
    const agent = await storage.getAgentById(id);
    
    if (!agent) {
      return undefined;
    }
    
    const updatedAgent = await storage.updateAgent(id, agentData);
    
    // Update agent instance
    if (updatedAgent && this.agents.has(id)) {
      // Remove old instance
      this.agents.delete(id);
      // Create new instance
      this.createAgentInstance(updatedAgent);
    }
    
    return updatedAgent;
  }
  
  async deleteAgent(id: number): Promise<void> {
    await storage.deleteAgent(id);
    
    // Remove agent instance
    if (this.agents.has(id)) {
      this.agents.delete(id);
    }
  }
  
  async processMessage(workspaceId: number, message: string): Promise<void> {
    // Find orchestrator agent
    let orchestrator: BaseAgent | undefined;
    
    for (const agent of this.agents.values()) {
      if (agent.getType() === 'orchestrator') {
        orchestrator = agent;
        break;
      }
    }
    
    if (!orchestrator) {
      throw new Error('Orchestrator agent not found');
    }
    
    // Process message through orchestrator
    await orchestrator.process(workspaceId, message);
  }
}

export const agentManager = new AgentManager();
