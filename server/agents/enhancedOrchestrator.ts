import { Agent, Message } from '@shared/schema';
import { BaseAgent } from './baseAgent';
import { agentManager } from './agentManager';
import { LLMManager } from '../llm/llmManager';
import { MemoryManager } from '../memory/memory';
import { ToolManager } from '../tools/toolManager';
import { storage } from '../storage';
import { broadcastToWorkspace } from '../socket';
import { 
  CollaborationProtocol, 
  CollaborationMode, 
  Collaboration 
} from './protocols/collaborationProtocol';

export class EnhancedOrchestrator extends BaseAgent {
  private collaborationProtocol: CollaborationProtocol;
  
  constructor(
    agentData: Agent,
    llmManager: LLMManager,
    memoryManager: MemoryManager,
    toolManager: ToolManager
  ) {
    super(agentData, llmManager, memoryManager, toolManager);
    this.collaborationProtocol = new CollaborationProtocol(llmManager);
  }
  
  /**
   * Enhanced processing with sophisticated collaboration protocols
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
      
      // Analyze the task to determine the best collaboration approach
      const collaborationSetup = await this.analyzeCollaborationApproach(workspaceId, userMessage);
      
      // Create agent map for the collaboration
      const agentMap = new Map<number, BaseAgent>();
      
      // Add self
      agentMap.set(this.getId(), this);
      
      // Add all participating agents
      for (const agentId of collaborationSetup.participantAgentIds) {
        const agent = agentManager.getAgentInstance(agentId);
        if (agent) {
          agentMap.set(agentId, agent);
        }
      }
      
      // Initialize the collaboration
      const agents = collaborationSetup.participantAgentIds
        .map(id => agentMap.get(id))
        .filter((agent): agent is BaseAgent => !!agent);
      
      const collaboration = await this.collaborationProtocol.initializeCollaboration(
        workspaceId,
        this,
        agents,
        userMessage,
        collaborationSetup.mode,
        { taskBreakdown: collaborationSetup.taskBreakdown }
      );
      
      // Setup steps based on the collaboration mode
      let preparedCollaboration: Collaboration;
      
      switch (collaborationSetup.mode) {
        case CollaborationMode.SEQUENTIAL:
          preparedCollaboration = await this.collaborationProtocol.setupSequentialProtocol(
            collaboration,
            agents,
            collaborationSetup.tasks
          );
          break;
          
        case CollaborationMode.PARALLEL:
          preparedCollaboration = await this.collaborationProtocol.setupParallelProtocol(
            collaboration,
            agents,
            collaborationSetup.tasks
          );
          break;
          
        case CollaborationMode.DEBATE:
          preparedCollaboration = await this.collaborationProtocol.setupDebateProtocol(
            collaboration,
            agents,
            collaborationSetup.rounds || 2,
            userMessage
          );
          break;
          
        case CollaborationMode.CRITIQUE:
          // For critique we need a creator and a critic
          if (agents.length >= 2) {
            const creator = agents[0];
            const critic = agents[1];
            
            preparedCollaboration = await this.collaborationProtocol.setupCritiqueProtocol(
              collaboration,
              creator,
              critic,
              collaborationSetup.iterations || 1,
              userMessage
            );
          } else {
            // Fallback to sequential if not enough agents
            preparedCollaboration = await this.collaborationProtocol.setupSequentialProtocol(
              collaboration,
              agents,
              collaborationSetup.tasks
            );
          }
          break;
          
        default:
          // Default to sequential
          preparedCollaboration = await this.collaborationProtocol.setupSequentialProtocol(
            collaboration,
            agents,
            collaborationSetup.tasks
          );
      }
      
      // Execute the collaboration
      const executedCollaboration = await this.collaborationProtocol.executeCollaboration(
        preparedCollaboration,
        agentMap
      );
      
      // Synthesize the results
      const rawFinalResponse = await this.collaborationProtocol.synthesizeResults(
        executedCollaboration,
        this
      );
      
      // Get a thinker agent to analyze the response with CoT reasoning if available
      let finalResponse = rawFinalResponse;
      try {
        const allAgents = await agentManager.getAllAgents();
        const thinkerAgent = allAgents.find(agent => agent.type === 'thinker' && agent.isActive);
        
        if (thinkerAgent) {
          const thinkerInstance = agentManager.getAgentInstance(thinkerAgent.id);
          
          if (thinkerInstance) {
            // Create thinking message to show analysis is in progress
            const thinkingMessage: Message = {
              id: Date.now(),
              workspaceId,
              role: 'system',
              content: 'Analyzing response with Chain of Thought reasoning...',
              agentId: thinkerAgent.id,
              metadata: { isThinking: true },
              createdAt: Date.now()
            };
            
            await storage.createMessage(thinkingMessage);
            
            // Broadcast thinking message
            broadcastToWorkspace(workspaceId, {
              type: 'message',
              workspaceId,
              message: thinkingMessage
            });
            
            // Have the thinker agent analyze the response
            const enhancedResponse = await thinkerInstance.generateResponse(workspaceId, rawFinalResponse);
            
            // Use the enhanced response if it's valid
            if (enhancedResponse && enhancedResponse.trim().length > 0) {
              finalResponse = enhancedResponse;
            }
          }
        }
      } catch (error) {
        console.error("Error using Thinker Agent for analysis:", error);
        // Fall back to the raw response if there's an error
      }
      
      // Create orchestrator final response message
      const responseMessage: Message = {
        id: Date.now(),
        workspaceId,
        role: 'assistant',
        content: finalResponse,
        agentId: this.getId(),
        metadata: {
          collaborationId: executedCollaboration.id,
          collaborationMode: executedCollaboration.mode,
          type: 'final_response',
          enhanced: finalResponse !== rawFinalResponse
        },
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
      console.error(`Error in EnhancedOrchestrator.process:`, error);
      
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
   * Generates the thinking content for the orchestrator
   */
  private generateThinkingContent(userMessage: string): string {
    return `1. Analyzing request: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"
2. Determining optimal collaboration protocol
3. Selecting which specialized agents should participate
4. Breaking task into optimal subtasks
5. Designing execution flow with appropriate dependencies
6. Preparing comprehensive context for each agent`;
  }
  
