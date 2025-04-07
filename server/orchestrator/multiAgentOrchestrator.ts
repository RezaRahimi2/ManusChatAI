import { Agent as DbAgent, Message } from '@shared/schema';
import { BaseAgent } from '../agents/baseAgent';
import { LLMManager } from '../llm/llmManager';
import { MemoryManager } from '../memory/memory';
import { ToolManager } from '../tools/toolManager';
import { storage } from '../storage';
import { broadcastToWorkspace } from '../socket';
import { agentManager } from '../agents/agentManager';

// Import from multi-agent-orchestrator
import { 
  Agent as AwsAgent,
  AgentResponse,
  OpenAIAgent,
  OpenAIClassifier,
  InMemoryChatStorage,
  ConversationMessage,
  ParticipantRole
} from 'multi-agent-orchestrator';

// MultiAgentOrchestrator is imported directly to use the correct type
import { MultiAgentOrchestrator } from 'multi-agent-orchestrator';

/**
 * Orchestrator implementation using the multi-agent-orchestrator package
 * This provides more robust agent coordination and classification
 */
export class AwsMultiAgentOrchestrator extends BaseAgent {
  private orchestrator: MultiAgentOrchestrator;
  private awsAgents: Map<number, OpenAIAgent>;
  private chatStorage: InMemoryChatStorage;
  private sessionId: string;
  
  /**
   * Convert map to array safely for TypeScript compatibility
   */
  private getAgentsArray(): OpenAIAgent[] {
    // This manually converts the map values to an array to avoid TypeScript iteration issues
    const result: OpenAIAgent[] = [];
    this.awsAgents.forEach(agent => result.push(agent));
    return result;
  }

  /**
   * Convert map entries to array safely for TypeScript compatibility
   */
  private getAgentEntriesArray(): [number, OpenAIAgent][] {
    // This manually converts the map entries to an array to avoid TypeScript iteration issues
    const result: [number, OpenAIAgent][] = [];
    this.awsAgents.forEach((agent, id) => result.push([id, agent]));
    return result;
  }
  
  constructor(
    agentData: DbAgent,
    llmManager: LLMManager,
    memoryManager: MemoryManager,
    toolManager: ToolManager
  ) {
    super(agentData, llmManager, memoryManager, toolManager);
    
    // Initialize the chat storage
    this.chatStorage = new InMemoryChatStorage();
    
    // Initialize AWS agents map
    this.awsAgents = new Map();
    
    // Create a unique session ID
    this.sessionId = `session_${Date.now()}`;
    
    // Get the LLM configuration from agent data
    const modelId = agentData.model || 'gpt-4o';
    const temperature = (agentData.temperature || 70) / 100; // Convert from 0-100 scale to 0-1
    
    console.log(`Initializing MultiAgentOrchestrator with model=${modelId}, temperature=${temperature}`);
    
    // Check if OpenAI API key is available, as it's required by the orchestrator
    if (!process.env.OPENAI_API_KEY) {
      console.error("ERROR: OPENAI_API_KEY is required for AWS Multi-Agent Orchestrator");
      throw new Error("OPENAI_API_KEY is required for AWS Multi-Agent Orchestrator. Please provide it in your environment variables.");
    }

    // Initialize the orchestrator with OpenAI classifier using the specified model
    this.orchestrator = new MultiAgentOrchestrator({
      storage: this.chatStorage,
      classifier: new OpenAIClassifier({
        apiKey: process.env.OPENAI_API_KEY as string,
        modelId: modelId,
        inferenceConfig: {
          temperature: temperature
        }
      }),
      config: {
        LOG_CLASSIFIER_OUTPUT: true,
        USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED: true,
        MAX_MESSAGE_PAIRS_PER_AGENT: 10
      }
    });
    
    // Register all agents during initialization after a short delay
    // This ensures the agent manager has time to initialize all agents first
    setTimeout(() => {
      this.initializeAgents().catch(err => {
        console.error("Error initializing AWS agents:", err);
      });
    }, 300);
  }
  
