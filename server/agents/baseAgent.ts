import { Agent, type Message } from '@shared/schema';
import { LLMManager } from '../llm/llmManager';
import { MemoryManager } from '../memory/memory';
import { ToolManager } from '../tools/toolManager';
import { storage } from '../storage';
import { broadcastToWorkspace } from '../socket';

export class BaseAgent {
  protected agentData: Agent;
  protected llmManager: LLMManager;
  protected memoryManager: MemoryManager;
  protected toolManager: ToolManager;
  
  constructor(
    agentData: Agent,
    llmManager: LLMManager,
    memoryManager: MemoryManager,
    toolManager: ToolManager
  ) {
    this.agentData = agentData;
    this.llmManager = llmManager;
    this.memoryManager = memoryManager;
    this.toolManager = toolManager;
  }
  
  getConfig(): Agent {
    return this.agentData;
  }
  
  getId(): number {
    return this.agentData.id;
  }
  
  getName(): string {
    return this.agentData.name;
  }
  
  getType(): string {
    return this.agentData.type;
  }
  
  protected async getSystemPrompt(): Promise<string> {
    return this.agentData.systemPrompt || '';
  }
  
  protected async getContextMessages(workspaceId: number): Promise<Message[]> {
    // Get relevant messages from memory
    const shortTermMemory = await this.memoryManager.getShortTermMemory(workspaceId);
    
    // Get relevant vector memories if needed
    // Add vector memories to context if similarity is high enough
    
    // Get any additional context from deep research, stored as system messages
    const deepResearchContext: Message[] = [];
    const lastUserMessage = [...shortTermMemory].reverse().find(msg => msg.role === 'user');
    
    if (lastUserMessage) {
      const deepResearch = this.toolManager.getToolByType('deep_research');
      if (deepResearch) {
        try {
          const researchContext = await deepResearch.execute({
            action: 'retrieve_context',
            query: lastUserMessage.content,
            workspaceId: workspaceId,
            topK: 3  // Limit to avoid context overflow
          });
          
          if (researchContext && typeof researchContext === 'string' && researchContext.trim().length > 0) {
            deepResearchContext.push({
              id: Date.now() + 1,
              workspaceId,
              role: 'system',
              content: `Relevant historical context:\n${researchContext}`,
              createdAt: Date.now(),
              agentId: null,
              metadata: { source: 'deep_research' }
            });
          }
        } catch (error) {
          console.error('Error retrieving deep research context:', error);
        }
      }
    }
    
    // Combine short-term memory with deep research context
    return [...shortTermMemory, ...deepResearchContext];
  }
  
  protected async saveToMemory(workspaceId: number, message: Message): Promise<void> {
    // Save to short-term memory
    await this.memoryManager.addToShortTermMemory(workspaceId, message);
    
    // Save to vector memory if needed
    if (message.role !== 'system') {
      await this.memoryManager.addToVectorMemory(workspaceId, message);
    }
    
    // If the deep research tool is available, save the message there as well
    const deepResearch = this.toolManager.getToolByType('deep_research');
    if (deepResearch && message.content.trim().length > 0) {
      try {
        await deepResearch.execute({
          action: 'store',
          query: message.content,
          metadata: {
            type: message.role === 'user' ? 'user_query' : 'agent_response',
            workspaceId: workspaceId,
            agentId: message.agentId || null,
            messageId: message.id,
            timestamp: message.createdAt
          },
          collection: 'agent_interactions'
        });
      } catch (error) {
        console.error('Error storing message in deep research:', error);
      }
    }
  }
  
  async generateResponse(workspaceId: number, userMessage: string): Promise<string> {
    // Get system prompt
    const systemPrompt = await this.getSystemPrompt();
    
    // Get context from memory
    const contextMessages = await this.getContextMessages(workspaceId);
    
    // For DeepSeek models, we need to make sure system messages are properly placed
    const isDeepSeek = this.agentData.provider === 'deepseek';
    
    // Extract system messages from context
    const systemMessages = contextMessages.filter(msg => msg.role === 'system');
    const nonSystemMessages = contextMessages.filter(msg => msg.role !== 'system');
    
    // Prepare messages for LLM based on provider requirements
    let messages;
    if (isDeepSeek) {
      // For DeepSeek: Combine all system messages into one at the beginning
      const allSystemContent = [
        systemPrompt, 
        ...systemMessages.map(msg => msg.content)
      ].filter(content => content && content.trim().length > 0).join('\n\n');
      
      messages = [
        { role: 'system', content: allSystemContent || 'You are a helpful assistant.' },
        ...nonSystemMessages,
        { role: 'user', content: userMessage }
      ];
    } else {
      // For other providers: Standard format
      messages = [
        { role: 'system', content: systemPrompt },
        ...contextMessages,
        { role: 'user', content: userMessage }
      ];
    }
    
    // Get available tools
    const tools = await this.toolManager.getToolsForAgent(this.agentData);
    
    // Generate response from LLM
    let result;
    try {
      // Broadcast thinking state
      broadcastToWorkspace(workspaceId, {
        type: 'thinking',
        thinking: true,
        agent: this.getId()
      });
      
      result = await this.llmManager.generateResponse({
        provider: this.agentData.provider,
        model: this.agentData.model,
        messages,
        temperature: this.agentData.temperature ? this.agentData.temperature / 100 : 0.7,
        maxTokens: this.agentData.maxTokens || undefined,
        tools: tools.length > 0 ? tools : undefined
      });
    } finally {
      // End thinking state
      broadcastToWorkspace(workspaceId, {
        type: 'thinking',
        thinking: false,
        agent: this.getId()
      });
    }
    
    // Extract response content
    const responseContent = result.choices[0].message.content;
    
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
  }
  
  async process(workspaceId: number, userMessage: string): Promise<void> {
    try {
      // Store user message in memory and database
      const message: Message = {
        id: Date.now(),
        workspaceId,
        role: 'user',
        content: userMessage,
        createdAt: Date.now(),
        agentId: null,
        metadata: {}
      };
      
      await storage.createMessage(message);
      await this.saveToMemory(workspaceId, message);
      
      // Generate response
      await this.generateResponse(workspaceId, userMessage);
    } catch (error) {
      console.error(`Error processing message with agent ${this.getName()}:`, error);
      
      // Create error message
      const errorMessage: Message = {
        id: Date.now(),
        workspaceId,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
        createdAt: Date.now(),
        agentId: null,
        metadata: { error: true }
      };
      
      await storage.createMessage(errorMessage);
      
      // Broadcast error message
      broadcastToWorkspace(workspaceId, {
        type: 'message',
        workspaceId,
        message: errorMessage
      });
    }
  }
}
