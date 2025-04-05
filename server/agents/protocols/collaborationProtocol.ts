import { Agent, Message } from '@shared/schema';
import { BaseAgent } from '../baseAgent';
import { storage } from '../../storage';
import { broadcastToWorkspace } from '../../socket';
import { LLMManager } from '../../llm/llmManager';

/**
 * Represents different collaboration modes for agents
 */
export enum CollaborationMode {
  // Sequential processing of tasks by different agents in a defined order
  SEQUENTIAL = 'sequential',
  // Parallel processing of tasks by different agents simultaneously
  PARALLEL = 'parallel',
  // Debate mode where agents discuss and refine responses iteratively
  DEBATE = 'debate',
  // Consensus mode where agents must agree on a final response
  CONSENSUS = 'consensus',
  // Critic mode where one agent reviews and refines another agent's output
  CRITIQUE = 'critique',
}

/**
 * Interface representing a collaboration between agents
 */
export interface Collaboration {
  id: string;
  workspaceId: number;
  initiatorAgentId: number;
  participantAgentIds: number[];
  userQuery: string;
  mode: CollaborationMode;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  steps: CollaborationStep[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

/**
 * Interface representing a step in a collaboration
 */
export interface CollaborationStep {
  id: string;
  collaborationId: string;
  agentId: number;
  input: string;
  output?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[]; // IDs of steps that must complete before this one
  messageIds: number[]; // IDs of messages associated with this step
  metadata?: Record<string, any>;
}

/**
 * Class to manage collaborative protocols between agents
 */
export class CollaborationProtocol {
  private llmManager: LLMManager;
  private collaborations: Map<string, Collaboration> = new Map();
  
  constructor(llmManager: LLMManager) {
    this.llmManager = llmManager;
  }
  
  /**
   * Initialize a new collaboration between agents
   */
  async initializeCollaboration(
    workspaceId: number,
    initiatorAgent: BaseAgent,
    participantAgents: BaseAgent[],
    userQuery: string,
    mode: CollaborationMode = CollaborationMode.SEQUENTIAL,
    metadata?: Record<string, any>
  ): Promise<Collaboration> {
    const collaborationId = `collab_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    const participantAgentIds = participantAgents.map(agent => agent.getId());
    
    const collaboration: Collaboration = {
      id: collaborationId,
      workspaceId,
      initiatorAgentId: initiatorAgent.getId(),
      participantAgentIds,
      userQuery,
      mode,
      status: 'pending',
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata
    };
    
    // Store the collaboration
    this.collaborations.set(collaborationId, collaboration);
    
    // Create and store the initial collaboration message
    const initialMessage: Message = {
      id: Date.now(),
      workspaceId,
      role: 'system',
      content: `Initiated collaboration between ${[initiatorAgent.getName(), ...participantAgents.map(a => a.getName())].join(', ')} in ${mode} mode.`,
      agentId: initiatorAgent.getId(),
      metadata: {
        collaborationId,
        type: 'collaboration_init',
        mode
      },
      createdAt: Date.now()
    };
    
    await storage.createMessage(initialMessage);
    
    // Broadcast the collaboration initialization
    broadcastToWorkspace(workspaceId, {
      type: 'collaboration_started',
      workspaceId,
      collaboration: {
        id: collaborationId,
        mode,
        initiatorAgent: initiatorAgent.getName(),
        participantAgents: participantAgents.map(a => a.getName()),
        userQuery
      }
    });
    
    return collaboration;
  }
  
  /**
   * Setup the sequential protocol (chain of agents)
   * Each agent processes the output of the previous agent
   */
  async setupSequentialProtocol(
    collaboration: Collaboration,
    agents: BaseAgent[],
    tasks?: string[]
  ): Promise<Collaboration> {
    const { id: collaborationId, workspaceId, userQuery } = collaboration;
    
    let previousStepId: string | null = null;
    
    // Create steps for each agent in sequence
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const stepId = `step_${collaborationId}_${i}`;
      
      // Use specific task instructions if provided, otherwise default to userQuery
      const input = tasks && tasks[i] ? tasks[i] : userQuery;
      
      const step: CollaborationStep = {
        id: stepId,
        collaborationId,
        agentId: agent.getId(),
        input,
        status: i === 0 ? 'pending' : 'pending',
        dependencies: previousStepId ? [previousStepId] : [],
        messageIds: []
      };
      
      collaboration.steps.push(step);
      previousStepId = stepId;
    }
    
    collaboration.status = 'in_progress';
    collaboration.updatedAt = Date.now();
    
    // Update stored collaboration
    this.collaborations.set(collaborationId, collaboration);
    
    return collaboration;
  }
  
  /**
   * Setup the parallel protocol (all agents working simultaneously)
   * Each agent processes the original query independently
   */
  async setupParallelProtocol(
    collaboration: Collaboration,
    agents: BaseAgent[],
    tasks?: string[]
  ): Promise<Collaboration> {
    const { id: collaborationId, workspaceId, userQuery } = collaboration;
    
    // Create steps for each agent in parallel
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const stepId = `step_${collaborationId}_${i}`;
      
      // Use specific task instructions if provided, otherwise default to userQuery
      const input = tasks && tasks[i] ? tasks[i] : userQuery;
      
      const step: CollaborationStep = {
        id: stepId,
        collaborationId,
        agentId: agent.getId(),
        input,
        status: 'pending',
        dependencies: [], // No dependencies for parallel execution
        messageIds: []
      };
      
      collaboration.steps.push(step);
    }
    
    collaboration.status = 'in_progress';
    collaboration.updatedAt = Date.now();
    
    // Update stored collaboration
    this.collaborations.set(collaborationId, collaboration);
    
    return collaboration;
  }
  
  /**
   * Setup the debate protocol (agents iteratively refine responses)
   * Agents discuss a topic in rounds, taking into account previous responses
   */
  async setupDebateProtocol(
    collaboration: Collaboration,
    agents: BaseAgent[],
    rounds: number = 2,
    initialTask?: string
  ): Promise<Collaboration> {
    const { id: collaborationId, workspaceId, userQuery } = collaboration;
    
    // Use provided task or default to user query
    const debateQuestion = initialTask || userQuery;
    
    // Create steps for each agent in each round
    for (let round = 0; round < rounds; round++) {
      const roundSteps: CollaborationStep[] = [];
      
      // For each agent in this round
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        const stepId = `step_${collaborationId}_r${round}_a${i}`;
        
        // In first round, no dependencies
        // In subsequent rounds, depend on all steps from previous round
        const dependencies = round === 0 
          ? [] 
          : collaboration.steps
              .filter(s => s.id.includes(`_r${round-1}_`))
              .map(s => s.id);
        
        const step: CollaborationStep = {
          id: stepId,
          collaborationId,
          agentId: agent.getId(),
          input: debateQuestion,
          status: round === 0 ? 'pending' : 'pending',
          dependencies,
          messageIds: []
        };
        
        roundSteps.push(step);
      }
      
      // Add all steps for this round
      collaboration.steps.push(...roundSteps);
    }
    
    collaboration.status = 'in_progress';
    collaboration.updatedAt = Date.now();
    
    // Update stored collaboration
    this.collaborations.set(collaborationId, collaboration);
    
    return collaboration;
  }
  
  /**
   * Setup the critique protocol (review and refinement)
   * First agent produces output, second agent critiques, first agent refines
   */
  async setupCritiqueProtocol(
    collaboration: Collaboration,
    creator: BaseAgent,
    critic: BaseAgent,
    iterations: number = 1,
    initialTask?: string
  ): Promise<Collaboration> {
    const { id: collaborationId, workspaceId, userQuery } = collaboration;
    
    // Use provided task or default to user query
    const task = initialTask || userQuery;
    
    // For each iteration of the critique process
    for (let iter = 0; iter < iterations; iter++) {
      // Step 1: Creator generates content
      const creatorStepId = `step_${collaborationId}_i${iter}_create`;
      const creatorStep: CollaborationStep = {
        id: creatorStepId,
        collaborationId,
        agentId: creator.getId(),
        input: iter === 0 ? task : `Refine your previous answer based on the critique.`,
        status: iter === 0 ? 'pending' : 'pending',
        dependencies: iter === 0 ? [] : [`step_${collaborationId}_i${iter-1}_critique`],
        messageIds: []
      };
      
      // Step 2: Critic evaluates and provides feedback
      const criticStepId = `step_${collaborationId}_i${iter}_critique`;
      const criticStep: CollaborationStep = {
        id: criticStepId,
        collaborationId,
        agentId: critic.getId(),
        input: `Review and critique the following response: \${previousOutput}. Be constructive and specific.`,
        status: 'pending',
        dependencies: [creatorStepId],
        messageIds: []
      };
      
      collaboration.steps.push(creatorStep, criticStep);
    }
    
    // Final polished output from creator
    const finalStepId = `step_${collaborationId}_final`;
    const finalStep: CollaborationStep = {
      id: finalStepId,
      collaborationId,
      agentId: creator.getId(),
      input: `Provide your final, refined answer incorporating all the feedback from the critique process.`,
      status: 'pending',
      dependencies: [`step_${collaborationId}_i${iterations-1}_critique`],
      messageIds: []
    };
    
    collaboration.steps.push(finalStep);
    collaboration.status = 'in_progress';
    collaboration.updatedAt = Date.now();
    
    // Update stored collaboration
    this.collaborations.set(collaborationId, collaboration);
    
    return collaboration;
  }
  
  /**
   * Execute a collaboration step by calling the appropriate agent
   */
  async executeStep(
    collaboration: Collaboration, 
    stepId: string,
    agentMap: Map<number, BaseAgent>
  ): Promise<CollaborationStep> {
    // Find the step in the collaboration
    const stepIndex = collaboration.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Step ${stepId} not found in collaboration ${collaboration.id}`);
    }
    
    const step = collaboration.steps[stepIndex];
    
    // Check if dependencies are satisfied
    if (step.dependencies.length > 0) {
      const unsatisfiedDeps = step.dependencies.filter(depId => {
        const depStep = collaboration.steps.find(s => s.id === depId);
        return !depStep || depStep.status !== 'completed';
      });
      
      if (unsatisfiedDeps.length > 0) {
        throw new Error(`Dependencies not satisfied for step ${stepId}: ${unsatisfiedDeps.join(', ')}`);
      }
    }
    
    // Get the agent
    const agent = agentMap.get(step.agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${step.agentId} not found`);
    }
    
    // Mark step as in progress
    step.status = 'in_progress';
    this.collaborations.set(collaboration.id, collaboration);
    
    // Broadcast step status update
    broadcastToWorkspace(collaboration.workspaceId, {
      type: 'collaboration_step_update',
      workspaceId: collaboration.workspaceId,
      collaborationId: collaboration.id,
      stepId: step.id,
      status: step.status,
      agentName: agent.getName()
    });
    
    try {
      // Process input by resolving any template variables
      let processedInput = step.input;
      
      // Replace ${previousOutput} with the output of dependencies if it exists in the input
      if (processedInput.includes('${previousOutput}') && step.dependencies.length > 0) {
        // Get the latest dependency output
        const latestDep = step.dependencies[step.dependencies.length - 1];
        const depStep = collaboration.steps.find(s => s.id === latestDep);
        
        if (depStep && depStep.output) {
          processedInput = processedInput.replace('${previousOutput}', depStep.output);
        }
      }
      
      // Create a system message to provide context about the collaboration
      const contextMessage: Message = {
        id: Date.now(),
        workspaceId: collaboration.workspaceId,
        role: 'system',
        content: `You are participating in a multi-agent collaboration in ${collaboration.mode} mode. Your specific role in this step is: ${agent.getType()} agent.`,
        agentId: step.agentId,
        metadata: {
          collaborationId: collaboration.id,
          stepId: step.id,
          type: 'collaboration_context'
        },
        createdAt: Date.now()
      };
      
      await storage.createMessage(contextMessage);
      
      // Create the input message
      const inputMessage: Message = {
        id: Date.now(),
        workspaceId: collaboration.workspaceId,
        role: 'user',
        content: processedInput,
        agentId: step.agentId,
        metadata: {
          collaborationId: collaboration.id,
          stepId: step.id,
          type: 'collaboration_input'
        },
        createdAt: Date.now()
      };
      
      await storage.createMessage(inputMessage);
      step.messageIds.push(inputMessage.id);
      
      // Generate response using the agent
      const response = await agent.generateResponse(collaboration.workspaceId, processedInput);
      
      // Find the response message ID that was just created in generateResponse
      // Usually the last message created for this agent in this workspace
      const messages = await storage.getMessagesByWorkspace(collaboration.workspaceId);
      const responseMessage = messages
        .filter(m => m.agentId === step.agentId && m.role === 'assistant')
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      
      if (responseMessage) {
        step.messageIds.push(responseMessage.id);
        
        // Update the message with collaboration metadata 
        const updatedMetadata = {
          ...(responseMessage.metadata || {}),
          collaborationId: collaboration.id,
          stepId: step.id,
          type: 'collaboration_output'
        };
        
        // Create updated message with new metadata
        const updatedMessage: Message = {
          ...responseMessage,
          metadata: updatedMetadata
        };
        
        // Update the message
        await storage.updateMessage(responseMessage.id, updatedMessage);
      }
      
      // Update step with result
      step.output = response;
      step.status = 'completed';
      
      // Update collaboration
      collaboration.steps[stepIndex] = step;
      collaboration.updatedAt = Date.now();
      this.collaborations.set(collaboration.id, collaboration);
      
      // Broadcast step completion
      broadcastToWorkspace(collaboration.workspaceId, {
        type: 'collaboration_step_update',
        workspaceId: collaboration.workspaceId,
        collaborationId: collaboration.id,
        stepId: step.id,
        status: step.status,
        agentName: agent.getName()
      });
      
      return step;
    } catch (error) {
      // Handle error
      console.error(`Error executing step ${stepId}:`, error);
      
      // Update step status
      step.status = 'failed';
      step.metadata = {
        ...step.metadata,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      // Update collaboration
      collaboration.steps[stepIndex] = step;
      this.collaborations.set(collaboration.id, collaboration);
      
      // Broadcast step failure
      broadcastToWorkspace(collaboration.workspaceId, {
        type: 'collaboration_step_update',
        workspaceId: collaboration.workspaceId,
        collaborationId: collaboration.id,
        stepId: step.id,
        status: step.status,
        agentName: agent.getName(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }
  
  /**
   * Get the next steps that are ready to be executed
   */
  getReadySteps(collaboration: Collaboration): CollaborationStep[] {
    return collaboration.steps.filter(step => {
      // Step must be pending
      if (step.status !== 'pending') return false;
      
      // All dependencies must be completed
      if (step.dependencies.length > 0) {
        const allDependenciesMet = step.dependencies.every(depId => {
          const depStep = collaboration.steps.find(s => s.id === depId);
          return depStep && depStep.status === 'completed';
        });
        
        return allDependenciesMet;
      }
      
      // No dependencies, step is ready
      return true;
    });
  }
  
  /**
   * Execute a collaboration by processing all steps according to dependencies
   */
  async executeCollaboration(
    collaboration: Collaboration,
    agentMap: Map<number, BaseAgent>
  ): Promise<Collaboration> {
    if (collaboration.status === 'completed' || collaboration.status === 'failed') {
      return collaboration;
    }
    
    // Set status to in progress
    collaboration.status = 'in_progress';
    collaboration.updatedAt = Date.now();
    this.collaborations.set(collaboration.id, collaboration);
    
    try {
      // Process steps based on collaboration mode
      switch (collaboration.mode) {
        case CollaborationMode.PARALLEL:
          // Execute all steps in parallel
          await Promise.all(
            this.getReadySteps(collaboration).map(step => 
              this.executeStep(collaboration, step.id, agentMap)
            )
          );
          break;
          
        case CollaborationMode.SEQUENTIAL:
        case CollaborationMode.DEBATE:
        case CollaborationMode.CRITIQUE:
        default:
          // Execute steps sequentially, respecting dependencies
          let nextSteps = this.getReadySteps(collaboration);
          
          while (nextSteps.length > 0) {
            // Execute the first ready step
            await this.executeStep(collaboration, nextSteps[0].id, agentMap);
            
            // Get the next batch of ready steps
            collaboration = this.collaborations.get(collaboration.id)!;
            nextSteps = this.getReadySteps(collaboration);
          }
          break;
      }
      
      // Check if all steps are completed
      const allStepsCompleted = collaboration.steps.every(s => s.status === 'completed');
      
      if (allStepsCompleted) {
        collaboration.status = 'completed';
        collaboration.updatedAt = Date.now();
        this.collaborations.set(collaboration.id, collaboration);
        
        // Broadcast collaboration completion
        broadcastToWorkspace(collaboration.workspaceId, {
          type: 'collaboration_completed',
          workspaceId: collaboration.workspaceId,
          collaborationId: collaboration.id
        });
      }
      
      return collaboration;
    } catch (error) {
      console.error(`Error executing collaboration ${collaboration.id}:`, error);
      
      // Mark collaboration as failed
      collaboration.status = 'failed';
      collaboration.metadata = {
        ...collaboration.metadata,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      collaboration.updatedAt = Date.now();
      this.collaborations.set(collaboration.id, collaboration);
      
      // Broadcast collaboration failure
      broadcastToWorkspace(collaboration.workspaceId, {
        type: 'collaboration_failed',
        workspaceId: collaboration.workspaceId,
        collaborationId: collaboration.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }
  
  /**
   * Synthesize the final output from a completed collaboration
   */
  async synthesizeResults(
    collaboration: Collaboration,
    orchestratorAgent: BaseAgent
  ): Promise<string> {
    if (collaboration.status !== 'completed') {
      throw new Error(`Cannot synthesize results for incomplete collaboration ${collaboration.id}`);
    }
    
    // Get all completed steps
    const completedSteps = collaboration.steps.filter(s => s.status === 'completed');
    
    // For sequential mode, the last step output is the final result
    if (collaboration.mode === CollaborationMode.SEQUENTIAL && completedSteps.length > 0) {
      const lastStep = completedSteps[completedSteps.length - 1];
      return lastStep.output || '';
    }
    
    // For other modes, use the orchestrator to synthesize results
    const agentOutputs: Record<string, string> = {};
    const agentNameMap = new Map<number, string>();
    
    // Get agent names for the summary
    const allAgents = await storage.getAllAgents();
    allAgents.forEach(agent => {
      agentNameMap.set(agent.id, agent.name);
    });
    
    // Collect outputs from all agents
    for (const step of completedSteps) {
      if (step.output) {
        const agentName = agentNameMap.get(step.agentId) || `Agent ${step.agentId}`;
        
        // For debate/critique, append round or iteration info
        if (collaboration.mode === CollaborationMode.DEBATE) {
          // Extract round number from step ID (format: step_collab_r{round}_a{agent})
          const roundMatch = step.id.match(/r(\d+)_a/);
          const round = roundMatch ? parseInt(roundMatch[1]) + 1 : '?';
          agentOutputs[`${agentName} (Round ${round})`] = step.output;
        } else if (collaboration.mode === CollaborationMode.CRITIQUE) {
          // Extract iteration and role from step ID
          const iterMatch = step.id.match(/i(\d+)_(\w+)/);
          const iteration = iterMatch ? parseInt(iterMatch[1]) + 1 : '?';
          const role = iterMatch ? iterMatch[2] : 'unknown';
          
          if (role === 'create' || role === 'critique') {
            agentOutputs[`${agentName} (${role}, Iteration ${iteration})`] = step.output;
          } else if (step.id.includes('_final')) {
            // This is the final output in critique mode
            agentOutputs[`${agentName} (Final)`] = step.output;
          }
        } else {
          // For parallel mode, just use agent name
          agentOutputs[agentName] = step.output;
        }
      }
    }
    
    // If we have just one output, return it
    if (Object.keys(agentOutputs).length === 1) {
      return Object.values(agentOutputs)[0];
    }
    
    // Format agent responses for the orchestrator to synthesize
    const agentResponsesFormatted = Object.entries(agentOutputs)
      .map(([agentName, output]) => `=== ${agentName} ===\n${output}\n`)
      .join('\n\n');
    
    // Use orchestrator to synthesize a final response
    const systemPrompt = `You are synthesizing the outputs from multiple agents in a ${collaboration.mode} collaboration. 
Create a coherent final response that incorporates the insights from all agents.
For DEBATE and CRITIQUE modes, focus on the progression of ideas and improvements.
For PARALLEL mode, combine unique insights from each agent.
Maintain a scholarly, balanced tone and ensure the response is comprehensive.`;
    
    // Get orchestrator config with defaults for null values
    const orchestratorConfig = orchestratorAgent.getConfig();
    const provider = orchestratorConfig.provider || 'openai';
    const model = orchestratorConfig.model || 'gpt-4';
    const temperature = (orchestratorConfig.temperature ?? 70) / 100; // Default to 0.7
    const maxTokens = orchestratorConfig.maxTokens ?? 2000; // Default to 2000 tokens
    
    const result = await this.llmManager.generateResponse({
      provider,
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Original request: ${collaboration.userQuery}\n\nAgent outputs:\n${agentResponsesFormatted}\n\nPlease synthesize these outputs into a comprehensive final response.` }
      ],
      temperature,
      maxTokens
    });
    
    // Create synthesis message in the workspace
    const synthesisMessage: Message = {
      id: Date.now(),
      workspaceId: collaboration.workspaceId,
      role: 'assistant',
      content: result.choices[0].message.content,
      agentId: orchestratorAgent.getId(),
      metadata: {
        collaborationId: collaboration.id,
        type: 'collaboration_synthesis'
      },
      createdAt: Date.now()
    };
    
    await storage.createMessage(synthesisMessage);
    
    // Broadcast the synthesis
    broadcastToWorkspace(collaboration.workspaceId, {
      type: 'message',
      workspaceId: collaboration.workspaceId,
      message: synthesisMessage
    });
    
    return result.choices[0].message.content;
  }
}