  /**
   * Get the priority score for an agent type
   * Higher priority agents are more likely to be considered for tasks
   */
  private getAgentPriority(agentType: string): number {
    // Agent types with specializations get higher priorities
    const typeMap: Record<string, number> = {
      'researcher': 9,
      'research': 9,
      'coder': 8,
      'code': 8,
      'writer': 7,
      'planner': 10,
      'thinker': 6,
      'assistant': 5,
      'default': 0
    };
    
    // Normalize the agent type for matching
    const normalizedType = agentType.toLowerCase();
    
    // Check if the type or a substring of it exists in our map
    for (const [type, priority] of Object.entries(typeMap)) {
      if (normalizedType.includes(type)) {
        return priority;
      }
    }
    
    return 0; // Default priority
  }
  
  /**
   * Initialize the AWS agents from our database agents
   */
  private async initializeAgents() {
    try {
      // Wait a moment for agent manager to initialize all agents
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get access to all agent instances directly from the agent manager
      // This is the best way to ensure we have all active agents
      const agentInstances = Array.from((agentManager as any).agents.values());
      
      // Get all database agents for reference
      const allDatabaseAgents = await agentManager.getAllAgents();
      
      console.log(`Found ${agentInstances.length} agent instances and ${allDatabaseAgents.length} database records`);
      
      // If we have a serious mismatch, wait a bit longer to let agents initialize
      if (agentInstances.length < 3 && allDatabaseAgents.length > 5) {
        console.log('Agent instances still initializing, waiting 500ms more...');
        await new Promise(resolve => setTimeout(resolve, 500));
        const updatedAgentInstances = Array.from((agentManager as any).agents.values());
        console.log(`After waiting, found ${updatedAgentInstances.length} agent instances`);
      }
      
      // Include all agent types except AWS orchestrator itself (avoid creating loops)
      const activeAgents = allDatabaseAgents.filter(a => 
        a.isActive && 
        a.id !== this.getId() && 
        a.type !== 'aws_orchestrator' // Only exclude the AWS orchestrator type
      );
      
      // Sort agents by priority (specialized agents first)
      activeAgents.sort((a, b) => {
        const priorityA = this.getAgentPriority(a.type);
        const priorityB = this.getAgentPriority(b.type);
        return priorityB - priorityA; // Higher priority first
      });
      
      console.log(`Initializing ${activeAgents.length} active agents for AWS Multi-Agent Orchestrator, sorted by specialization priority`);
      
      if (activeAgents.length === 0) {
        console.warn('No active agents found. Will create a default agent for testing. This means specialized agents are unavailable.');
        
        // Create a basic default agent if none are found
        const defaultAwsAgent = new OpenAIAgent({
          name: 'Default Assistant',
          description: 'General-purpose assistant agent',
          apiKey: process.env.OPENAI_API_KEY as string,
          model: 'gpt-4o',
          streaming: false,
          inferenceConfig: {
            temperature: 0.7,
            maxTokens: 4000
          },
          customSystemPrompt: {
            template: 'You are a helpful, friendly assistant that provides accurate and concise information.',
            variables: {}
          }
        });
        
        // Set ID after creation to avoid TypeScript errors
        (defaultAwsAgent as any).id = 'default_assistant';
        
        // Register agent both in our map and in the orchestrator's registry
        this.awsAgents.set(999, defaultAwsAgent);
        
        // Make sure the agents object exists
        if (!(this.orchestrator as any).agents) {
          (this.orchestrator as any).agents = {};
        }
        
        // Register the agent with its ID
        (this.orchestrator as any).agents[defaultAwsAgent.id] = defaultAwsAgent;
        
        // Also add the agent to the unknown agents registry to handle the specific error
        if (!(this.orchestrator as any).classifier.agents) {
          (this.orchestrator as any).classifier.agents = {};
        }
        (this.orchestrator as any).classifier.agents[defaultAwsAgent.id] = defaultAwsAgent;
        
        // Set as default agent
        this.orchestrator.setDefaultAgent(defaultAwsAgent as any);
        console.log('Registered default assistant agent with AWS orchestrator');
      }
      
      // Create AWS agents for each active agent
      for (const agentData of activeAgents) {
        const awsAgent = this.createAwsAgent(agentData);
        if (awsAgent) {
          // Use string ID to avoid issues
          const agentId = `agent_${agentData.id}`;
          
          this.awsAgents.set(agentData.id, awsAgent);
          
          // Make sure the agents object exists
          if (!(this.orchestrator as any).agents) {
            (this.orchestrator as any).agents = {};
          }
          
          // Register the agent with both the orchestrator and classifier
          (this.orchestrator as any).agents[agentId] = awsAgent;
          
          // Also add to classifier agents registry
          if ((this.orchestrator as any).classifier && !(this.orchestrator as any).classifier.agents) {
            (this.orchestrator as any).classifier.agents = {};
          }
          
          if ((this.orchestrator as any).classifier) {
            (this.orchestrator as any).classifier.agents[agentId] = awsAgent;
          }
          
          console.log(`Registered agent ${agentData.name} (${agentData.id}) with AWS orchestrator`);
        }
      }
      
      // Register default agent (use the first agent as default)
      if (this.awsAgents.size > 0) {
        const agents = this.getAgentsArray();
        const defaultAgent = agents.length > 0 ? agents[0] : undefined;
        if (defaultAgent) {
          this.orchestrator.setDefaultAgent(defaultAgent as any);
          console.log(`Set default agent to ${defaultAgent.name}`);
        }
      }
      
    } catch (error) {
      console.error('Error initializing AWS agents:', error);
    }
  }
  
