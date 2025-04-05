import { Tool } from '@shared/schema';
import { ITool } from './toolManager';
import { agentManager } from '../agents/agentManager';

/**
 * Tool for executing plans created by the PlannerAgent
 * This tool allows for tracking plan steps, delegating tasks to specialized agents,
 * and monitoring plan progress
 */
export class PlanExecution implements ITool {
  private tool: Tool;
  
  constructor(tool: Tool) {
    this.tool = tool;
  }
  
  getName(): string {
    return this.tool.name;
  }
  
  getType(): string {
    return this.tool.type;
  }
  
  getDescription(): string {
    return this.tool.description || 'Execute and track steps from a plan created by the planner agent';
  }
  
  isEnabled(): boolean {
    return this.tool.isEnabled !== false;
  }
  
  getParameters(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['extract_steps', 'track_progress', 'delegate_step', 'mark_step_complete', 'get_plan_status'],
          description: 'The action to perform with the plan execution tool'
        },
        plan: {
          type: 'string',
          description: 'The plan text containing steps to be executed'
        },
        stepNumber: {
          type: 'number',
          description: 'The step number to operate on'
        },
        status: {
          type: 'string',
          enum: ['not_started', 'in_progress', 'completed', 'blocked', 'skipped'],
          description: 'The status to set for a step'
        },
        agentType: {
          type: 'string',
          description: 'The type of agent to delegate a step to'
        },
        workspaceId: {
          type: 'number',
          description: 'The workspace ID where the plan is being executed'
        },
        notes: {
          type: 'string',
          description: 'Additional notes or context about the step execution'
        }
      },
      required: ['action']
    };
  }
  
  async execute(params: any): Promise<any> {
    const { action } = params;
    
    switch (action) {
      case 'extract_steps':
        return this.extractStepsFromPlan(params.plan);
        
      case 'track_progress':
        return this.trackPlanProgress(params.plan, params.workspaceId);
        
      case 'delegate_step':
        return this.delegateStep(
          params.plan, 
          params.stepNumber, 
          params.agentType, 
          params.workspaceId,
          params.notes
        );
        
      case 'mark_step_complete':
        return this.markStepComplete(
          params.plan,
          params.stepNumber,
          params.workspaceId,
          params.notes
        );
        
      case 'get_plan_status':
        return this.getPlanStatus(params.plan, params.workspaceId);
        
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`
        };
    }
  }
  
  /**
   * Extract steps from a plan text
   */
  private async extractStepsFromPlan(planText: string): Promise<{
    success: boolean;
    steps?: Array<{
      number: string;
      text: string;
      tools: string[];
    }>;
    error?: string;
  }> {
    try {
      // Simple regex pattern to extract steps from a plan
      // This could be made more sophisticated for complex plans
      const stepRegex = /(?:step|)\s*(\d+(?:\.\d+)?)(?::|\.)\s*([^\n]*)(?:\[([^\]]+)\])?/gi;
      const steps = [];
      
      let match;
      while ((match = stepRegex.exec(planText)) !== null) {
        const stepNumber = match[1];
        const stepText = match[2].trim();
        // Extract tools if mentioned in brackets
        const toolsText = match[3] ? match[3].trim() : '';
        const tools = toolsText ? 
          toolsText.split(',').map(tool => tool.trim()) : 
          [];
        
        steps.push({
          number: stepNumber,
          text: stepText,
          tools
        });
      }
      
      return {
        success: true,
        steps
      };
    } catch (error) {
      console.error('Error extracting steps from plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Track the progress of a plan execution
   */
  private async trackPlanProgress(planText: string, workspaceId: number): Promise<{
    success: boolean;
    progress?: {
      totalSteps: number;
      completedSteps: number;
      inProgressSteps: number;
      percentComplete: number;
      stepStatuses: Record<string, string>;
    };
    error?: string;
  }> {
    try {
      // Get the stored progress for this plan in this workspace
      const progressKey = `plan_progress:${workspaceId}:${this.hashPlan(planText)}`;
      
      // In a real implementation, this would be stored in a database
      // For now, we'll simulate progress tracking
      const mockProgress = {
        totalSteps: 5,
        completedSteps: 2,
        inProgressSteps: 1,
        percentComplete: 40,
        stepStatuses: {
          "1": "completed",
          "2": "completed",
          "3": "in_progress",
          "4": "not_started",
          "5": "not_started"
        }
      };
      
      return {
        success: true,
        progress: mockProgress
      };
    } catch (error) {
      console.error('Error tracking plan progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Delegate a plan step to a specific agent type
   */
  private async delegateStep(
    planText: string,
    stepNumber: number | string,
    agentType: string,
    workspaceId: number,
    notes?: string
  ): Promise<{
    success: boolean;
    result?: string;
    error?: string;
  }> {
    try {
      // Extract the step to delegate
      const extractResult = await this.extractStepsFromPlan(planText);
      
      if (!extractResult.success || !extractResult.steps) {
        return {
          success: false,
          error: 'Failed to extract steps from plan'
        };
      }
      
      const stepToDelegate = extractResult.steps.find(
        step => step.number === stepNumber.toString()
      );
      
      if (!stepToDelegate) {
        return {
          success: false,
          error: `Step ${stepNumber} not found in plan`
        };
      }
      
      // Get the agent of the specified type
      const agents = await agentManager.getAllAgents();
      const agent = agents.find(a => a.type === agentType);
      
      if (!agent) {
        return {
          success: false,
          error: `No agent found with type: ${agentType}`
        };
      }
      
      // In a real implementation, we would actually send the step to the agent
      // For now, we'll just return a success message
      return {
        success: true,
        result: `Step ${stepNumber} delegated to ${agent.name} (${agentType}): ${stepToDelegate.text}`
      };
    } catch (error) {
      console.error('Error delegating step:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Mark a step as complete in the plan
   */
  private async markStepComplete(
    planText: string,
    stepNumber: number | string,
    workspaceId: number,
    notes?: string
  ): Promise<{
    success: boolean;
    result?: string;
    error?: string;
  }> {
    try {
      // In a real implementation, we would update the step status in storage
      // For now, we'll just return a success message
      return {
        success: true,
        result: `Step ${stepNumber} marked as complete${notes ? `: ${notes}` : ''}`
      };
    } catch (error) {
      console.error('Error marking step complete:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get the overall status of a plan
   */
  private async getPlanStatus(
    planText: string,
    workspaceId: number
  ): Promise<{
    success: boolean;
    status?: {
      state: 'not_started' | 'in_progress' | 'completed' | 'blocked';
      progress: number;
      currentStep: number | null;
      nextStep: number | null;
      completedSteps: number[];
    };
    error?: string;
  }> {
    try {
      // In a real implementation, we would retrieve the plan status from storage
      // For now, we'll return a mock status
      const mockStatus = {
        state: 'in_progress' as const,
        progress: 40,
        currentStep: 3,
        nextStep: 4,
        completedSteps: [1, 2]
      };
      
      return {
        success: true,
        status: mockStatus
      };
    } catch (error) {
      console.error('Error getting plan status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Create a hash of the plan text for storage/lookup
   */
  private hashPlan(planText: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < planText.length; i++) {
      const char = planText.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
}