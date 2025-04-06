import { Agent as DbAgent, type Message } from '@shared/schema';
import { LLMManager } from '../llm/llmManager';
import { MemoryManager } from '../memory/memory';
import { ToolManager } from '../tools/toolManager';
import { storage } from '../storage';
import { broadcastToWorkspace } from '../socket';
import { BaseAgent } from './baseAgent';
import { agnoClient } from '../agno/agnoClient';

/**
 * AgnoAgent - Agent implementation using the Agno library
 * This agent uses the Agno Python library via a bridge for enhanced capabilities.
 */
export class AgnoAgent extends BaseAgent {
  private agnoAgentId: string | undefined = undefined;
  private agnoModelId: string | undefined = undefined;
  
  constructor(
    agentData: DbAgent,
    llmManager: LLMManager,
    memoryManager: MemoryManager,
    toolManager: ToolManager
  ) {
    super(agentData, llmManager, memoryManager, toolManager);
    
    // Initialize the Agno agent
    this.initializeAgno();
  }
  
  /**
   * Initialize the Agno agent with the provided configuration
   */
  private async initializeAgno(): Promise<void> {
    try {
      // Initialize Agno model
      const modelResponse = await agnoClient.createModel({
        id: `model-${this.agentData.id}`,
        name: `${this.agentData.name} Model`,
        type: this.mapProviderToAgnoType(this.agentData.provider),
        config: {
          model: this.agentData.model,
          temperature: this.agentData.temperature ? this.agentData.temperature / 100 : 0.7,
          maxTokens: this.agentData.maxTokens ? this.agentData.maxTokens : undefined,
          systemPrompt: this.agentData.systemPrompt || undefined
        }
      });
      
      this.agnoModelId = modelResponse.id;
      
      // Get available tools
      const tools = await this.toolManager.getToolsForAgent(this.agentData);
      
      // Register tools with Agno
      const agnoToolIds: string[] = [];
      
      for (const tool of tools) {
        try {
          const toolResponse = await agnoClient.createTool({
            id: `tool-${tool.name}-${this.agentData.id}`,
            name: tool.name,
            description: tool.description || undefined,
            parameters: tool.parameters
          });
          
          agnoToolIds.push(toolResponse.id);
        } catch (error) {
          console.error(`Error registering tool ${tool.name} with Agno:`, error);
        }
      }
      
      // Initialize Agno agent
      const agentResponse = await agnoClient.createAgent({
        id: `agent-${this.agentData.id}`,
        name: this.agentData.name,
        modelId: this.agnoModelId,
        systemPrompt: this.agentData.systemPrompt || undefined,
        tools: agnoToolIds
      });
      
      this.agnoAgentId = agentResponse.id;
      
      console.log(`Successfully initialized Agno agent ${this.agnoAgentId}`);
    } catch (error) {
      console.error('Error initializing Agno agent:', error);
    }
  }
  
  /**
   * Map our provider to Agno's model type
   */
  private mapProviderToAgnoType(provider: string): 'openai' | 'anthropic' {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'openai';
      case 'anthropic':
        return 'anthropic';
      default:
        // Default to OpenAI if the provider is not supported by Agno
        return 'openai';
    }
  }
  
  /**
   * Override: Generate a response using the Agno agent
   */
  async generateResponse(workspaceId: number, userMessage: string): Promise<string> {
    // If Agno agent is not initialized, fallback to the default implementation
    if (!this.agnoAgentId || !this.agnoModelId) {
      console.warn('Agno agent not initialized, falling back to default implementation');
      return super.generateResponse(workspaceId, userMessage);
    }
    
    try {
      // Broadcast thinking state
      broadcastToWorkspace(workspaceId, {
        type: 'thinking',
        thinking: true,
        agent: this.getId()
      });
      
      // Run the Agno agent
      const response = await agnoClient.runAgent(
        this.agnoAgentId,
        userMessage,
        workspaceId
      );
      
      // End thinking state
      broadcastToWorkspace(workspaceId, {
        type: 'thinking',
        thinking: false,
        agent: this.getId()
      });
      
      // Extract response content
      const responseContent = response.content;
      
      // Save to memory
      const responseMessage: Message = {
        id: Date.now(),
        workspaceId,
        role: 'assistant',
        content: responseContent,
        agentId: this.getId(),
        createdAt: Date.now(),
        metadata: {}
      };
      
      await storage.createMessage(responseMessage);
      await this.saveToMemory(workspaceId, responseMessage);
      
      // Broadcast the new message
      broadcastToWorkspace(workspaceId, {
        type: 'message',
        workspaceId,
        message: responseMessage
      });
      
      return responseContent;
    } catch (error) {
      console.error('Error generating response with Agno agent:', error);
      
      // End thinking state
      broadcastToWorkspace(workspaceId, {
        type: 'thinking',
        thinking: false,
        agent: this.getId()
      });
      
      // Fallback to default implementation
      return super.generateResponse(workspaceId, userMessage);
    }
  }
}