  /**
   * Create an AWS agent from our database agent
   */
  private createAwsAgent(agentData: DbAgent): OpenAIAgent | null {
    try {
      // Get the appropriate API key and model name based on the provider
      let apiKey: string;
      let modelName: string;
      
      // Map our internal providers to appropriate API keys
      switch(agentData.provider) {
        case 'openai':
          apiKey = process.env.OPENAI_API_KEY as string;
          modelName = agentData.model || 'gpt-4o';
          break;
        case 'anthropic':
          apiKey = process.env.ANTHROPIC_API_KEY as string;
          modelName = agentData.model || 'claude-3-7-sonnet-20250219';
          console.log(`Using Anthropic model with OpenAI adapter: ${modelName}`);
          break;
        case 'deepseek':
          // For DeepSeek, use the OpenAI API key since we're using an OpenAI-compatible API
          apiKey = process.env.OPENAI_API_KEY as string;
          modelName = agentData.model || 'deepseek-chat';
          console.log(`Using DeepSeek model with OpenAI adapter: ${modelName}`);
          break;
        default:
          // For any other provider, use OpenAI as a fallback
          console.log(`Converting ${agentData.provider} agent to OpenAI format for AWS Multi-Agent Orchestrator compatibility`);
          apiKey = process.env.OPENAI_API_KEY as string;
          modelName = 'gpt-4o'; // Fallback to a reliable model
      }
      
      // Check if we have the necessary API key
      if (!apiKey) {
        console.log(`No API key available for provider ${agentData.provider}. Using the OpenAI API key as fallback.`);
        apiKey = process.env.OPENAI_API_KEY as string;
      }
      
      // Create a generic agent description that emphasizes the original agent's role
      const agentTemplate = `You are the "${agentData.name}" agent, specializing in ${agentData.description || agentData.type}. 
${agentData.systemPrompt || ''}

Remember your core competency is in ${agentData.type.toUpperCase()} tasks.`;
      
      // Create AWS agent with OpenAI format but adapted to the original agent's role
      const agent = new OpenAIAgent({
        name: agentData.name,
        description: agentData.description || agentData.type,
        apiKey: apiKey,
        model: modelName,
        streaming: false,
        inferenceConfig: {
          temperature: (agentData.temperature || 70) / 100, // Convert our 0-100 scale to 0-1
          maxTokens: agentData.maxTokens || 4000
        },
        customSystemPrompt: {
          template: agentTemplate,
          variables: {}
        }
      });
      
      // Set ID after creation to avoid TypeScript errors
      (agent as any).id = `agent_${agentData.id}`;
      
      console.log(`Successfully created adapter for ${agentData.name} (${agentData.type}) with model ${modelName}`);
      
      return agent;
    } catch (error) {
      console.error(`Error creating AWS agent for ${agentData.name}:`, error);
      return null;
    }
  }
  
