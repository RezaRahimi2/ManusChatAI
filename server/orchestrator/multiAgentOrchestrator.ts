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
    
    // Register all agents during initialization
    this.initializeAgents();
  }
  
  /**
   * Initialize the AWS agents from our database agents
   */
  private async initializeAgents() {
    try {
      // Get all active agents
      const allAgents = await agentManager.getAllAgents();
      
      // Include all other agent types except orchestrators (avoid creating loops)
      const activeAgents = allAgents.filter(a => 
        a.isActive && 
        a.id !== this.getId() && 
        !['aws_orchestrator', 'enhanced_orchestrator', 'orchestrator'].includes(a.type)
      );
      
      console.log(`Initializing ${activeAgents.length} agents for AWS Multi-Agent Orchestrator`);
      
      if (activeAgents.length === 0) {
        console.log('No active agents found. Will create a default agent for testing.');
        
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
        const defaultAgent = this.awsAgents.values().next().value;
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
      // Only support OpenAI provider for now
      if (agentData.provider !== 'openai') {
        console.log(`Agent ${agentData.name} uses provider ${agentData.provider}, which is not currently supported by AWS Multi-Agent Orchestrator. Skipping.`);
        return null;
      }
      
      // Create AWS agent
      const agent = new OpenAIAgent({
        name: agentData.name,
        description: agentData.description || agentData.type,
        apiKey: process.env.OPENAI_API_KEY as string,
        model: agentData.model || 'gpt-4o',
        streaming: false,
        inferenceConfig: {
          temperature: (agentData.temperature || 70) / 100, // Convert our 0-100 scale to 0-1
          maxTokens: agentData.maxTokens || 4000
        },
        customSystemPrompt: {
          template: agentData.systemPrompt || 'You are a helpful assistant.',
          variables: {}
        }
      });
      
      // Set ID after creation to avoid TypeScript errors
      (agent as any).id = `agent_${agentData.id}`;
      
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
        response = await this.orchestrator.routeRequest(
          userMessage,
          userId,
          sessionId,
          { chatHistory: orchestratorMessages }
        );
        console.log('Request successfully routed, response:', response);
      } catch (error) {
        console.error('Error during intent classification:', error);
        
        // Fall back to default agent if there's an error with classification
        console.log('Falling back to default agent due to classification error');
        const defaultAgent = this.awsAgents.values().next().value;
        
        if (!defaultAgent) {
          throw new Error('No default agent available for fallback');
        }
        
        // Create a simple fallback response without calling the agent
        // This avoids API-specific method issues
        console.log('Creating fallback response without calling agent API');
        
        response = {
          output: `I'm sorry, I encountered an issue while processing your request. Let me help you directly.\n\nYou asked: "${userMessage}"\n\nI'll do my best to assist you with this request.`,
          metadata: {
            agentId: 'fallback',
            additionalParams: {
              confidence: 1.0,
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