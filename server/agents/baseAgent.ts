import { Agent as DbAgent, type Message } from '@shared/schema';
import { LLMManager } from '../llm/llmManager';
import { MemoryManager } from '../memory/memory';
import { ToolManager } from '../tools/toolManager';
import { storage } from '../storage';
import { broadcastToWorkspace } from '../socket';

// Define interface for LLM messages to match the expected format
interface LLMMessage {
  role: string;
  content: string;
  tool_calls?: any[];
}

export class BaseAgent {
  protected agentData: DbAgent;
  protected llmManager: LLMManager;
  protected memoryManager: MemoryManager;
  protected toolManager: ToolManager;
  
  constructor(
    agentData: DbAgent,
    llmManager: LLMManager,
    memoryManager: MemoryManager,
    toolManager: ToolManager
  ) {
    this.agentData = agentData;
    this.llmManager = llmManager;
    this.memoryManager = memoryManager;
    this.toolManager = toolManager;
  }
  
  getConfig(): DbAgent {
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
    
    // Check if the response contains any tool calls
    const resultMessage = result.choices[0].message;
    const hasToolCalls = resultMessage.tool_calls && resultMessage.tool_calls.length > 0;
    
    if (hasToolCalls) {
      // Process the tool calls
      return this.processToolCalls(workspaceId, resultMessage, messages);
    }
    
    // No tool calls, just extract response content
    const responseContent = resultMessage.content;
    
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
  
  /**
   * Process tool calls returned by the LLM
   */
  private async processToolCalls(workspaceId: number, resultMessage: any, originalMessages: LLMMessage[]): Promise<string> {
    const toolCalls = resultMessage.tool_calls || [];
    
    // Create a thinking message for tool execution
    const thinkingMessage: Message = {
      id: Date.now(),
      workspaceId,
      role: 'thinking',
      content: `Executing ${toolCalls.length} tool(s)...`,
      agentId: this.getId(),
      createdAt: Date.now(),
      metadata: {
        isThinking: true,
        toolCalls: toolCalls.map((tc: any) => tc.function.name)
      }
    };
    
    // Save thinking message - shows the user what's happening
    await storage.createMessage(thinkingMessage);
    
    // Broadcast thinking status message
    broadcastToWorkspace(workspaceId, {
      type: 'message',
      workspaceId,
      message: thinkingMessage
    });
    
    // Process each tool call
    const toolResults = [];
    
    for (const toolCall of toolCalls) {
      try {
        if (toolCall.function && toolCall.function.name) {
          const toolName = toolCall.function.name;
          const toolInstance = this.toolManager.getToolByType(toolName);
          
          if (toolInstance) {
            // Parse the parameters if provided as a string
            let params = toolCall.function.arguments;
            if (typeof params === 'string') {
              try {
                params = JSON.parse(params);
              } catch (error) {
                console.warn(`Could not parse tool arguments as JSON: ${params}`);
                // Keep as string if not valid JSON
              }
            }
            
            // Execute the tool
            console.log(`Executing tool ${toolName} with params:`, params);
            const result = await toolInstance.execute(params);
            
            // Record the tool result
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolName,
              content: typeof result === 'string' ? result : JSON.stringify(result)
            });
            
            // Create a tool execution message for memory
            const toolExecutionMessage: Message = {
              id: Date.now() + toolResults.length,
              workspaceId,
              role: 'tool',
              content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
              agentId: this.getId(),
              createdAt: Date.now(),
              metadata: {
                toolName,
                toolCallId: toolCall.id
              }
            };
            
            // Save tool execution to memory
            await storage.createMessage(toolExecutionMessage);
            await this.saveToMemory(workspaceId, toolExecutionMessage);
            
            // Broadcast tool execution message
            broadcastToWorkspace(workspaceId, {
              type: 'message',
              workspaceId,
              message: toolExecutionMessage
            });
          } else {
            throw new Error(`Tool ${toolName} not found`);
          }
        } else {
          throw new Error('Invalid tool call format');
        }
      } catch (error) {
        console.error(`Error executing tool:`, error);
        
        // Record the error as a tool result
        toolResults.push({
          tool_call_id: toolCall.id || 'unknown',
          role: 'tool',
          name: toolCall.function?.name || 'unknown',
          content: `Error: ${error instanceof Error ? error.message : String(error)}`
        });
        
        // Create an error message for the tool execution
        const errorMessage: Message = {
          id: Date.now() + toolResults.length,
          workspaceId,
          role: 'system',
          content: `Error executing tool ${toolCall.function?.name || 'unknown'}: ${error instanceof Error ? error.message : String(error)}`,
          agentId: this.getId(),
          createdAt: Date.now(),
          metadata: {
            error: true,
            toolError: true,
            toolName: toolCall.function?.name
          }
        };
        
        // Save error message to memory
        await storage.createMessage(errorMessage);
        await this.saveToMemory(workspaceId, errorMessage);
        
        // Broadcast error message
        broadcastToWorkspace(workspaceId, {
          type: 'message',
          workspaceId,
          message: errorMessage
        });
      }
    }
    
    // Add the assistant's message and tool results to the original messages
    const updatedMessages = [
      ...originalMessages,
      {
        role: 'assistant',
        content: resultMessage.content,
        tool_calls: toolCalls
      },
      ...toolResults
    ];
    
    // Generate a final response based on tool results
    const finalResult = await this.llmManager.generateResponse({
      provider: this.agentData.provider,
      model: this.agentData.model,
      messages: updatedMessages,
      temperature: this.agentData.temperature ? this.agentData.temperature / 100 : 0.7,
      maxTokens: this.agentData.maxTokens || undefined
    });
    
    // Save the final response
    const finalResponseMessage: Message = {
      id: Date.now() + 1000, // Ensure unique ID
      workspaceId,
      role: 'assistant',
      content: finalResult.choices[0].message.content,
      agentId: this.getId(),
      createdAt: Date.now(),
      metadata: {
        usedTools: toolCalls.map((tc: any) => tc.function.name)
      }
    };
    
    await storage.createMessage(finalResponseMessage);
    await this.saveToMemory(workspaceId, finalResponseMessage);
    
    // Broadcast the final response
    broadcastToWorkspace(workspaceId, {
      type: 'message',
      workspaceId,
      message: finalResponseMessage
    });
    
    return finalResponseMessage.content;
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
