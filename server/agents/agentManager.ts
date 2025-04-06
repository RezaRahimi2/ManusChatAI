import { Agent, InsertAgent } from '@shared/schema';
import { storage } from '../storage';
import { BaseAgent } from './baseAgent';
import { Orchestrator } from './orchestrator';
import { EnhancedOrchestrator } from './enhancedOrchestrator';
import { ResearchAgent } from './researchAgent';
import { CodeAgent } from './codeAgent';
import { WriterAgent } from './writerAgent';
import { PlannerAgent } from './plannerAgent';
import { ThinkerAgent } from './thinkerAgent';
import { LLMManager } from '../llm/llmManager';
import { memoryManager } from '../memory/memory';
import { toolManager } from '../tools/toolManager';

class AgentManager {
  private agents: Map<number, BaseAgent> = new Map();
  private llmManager: LLMManager;
  private currentCollaborations: Map<number, string> = new Map(); // workspaceId -> collaborationId
  
  constructor() {
    this.llmManager = new LLMManager();
  }
  
  /**
   * Stop an active collaboration in a workspace
   */
  async stopCollaboration(workspaceId: number, collaborationId: string): Promise<boolean> {
    // Find the orchestrator agent for this workspace
    let enhancedOrchestrator: EnhancedOrchestrator | undefined;
    
    // Convert to array to avoid downlevelIteration issues
    Array.from(this.agents.values()).forEach(agent => {
      if (agent.getType() === 'enhanced_orchestrator' && agent.getConfig().isActive) {
        enhancedOrchestrator = agent as EnhancedOrchestrator;
      }
    });
    
    if (!enhancedOrchestrator || !enhancedOrchestrator.collaborationProtocol) {
      console.error('No active orchestrator with collaboration protocol found');
      return false;
    }
    
    // Store the current collaboration ID for this workspace (for future reference)
    this.currentCollaborations.set(workspaceId, collaborationId);
    
    // Stop the collaboration using the protocol
    return enhancedOrchestrator.collaborationProtocol.stopCollaboration(collaborationId, workspaceId);
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
    // Create enhanced orchestrator
    await this.createAgent({
      name: 'Enhanced Orchestrator',
      description: 'Advanced coordination agent with sophisticated collaboration protocols',
      type: 'enhanced_orchestrator',
      systemPrompt: 'You are the Enhanced Orchestrator, an advanced coordination agent that uses sophisticated collaboration protocols to orchestrate specialized agents. You can dynamically determine the optimal collaboration mode (sequential, parallel, debate, or critique) based on the task requirements, and coordinate agents to work together efficiently, sharing context and building on each other\'s outputs.',
      model: 'gpt-3.5-turbo',
      provider: 'openai',
      temperature: 0.7,
      maxTokens: 4000,
      tools: ['web_browser'],
      isActive: true
    });
    
    // Create basic orchestrator (as a backup option)
    await this.createAgent({
      name: 'Basic Orchestrator',
      description: 'Simple coordination agent',
      type: 'orchestrator',
      systemPrompt: 'You are the Orchestrator, a coordination agent responsible for delegating tasks to specialized agents. You analyze user requests, break them down into subtasks, and determine which agents should handle each part. After receiving responses from all agents, you synthesize their outputs into a coherent response for the user.',
      model: 'deepseek-reasoner',
      provider: 'deepseek',
      temperature: 0.007,
      maxTokens: 4000,
      tools: ['web_browser'],
      isActive: false
    });
    
    // Create planner agent based on Genspark approach
    await this.createAgent({
      name: 'Planner Agent',
      description: 'Creates detailed step-by-step plans for complex tasks, based on Genspark\'s plan-and-execute approach',
      type: 'planner',
      systemPrompt: 'You are a highly sophisticated Planning Agent specialized in breaking down complex tasks into clear, executable steps. When presented with a goal or task, your primary responsibility is to analyze the task, decompose it into logical steps, ensure steps are clear and actionable, consider dependencies, include necessary tools or resources, anticipate challenges, and structure the plan with clear organization. Format your plans with detailed numbering, specific actions, and tool recommendations for each step.',
      model: 'gpt-3.5-turbo',
      provider: 'openai',
      temperature: 0.7,
      maxTokens: 4000,
      tools: ['plan_execution', 'deep_research', 'web_browser'],
      isActive: true
    });
    
    // Create research agent
    await this.createAgent({
      name: 'Research Agent',
      description: 'Retrieves and analyzes information',
      type: 'research',
      systemPrompt: 'You are the Research Agent, specialized in finding, analyzing, and summarizing information. You have access to web search and can browse web pages to extract relevant information. Provide comprehensive, accurate, and properly cited information.',
      model: 'deepseek-reasoner',
      provider: 'deepseek',
      temperature: 0.007,
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
      model: 'deepseek-coder',
      provider: 'deepseek',
      temperature: 0.007,
      maxTokens: 4000,
      tools: ['code_execution'],
      isActive: true
    });
    
    // Create writer agent
    await this.createAgent({
      name: 'Writer Agent',
      description: 'Creates written content',
      type: 'writer',
      systemPrompt: 'You are the Writer Agent, specialized in creating high-quality written content. You excel at crafting engaging narratives, clear explanations, and persuasive arguments. Adapt your tone, style, and structure based on the specific content needs.',
      model: 'deepseek-chat',
      provider: 'deepseek',
      temperature: 0.007,
      maxTokens: 4000,
      tools: [],
      isActive: true
    });
    
    // Create thinker agent with Chain of Thought reasoning
    await this.createAgent({
      name: 'Thinker Agent',
      description: 'Analyzes content using Chain of Thought (CoT) reasoning',
      type: 'thinker',
      systemPrompt: 'You are a Thinker Agent specializing in Chain of Thought (CoT) reasoning. Your role is to analyze responses, break down complex reasoning into explicit steps, identify assumptions and logical gaps, evaluate evidence quality, consider alternative perspectives, highlight potential biases, and suggest improvements to enhance logical flow. Structure your analysis into clear, numbered reasoning steps and be explicitly metacognitive about your thought process.',
      model: 'deepseek-reasoner',
      provider: 'deepseek',
      temperature: 0.007,
      maxTokens: 4000,
      tools: ['deep_research'],
      isActive: true
    });
  }
  