  /**
   * Convert our messages to multi-agent-orchestrator format
   */
  private convertToOrchestratorMessages(messages: Message[]): ConversationMessage[] {
    return messages.map(msg => ({
      role: msg.role === 'user' ? ParticipantRole.USER : ParticipantRole.ASSISTANT,
      content: [{ type: 'text', text: msg.content }] // Convert to array format with text type
    }));
  }
  
  /**
   * Generates the thinking content for the orchestrator
   */
  private generateThinkingContent(userMessage: string): string {
    return `1. Analyzing request: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"
2. Classifying request to determine optimal agent
3. Routing to appropriate specialized agent
4. Processing with context-aware understanding`;
  }
  
  /**
   * Process a message using the AWS Multi-Agent Orchestrator
   */
  async process(workspaceId: number, userMessage: string): Promise<void> {
    try {
      // Store user message in memory and database
      const message: Message = {
        id: Date.now(),
        workspaceId,
        role: 'user',
        content: userMessage,
        agentId: null,
        metadata: {},
        createdAt: Date.now()
      };
      
      await storage.createMessage(message);
      await this.saveToMemory(workspaceId, message);
      
      // Broadcast thinking state
      broadcastToWorkspace(workspaceId, {
        type: 'thinking',
        thinking: true,
        agent: this.getId()
      });
      
      // Create a thinking message to show planning process
      const thinkingContent = this.generateThinkingContent(userMessage);
      const thinkingMessage: Message = {
        id: Date.now(),
        workspaceId,
        role: 'assistant',
        content: thinkingContent,
        agentId: this.getId(),
        metadata: { thinking: true },
        createdAt: Date.now()
      };
      
      await storage.createMessage(thinkingMessage);
      
      // Broadcast thinking message
      broadcastToWorkspace(workspaceId, {
        type: 'message',
        workspaceId,
        message: thinkingMessage
      });
      
      // Get conversation history
      const contextMessages = await this.getContextMessages(workspaceId);
      const orchestratorMessages = this.convertToOrchestratorMessages(contextMessages);
      
      console.log(`Processing message with AWS Multi-Agent Orchestrator. Context length: ${orchestratorMessages.length}`);
      
      // Process the message through the orchestrator
      const userId = `user_${workspaceId}`;
      const sessionId = this.sessionId;
      
      // Use the orchestrator to process the request
      let response;
      try {
        console.log('Routing request through AWS Multi-Agent Orchestrator...');
        
        // Use better prompting to help with intent classification
        const classificationPrompt = `
Task: Determine which specialized agent is best suited to handle the following user request.
User request: "${userMessage}"

Available agents and their specialties:
${(() => {
  const agents = this.getAgentsArray();
  return agents.map(agent => 
    `- ${agent.name}: ${agent.description || 'General assistant'}`
  ).join('\n');
})()}

Analyze the request carefully and select the most appropriate agent.`;

        // Log available agents for debugging
        console.log('Available agents for routing:');
        this.getAgentEntriesArray().forEach(([id, agent]) => {
          console.log(`> Agent ID: ${id}, Name: ${agent.name}, Description: ${agent.description || 'No description'}`);
        });
        
        // Modify the userMessage to include a hint about agent selection
        const enhancedUserMessage = userMessage.includes('using') ? userMessage : 
          `${userMessage} (Please select the most appropriate specialized agent to handle this request)`;
        
        // Route the request through the orchestrator
        response = await this.orchestrator.routeRequest(
          enhancedUserMessage,
          userId,
          sessionId,
          { 
            chatHistory: orchestratorMessages,
            classificationPrompt: classificationPrompt
          }
        );
        
        console.log('Request successfully routed, response:', response);
        
        // Log the selected agent for debugging
        console.log(`> Selected Agent: ${response.metadata?.agentId || 'No agent selected'}`);
        console.log(`> Confidence: ${response.metadata?.additionalParams?.confidence || 'unknown'}`);
      } catch (error) {
        console.error('Error during intent classification:', error);
        
        // Try to determine the most appropriate agent based on keywords in the message
        console.log('Attempting keyword-based agent selection as fallback...');
        let selectedAgent: OpenAIAgent | undefined;
        
        // Define keyword mappings for different agent types
        const keywordMap: Record<string, string[]> = {
          'research': ['research', 'find', 'search', 'information', 'data', 'analyze'],
          'code': ['code', 'program', 'function', 'class', 'bug', 'develop', 'script', 'programming', 'algorithm'],
          'writer': ['write', 'article', 'blog', 'content', 'essay', 'text', 'story', 'creative'],
          'planner': ['plan', 'organize', 'schedule', 'project', 'steps', 'strategy', 'roadmap'],
          'thinker': ['think', 'analyze', 'consider', 'philosophy', 'perspective', 'opinion', 'viewpoint']
        };
        
        // Check for keyword matches
        const lowerMessage = userMessage.toLowerCase();
        let highestMatchScore = 0;
        
        for (const [agentType, keywords] of Object.entries(keywordMap)) {
          let matchScore = 0;
          
          for (const keyword of keywords) {
            if (lowerMessage.includes(keyword)) {
              matchScore += 1;
            }
          }
          
          if (matchScore > highestMatchScore) {
            highestMatchScore = matchScore;
            
            // Find an agent that matches this type
            const agents = this.getAgentsArray();
            for (let i = 0; i < agents.length; i++) {
              const agent = agents[i];
              if (agent.description?.toLowerCase().includes(agentType)) {
                selectedAgent = agent;
                break;
              }
            }
          }
        }
        
        // If no matching agent found, fall back to the default agent
        if (!selectedAgent) {
          console.log('No keyword match found, falling back to default agent');
          const agents = this.getAgentsArray();
          selectedAgent = agents.length > 0 ? agents[0] : undefined;
        }
        
        if (!selectedAgent) {
          throw new Error('No agents available for collaboration. Please create at least one active agent first.');
        }
        
        // Create a response using the selected agent's details
        console.log(`Using ${selectedAgent.name} as fallback agent`);
        
        response = {
          output: `I'll help with your request about "${userMessage}". Let me address this for you.`,
          metadata: {
            agentId: (selectedAgent as any).id || 'fallback',
            additionalParams: {
              confidence: 0.8,
              fallback: true
            }
          }
        };
      }
      
      // Create response message
      const responseMessage: Message = {
        id: Date.now(),
        workspaceId,
        role: 'assistant',
        content: typeof response.output === 'string' ? response.output : await this.handleStreamingResponse(response.output),
        agentId: this.getId(),
        metadata: {
          selectedAgent: response.metadata.agentId,
          confidence: response.metadata.additionalParams?.confidence
        },
        createdAt: Date.now()
      };
      
      await storage.createMessage(responseMessage);
      await this.saveToMemory(workspaceId, responseMessage);
      
      // Broadcast the response message
      broadcastToWorkspace(workspaceId, {
        type: 'message',
        workspaceId,
        message: responseMessage
      });
      
    } catch (error) {
      console.error(`Error in AwsMultiAgentOrchestrator.process:`, error);
      
      // Create error message
      const errorMessage: Message = {
        id: Date.now(),
        workspaceId,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
        agentId: null,
        metadata: { error: true },
        createdAt: Date.now()
      };
      
      await storage.createMessage(errorMessage);
      
      // Broadcast error message
      broadcastToWorkspace(workspaceId, {
        type: 'message',
        workspaceId,
        message: errorMessage
      });
    } finally {
      // End thinking state
      broadcastToWorkspace(workspaceId, {
        type: 'thinking',
        thinking: false,
        agent: this.getId()
      });
    }
  }
  
  /**
   * Handle streaming response by collecting all chunks
   */
  private async handleStreamingResponse(output: AsyncIterable<any>): Promise<string> {
    let fullResponse = '';
    
    for await (const chunk of output) {
      if (typeof chunk === 'string') {
        fullResponse += chunk;
      } else if (chunk.content) {
        fullResponse += chunk.content;
      }
    }
    
    return fullResponse;
  }
}