import { Agent, Message } from '@shared/schema';
import { BaseAgent } from './baseAgent';
import { agentManager } from './agentManager';
import { LLMManager } from '../llm/llmManager';
import { MemoryManager } from '../memory/memory';
import { ToolManager } from '../tools/toolManager';
import { storage } from '../storage';
import { broadcastToWorkspace } from '../socket';

export class Orchestrator extends BaseAgent {
  constructor(
    agentData: Agent,
    llmManager: LLMManager,
    memoryManager: MemoryManager,
    toolManager: ToolManager
  ) {
    super(agentData, llmManager, memoryManager, toolManager);
  }
  
  async process(workspaceId: number, userMessage: string): Promise<void> {
    try {
      // Store user message in memory and database
      const message: Message = {
        id: Date.now(),
        workspaceId,
        role: 'user',
        content: userMessage,
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
      
      // Analyze the message to determine which agents to use
      const { agentIds, tasks } = await this.analyzeMessage(workspaceId, userMessage);
      
      // Collect responses from agents
      const agentResponses: Record<string, string> = {};
      
      for (let i = 0; i < agentIds.length; i++) {
        const agentId = agentIds[i];
        const task = tasks[i];
        
        const agent = agentManager.getAgentInstance(agentId);
        if (!agent) continue;
        
        // Generate response from this agent
        const response = await agent.generateResponse(workspaceId, task);
        agentResponses[agent.getName()] = response;
      }
      
      // Synthesize a final response based on agent outputs
      const finalResponse = await this.synthesizeFinalResponse(workspaceId, userMessage, agentResponses);
      
      // Create orchestrator final response message
      const responseMessage: Message = {
        id: Date.now(),
        workspaceId,
        role: 'assistant',
        content: finalResponse,
        agentId: this.getId(),
        createdAt: Date.now()
      };
      
      await storage.createMessage(responseMessage);
      await this.saveToMemory(workspaceId, responseMessage);
      
      // Broadcast the orchestrator's final message
      broadcastToWorkspace(workspaceId, {
        type: 'message',
        workspaceId,
        message: responseMessage
      });
    } catch (error) {
      console.error(`Error in Orchestrator.process:`, error);
      
      // Create error message
      const errorMessage: Message = {
        id: Date.now(),
        workspaceId,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
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
  
  private generateThinkingContent(userMessage: string): string {
    // Generate a simplified thinking process output to show the orchestration
    return `1. Analyzing request: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"
2. Determining which agents can best handle this request
3. Breaking task into subtasks for specialized agents
4. Preparing to delegate tasks to appropriate agents`;
  }
  
  private async analyzeMessage(workspaceId: number, userMessage: string): Promise<{ agentIds: number[], tasks: string[] }> {
    // Get available agents
    const allAgents = await agentManager.getAllAgents();
    const availableAgents = allAgents.filter(agent => 
      agent.id !== this.getId() && agent.isActive
    );
    
    if (availableAgents.length === 0) {
      // If no other agents are available, return self
      return { 
        agentIds: [this.getId()], 
        tasks: [userMessage] 
      };
    }
    
    // Prepare system prompt for task allocation
    const systemPrompt = `You are a task orchestrator. Based on the user request, determine which specialized agents should handle it.
Available agents:
${availableAgents.map(agent => `- ${agent.name} (${agent.type}): ${agent.description || 'No description'}`).join('\n')}

Analyze the user request and do the following:
1. Determine which agents are needed to handle the request
2. Create specific tasks/instructions for each agent
3. Return a JSON response with the following format:
{
  "agents": [
    {"name": "Agent Name", "task": "Specific task for this agent"}
  ]
}

Only include agents that are necessary for this specific request. Include detailed task descriptions for each agent.`;
    
    // Get response from LLM for task allocation
    const result = await this.llmManager.generateResponse({
      provider: this.agentData.provider,
      model: this.agentData.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      maxTokens: 1000
    });
    
    // Parse the response
    try {
      const contentStr = result.choices[0].message.content;
      // Extract JSON part from the response
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from LLM');
      }
      
      const jsonResponse = JSON.parse(jsonMatch[0]);
      
      if (!jsonResponse.agents || !Array.isArray(jsonResponse.agents)) {
        throw new Error('Invalid agent allocation response');
      }
      
      // Map agent names to IDs and extract tasks
      const agentIds: number[] = [];
      const tasks: string[] = [];
      
      for (const allocation of jsonResponse.agents) {
        const agent = availableAgents.find(a => 
          a.name.toLowerCase() === allocation.name.toLowerCase() ||
          a.type.toLowerCase() === allocation.name.toLowerCase()
        );
        
        if (agent) {
          agentIds.push(agent.id);
          tasks.push(allocation.task);
        }
      }
      
      // If no valid agents were found, fallback to self
      if (agentIds.length === 0) {
        return { 
          agentIds: [this.getId()], 
          tasks: [userMessage] 
        };
      }
      
      return { agentIds, tasks };
    } catch (error) {
      console.error('Error parsing agent allocation:', error);
      // Fallback: use self
      return { 
        agentIds: [this.getId()], 
        tasks: [userMessage] 
      };
    }
  }
  
  private async synthesizeFinalResponse(
    workspaceId: number, 
    userMessage: string, 
    agentResponses: Record<string, string>
  ): Promise<string> {
    // Prepare system prompt for synthesis
    const systemPrompt = `You are an orchestrator agent responsible for synthesizing responses from multiple specialized agents into a coherent final response. 
Consider all agent responses and create a comprehensive answer that addresses the user's original request.
Be cohesive and remove any redundancy between agent responses.`;
    
    // Format agent responses for the LLM
    const agentResponsesFormatted = Object.entries(agentResponses)
      .map(([agentName, response]) => `=== ${agentName} Response ===\n${response}\n`)
      .join('\n\n');
    
    // Get response from LLM for synthesis
    const result = await this.llmManager.generateResponse({
      provider: this.agentData.provider,
      model: this.agentData.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User request: ${userMessage}\n\nAgent responses:\n${agentResponsesFormatted}\n\nPlease synthesize these responses into a coherent final answer.` }
      ],
      temperature: 0.5,
      maxTokens: this.agentData.maxTokens
    });
    
    // Return the synthesized response
    return result.choices[0].message.content;
  }
}