  private createAgentInstance(agentData: Agent): BaseAgent {
    let agent: BaseAgent;
    
    // Create appropriate agent type
    switch (agentData.type) {
      case 'enhanced_orchestrator':
        agent = new EnhancedOrchestrator(
          agentData,
          this.llmManager,
          memoryManager,
          toolManager
        );
        break;
      case 'orchestrator':
        agent = new Orchestrator(
          agentData,
          this.llmManager,
          memoryManager,
          toolManager
        );
        break;
      case 'planner':
        agent = new PlannerAgent(
          agentData,
          this.llmManager,
          memoryManager,
          toolManager
        );
        break;
      case 'thinker':
        agent = new ThinkerAgent(
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
    // Ensure null values for optional fields that are undefined
    const processedAgentData = {
      ...agentData,
      description: agentData.description ?? null,
      systemPrompt: agentData.systemPrompt ?? null,
      maxTokens: agentData.maxTokens ?? null,
      isActive: agentData.isActive ?? true,
      tools: agentData.tools ?? null,
      createdAt: Date.now()
    };
    
    const newAgent = await storage.createAgent(processedAgentData);
    
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
    console.log(`AgentManager processing message for workspace ${workspaceId}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    try {
      // First try to find an enhanced orchestrator
      let orchestrator: BaseAgent | undefined;
      let fallbackOrchestrator: BaseAgent | undefined;
      
      // Convert values iterator to array to avoid TS downlevelIteration issues
      const agentInstances = Array.from(this.agents.values());
      console.log(`Found ${agentInstances.length} agent instances`);
      
      // First find the enhanced orchestrator if available
      agentInstances.forEach(agent => {
        if (!orchestrator && agent.getType() === 'enhanced_orchestrator' && agent.getConfig().isActive) {
          console.log(`Found active enhanced orchestrator: ${agent.getName()} (${agent.getId()})`);
          orchestrator = agent;
        } else if (!orchestrator && agent.getType() === 'orchestrator' && agent.getConfig().isActive) {
          // Keep as fallback
          console.log(`Found active basic orchestrator as fallback: ${agent.getName()} (${agent.getId()})`);
          fallbackOrchestrator = agent;
        }
      });
      
      // If no enhanced orchestrator, use the fallback
      if (!orchestrator && fallbackOrchestrator) {
        console.log(`Using fallback orchestrator: ${fallbackOrchestrator.getName()} (${fallbackOrchestrator.getId()})`);
        orchestrator = fallbackOrchestrator;
      }
      
      if (!orchestrator) {
        console.error('Could not find any active orchestrator agents. Available agents:');
        agentInstances.forEach(agent => {
          console.log(`- ${agent.getName()} (${agent.getId()}): type=${agent.getType()}, active=${agent.getConfig().isActive}`);
        });
        throw new Error('No active orchestrator agent found. Please activate at least one orchestrator agent in the Agents section.');
      }
      
      console.log(`Selected orchestrator ${orchestrator.getName()} (${orchestrator.getId()}) to process message`);
      
      // Process message through the selected orchestrator
      await orchestrator.process(workspaceId, message);
      console.log(`Message successfully processed by orchestrator ${orchestrator.getName()}`);
    } catch (error) {
      console.error(`Error in AgentManager.processMessage:`, error);
      throw error; // Re-throw for upstream handling
    }
  }
}

export const agentManager = new AgentManager();