  /**
   * Analyzes the message to determine the best collaboration approach
   */
  private async analyzeCollaborationApproach(
    workspaceId: number, 
    userMessage: string
  ): Promise<{
    mode: CollaborationMode;
    participantAgentIds: number[];
    tasks?: string[];
    rounds?: number;
    iterations?: number;
    taskBreakdown?: string;
  }> {
    // Get available agents
    const allAgents = await agentManager.getAllAgents();
    const availableAgents = allAgents.filter(agent => 
      agent.id !== this.getId() && agent.isActive
    );
    
    if (availableAgents.length === 0) {
      // If no other agents are available, use self in sequential mode
      return { 
        mode: CollaborationMode.SEQUENTIAL, 
        participantAgentIds: [this.getId()]
      };
    }
    
    // Prepare system prompt for collaboration planning
    const systemPrompt = `You are an agent collaboration orchestrator. Your task is to design the optimal collaboration protocol for solving a user request.

Available agents:
${availableAgents.map(agent => `- ${agent.name} (${agent.type}): ${agent.description || 'No description'}`).join('\n')}

Available collaboration modes:
- SEQUENTIAL: Agents work in sequence, each processing the output of the previous agent
- PARALLEL: Agents work simultaneously on different aspects of the task
- DEBATE: Agents engage in back-and-forth discussion to refine answers
- CRITIQUE: One agent creates content, another critiques it, then the first refines it

Analyze the user request and determine:
1. The most appropriate collaboration mode
2. Which agents should participate
3. How to break down the task for each agent
4. For DEBATE mode, how many rounds of discussion (default: 2)
5. For CRITIQUE mode, how many iterations of refinement (default: 1)

Return a JSON response with the following format:
{
  "mode": "SEQUENTIAL|PARALLEL|DEBATE|CRITIQUE",
  "agents": [
    {"name": "Agent Name", "task": "Specific task description"}
  ],
  "rounds": 2,  // Only for DEBATE mode
  "iterations": 1,  // Only for CRITIQUE mode
  "taskBreakdown": "Explanation of your task allocation strategy"
}`;
    
    // Get response from LLM for collaboration planning
    const result = await this.llmManager.generateResponse({
      provider: this.agentData.provider,
      model: this.agentData.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      maxTokens: 1500
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
      
      if (!jsonResponse.mode || !jsonResponse.agents || !Array.isArray(jsonResponse.agents)) {
        throw new Error('Invalid collaboration planning response');
      }
      
      // Convert mode string to enum
      let mode: CollaborationMode;
      switch (jsonResponse.mode.toUpperCase()) {
        case 'SEQUENTIAL':
          mode = CollaborationMode.SEQUENTIAL;
          break;
        case 'PARALLEL':
          mode = CollaborationMode.PARALLEL;
          break;
        case 'DEBATE':
          mode = CollaborationMode.DEBATE;
          break;
        case 'CRITIQUE':
          mode = CollaborationMode.CRITIQUE;
          break;
        default:
          mode = CollaborationMode.SEQUENTIAL;
      }
      
      // Map agent names to IDs and extract tasks
      const participantAgentIds: number[] = [];
      const tasks: string[] = [];
      
      for (const allocation of jsonResponse.agents) {
        const agent = availableAgents.find(a => 
          a.name.toLowerCase() === allocation.name.toLowerCase() ||
          a.type.toLowerCase() === allocation.name.toLowerCase()
        );
        
        if (agent) {
          participantAgentIds.push(agent.id);
          tasks.push(allocation.task);
        }
      }
      
      // If no valid agents were found, fallback to self
      if (participantAgentIds.length === 0) {
        return { 
          mode: CollaborationMode.SEQUENTIAL, 
          participantAgentIds: [this.getId()]
        };
      }
      
      // Create a message to store the collaboration plan
      const planMessage: Message = {
        id: Date.now(),
        workspaceId,
        role: 'system',
        content: `Collaboration plan: ${jsonResponse.taskBreakdown || 'No detailed breakdown available'}`,
        agentId: this.getId(),
        metadata: { 
          type: 'collaboration_plan',
          mode: mode,
          agents: jsonResponse.agents.map((a: any) => a.name),
          rounds: jsonResponse.rounds,
          iterations: jsonResponse.iterations
        },
        createdAt: Date.now()
      };
      
      await storage.createMessage(planMessage);
      
      return {
        mode,
        participantAgentIds,
        tasks,
        rounds: jsonResponse.rounds || 2,
        iterations: jsonResponse.iterations || 1,
        taskBreakdown: jsonResponse.taskBreakdown
      };
    } catch (error) {
      console.error('Error parsing collaboration planning:', error);
      // Fallback to sequential with all agents
      return { 
        mode: CollaborationMode.SEQUENTIAL, 
        participantAgentIds: availableAgents.map(a => a.id)
      };
    }
  }
}