import { Agent, Message } from '@shared/schema';
import { BaseAgent } from './baseAgent';
import { LLMManager } from '../llm/llmManager';
import { MemoryManager } from '../memory/memory';
import { ToolManager } from '../tools/toolManager';
import { storage } from '../storage';
import { broadcastToWorkspace } from '../socket';

/**
 * PlannerAgent - A specialized agent for breaking down complex tasks into step-by-step plans
 * Based on the plan-and-execute pattern used by Genspark.ai's Super Agent
 */
export class PlannerAgent extends BaseAgent {
  constructor(
    agentData: Agent,
    llmManager: LLMManager,
    memoryManager: MemoryManager,
    toolManager: ToolManager
  ) {
    super(agentData, llmManager, memoryManager, toolManager);
  }
  
  protected async getSystemPrompt(): Promise<string> {
    // Override with specialized planner prompt if not provided
    if (!this.agentData.systemPrompt) {
      return `You are a highly sophisticated Planning Agent specialized in breaking down complex tasks into clear, 
executable steps. When presented with a goal or task, your primary responsibility is to:

1. Analyze the task to understand the objective and constraints
2. Decompose the task into a logical sequence of steps
3. Ensure steps are clear, specific, and actionable
4. Consider dependencies between steps
5. Include necessary tools or resources for each step
6. Anticipate potential challenges and provide contingency options
7. Structure the plan with clear numbering and organization

When creating plans:
- Be thorough yet concise
- Make each step specific and actionable
- Consider the most efficient approach
- Provide context for why certain steps are necessary
- Ensure all necessary aspects of the task are covered
- Format your response as a clear, numbered plan with main steps and sub-steps when needed
- For each step, indicate any tools or specific expertise that might be required

Remember: Your goal is to create plans that any user could follow to accomplish their objective, regardless of their expertise level.`;
    }
    
    return this.agentData.systemPrompt;
  }
  
  async generateResponse(workspaceId: number, userMessage: string): Promise<string> {
    // First, let's check if this is a request for planning or for plan execution
    const isExecutionRequest = await this.isPlanExecutionRequest(userMessage);
    
    if (isExecutionRequest) {
      return this.executePlan(workspaceId, userMessage);
    } else {
      return this.createPlan(workspaceId, userMessage);
    }
  }
  
  /**
   * Determine if the user message is requesting plan execution or creation
   */
  private async isPlanExecutionRequest(userMessage: string): Promise<boolean> {
    // Check for execution keywords
    const executionKeywords = [
      'execute plan', 'run plan', 'start plan', 'implement plan', 
      'carry out plan', 'do the plan', 'follow the plan', 'put plan into action'
    ];
    
    const lowercaseMessage = userMessage.toLowerCase();
    return executionKeywords.some(keyword => lowercaseMessage.includes(keyword));
  }
  
  /**
   * Create a detailed plan based on the user's request
   */
  private async createPlan(workspaceId: number, userMessage: string): Promise<string> {
    // Get system prompt for plan creation
    const systemPrompt = await this.getSystemPrompt();
    
    // Get context from memory
    const contextMessages = await this.getContextMessages(workspaceId);
    
    // Craft specialized planning prompt
    const planningPrompt = `
User has requested planning assistance with the following task:
${userMessage}

Your job is to create a detailed, step-by-step plan to accomplish this task.
Break down the overall goal into clear, executable steps with any necessary sub-steps.
For each step, consider what tools might be needed and note them.
Number each step clearly and consider dependencies between steps.

Format your response in this structured way:
1. First, provide a brief "Plan Overview" (2-3 sentences summarizing the approach)
2. Then, list each step with clear numbering (e.g., "Step 1:", "Step 2:")
3. For complex steps, include sub-steps (e.g., "1.1", "1.2")
4. For each step, note any relevant tools in [brackets] at the end of the step

Remember to be thorough but concise, ensuring the plan is comprehensive yet easy to follow.
`;
    
    // Prepare messages for LLM
    const messages = [
      { role: 'system', content: systemPrompt },
      ...contextMessages,
      { role: 'user', content: userMessage },
      { role: 'system', content: planningPrompt }
    ];
    
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
        maxTokens: this.agentData.maxTokens || undefined
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
    const plan = result.choices[0].message.content;
    
    // Store plan in deep research for later reference
    await this.storePlan(workspaceId, userMessage, plan);
    
    // Respond with the generated plan
    return plan;
  }
  
  /**
   * Store the created plan in the deep research tool for future reference
   */
  private async storePlan(workspaceId: number, task: string, plan: string): Promise<void> {
    const deepResearch = this.toolManager.getToolByType('deep_research');
    if (deepResearch) {
      try {
        await deepResearch.execute({
          action: 'store',
          query: plan,
          metadata: {
            type: 'plan',
            task: task,
            workspaceId: workspaceId,
            agentId: this.getId(),
            timestamp: Date.now()
          },
          collection: 'plans'
        });
      } catch (error) {
        console.error('Error storing plan in deep research:', error);
      }
    }
  }
  
  /**
   * Execute a previously created plan or guide the user through the steps
   */
  private async executePlan(workspaceId: number, userMessage: string): Promise<string> {
    // First, retrieve relevant plans from deep research
    const plan = await this.retrieveRelevantPlan(workspaceId, userMessage);
    
    if (!plan) {
      return "I couldn't find a specific plan to execute. Please provide more details about which plan you want to execute, or ask me to create a new plan first.";
    }
    
    // Get context from memory
    const contextMessages = await this.getContextMessages(workspaceId);
    
    // Craft specialized execution guidance prompt
    const executionPrompt = `
I've found a relevant plan that matches your execution request:

${plan}

I'll help you execute this plan. Here's how we should proceed:

`;
    
    // Prepare messages for LLM
    const messages = [
      { role: 'system', content: await this.getSystemPrompt() },
      ...contextMessages,
      { role: 'user', content: userMessage },
      { role: 'system', content: `You are now in execution guidance mode. Provide specific 
guidance for executing the plan below. Focus on actionable advice for each step, tool recommendations, 
and how to overcome potential challenges. Be concrete and specific.` },
      { role: 'assistant', content: executionPrompt }
    ];
    
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
        maxTokens: this.agentData.maxTokens || undefined
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
    const executionGuidance = result.choices[0].message.content;
    
    // Return execution guidance
    return executionGuidance;
  }
  
  /**
   * Retrieve a relevant plan from the deep research tool
   */
  private async retrieveRelevantPlan(workspaceId: number, userMessage: string): Promise<string | null> {
    const deepResearch = this.toolManager.getToolByType('deep_research');
    if (!deepResearch) {
      return null;
    }
    
    try {
      const results = await deepResearch.execute({
        action: 'search',
        query: userMessage,
        collection: 'plans',
        topK: 1
      });
      
      if (results && results.success && results.results && results.results.length > 0) {
        // Return the most relevant plan
        return results.results[0].document;
      }
    } catch (error) {
      console.error('Error retrieving plan from deep research:', error);
    }
    
    return null;
  }
}