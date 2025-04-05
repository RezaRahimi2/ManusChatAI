import { Agent, Message } from '@shared/schema';
import { BaseAgent } from './baseAgent';
import { LLMManager } from '../llm/llmManager';
import { MemoryManager } from '../memory/memory';
import { ToolManager } from '../tools/toolManager';
import { storage } from '../storage';
import { broadcastToWorkspace } from '../socket';

/**
 * ThinkerAgent - Specialized in applying Chain of Thought (CoT) reasoning
 * This agent analyzes the responses of other agents and provides deeper insights
 * using structured reasoning steps.
 */
export class ThinkerAgent extends BaseAgent {
  constructor(
    agentData: Agent,
    llmManager: LLMManager,
    memoryManager: MemoryManager,
    toolManager: ToolManager
  ) {
    super(agentData, llmManager, memoryManager, toolManager);
  }
  
  protected async getSystemPrompt(): Promise<string> {
    // Use the agent's customized system prompt if available
    if (this.agentData.systemPrompt) {
      return this.agentData.systemPrompt;
    }
    
    // Default system prompt for the Thinker Agent
    return `You are a specialized Chain of Thought (CoT) reasoning agent that helps analyze and improve responses.

Your primary role is to:
1. Break down complex reasoning into explicit steps
2. Identify assumptions and logical gaps
3. Evaluate the quality of evidence and citations 
4. Consider alternative perspectives or approaches
5. Highlight potential biases or limitations
6. Suggest improvements to enhance logical flow and coherence

Structure your analysis into clear, numbered reasoning steps. Be explicitly metacognitive about your thought process.

When analyzing a response, first present the original content briefly, then provide your chain of thought analysis. 
Finally, provide an improved or enhanced version of the original content that incorporates your insights.

Make your reasoning visible and highlight important connections between ideas. Use phrases like "I'm thinking about...",
"This suggests that...", "An important implication is...", "Let me reconsider..." to make your thought process explicit.`;
  }
  
  async generateResponse(workspaceId: number, contentToAnalyze: string): Promise<string> {
    // Retrieve context from memory
    const contextMessages = await this.getContextMessages(workspaceId);
    
    // Get system prompt
    const systemPrompt = await this.getSystemPrompt();
    
    // Create messages array for the LLM
    const messages = [
      { role: 'system', content: systemPrompt },
      ...contextMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })),
      { 
        role: 'user', 
        content: `Please analyze the following content using Chain of Thought reasoning:

${contentToAnalyze}

1. First, highlight the key claims, arguments, and evidence.
2. Analyze the logical structure and identify any potential flaws or gaps in reasoning.
3. Consider alternative viewpoints or interpretations.
4. Evaluate the overall strength of the reasoning.
5. Provide an enhanced version that addresses any identified issues while preserving the original intent.`
      }
    ];
    
    // Generate response from LLM
    const result = await this.llmManager.generateResponse({
      provider: this.agentData.provider,
      model: this.agentData.model,
      messages,
      temperature: this.agentData.temperature !== null ? this.agentData.temperature : 0.4, // Lower temperature for more analytical responses
      maxTokens: this.agentData.maxTokens !== null ? this.agentData.maxTokens : undefined
    });
    
    return result.choices[0].message.content;
  }
  
  /**
   * Process a message by analyzing it with Chain of Thought reasoning
   */
  async process(workspaceId: number, contentToAnalyze: string): Promise<void> {
    try {
      // Store the content to analyze as a user message
      const message: Message = {
        id: Date.now(),
        workspaceId,
        role: 'user',
        content: contentToAnalyze,
        agentId: null,
        metadata: {},
        createdAt: Date.now()
      };
      
      await storage.createMessage(message);
      await this.saveToMemory(workspaceId, message);
      
      // Generate response with CoT reasoning
      const response = await this.generateResponse(workspaceId, contentToAnalyze);
      
      // Create response message
      const responseMessage: Message = {
        id: Date.now(),
        workspaceId,
        role: 'assistant',
        content: response,
        agentId: this.getId(),
        metadata: { 
          type: 'cot_analysis',
          originalContent: contentToAnalyze.substring(0, 500) // Store a preview of original content
        },
        createdAt: Date.now()
      };
      
      await storage.createMessage(responseMessage);
      await this.saveToMemory(workspaceId, responseMessage);
      
      // Broadcast the response
      broadcastToWorkspace(workspaceId, {
        type: 'message',
        workspaceId,
        message: responseMessage
      });
    } catch (error) {
      console.error(`Error in ThinkerAgent.process:`, error);
      
      // Create error message
      const errorMessage: Message = {
        id: Date.now(),
        workspaceId,
        role: 'system',
        content: `Error in ThinkerAgent: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
        agentId: this.getId(),
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
    }
  }
}