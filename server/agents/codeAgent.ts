import { Agent } from '@shared/schema';
import { BaseAgent } from './baseAgent';
import { LLMManager } from '../llm/llmManager';
import { MemoryManager } from '../memory/memory';
import { ToolManager } from '../tools/toolManager';

export class CodeAgent extends BaseAgent {
  constructor(
    agentData: Agent,
    llmManager: LLMManager,
    memoryManager: MemoryManager,
    toolManager: ToolManager
  ) {
    super(agentData, llmManager, memoryManager, toolManager);
  }
  
  protected async getSystemPrompt(): Promise<string> {
    // Override with specialized prompt if not provided
    if (!this.agentData.systemPrompt) {
      return `You are the Code Agent, specialized in generating, analyzing, and debugging code.
You excel at understanding programming concepts, implementing algorithms, and providing clean, efficient solutions.
Always follow these guidelines:
1. Write clean, well-documented code
2. Explain your approach and reasoning
3. Consider edge cases and error handling
4. Follow language-specific best practices
5. Optimize for readability and maintainability
6. Provide testing suggestions when appropriate

Use markdown code blocks with language specification for any code you write.`;
    }
    
    return this.agentData.systemPrompt;
  }
  
  async generateResponse(workspaceId: number, userMessage: string): Promise<string> {
    // Check if the task requires code execution
    if (this.shouldExecuteCode(userMessage)) {
      // Get code execution tool
      const codeExecutor = await this.toolManager.getToolByType('code_execution');
      
      if (codeExecutor) {
        try {
          // First generate code
          const codeGenResponse = await super.generateResponse(workspaceId, userMessage);
          
          // Extract code blocks
          const codeBlocks = this.extractCodeBlocks(codeGenResponse);
          
          if (codeBlocks.length > 0) {
            // Execute the main code block
            const mainBlock = codeBlocks[0];
            const executionResult = await codeExecutor.execute({
              code: mainBlock.code,
              language: mainBlock.language
            });
            
            // Generate enhanced response with execution results
            const enhancedUserMessage = `
Original request: ${userMessage}

I generated the following code:
\`\`\`${mainBlock.language}
${mainBlock.code}
\`\`\`

Execution result:
\`\`\`
${JSON.stringify(executionResult, null, 2)}
\`\`\`

Please analyze the execution results and provide an updated response with explanation.`;
            
            // Generate response with execution results
            return super.generateResponse(workspaceId, enhancedUserMessage);
          }
        } catch (error) {
          console.error('Error executing code:', error);
          
          // Generate response with error info
          const errorMessage = `
Original request: ${userMessage}

I tried to execute the code but encountered an error:
\`\`\`
${error instanceof Error ? error.message : String(error)}
\`\`\`

Please provide an updated solution addressing this error.`;
          
          return super.generateResponse(workspaceId, errorMessage);
        }
      }
    }
    
    // Fallback to standard response
    return super.generateResponse(workspaceId, userMessage);
  }
  
  private shouldExecuteCode(userMessage: string): boolean {
    // Determine if this request likely needs code execution
    const executionTerms = [
      'run', 'execute', 'test', 'debug', 'output',
      'result', 'compile', 'build', 'performance'
    ];
    
    const lowercaseMessage = userMessage.toLowerCase();
    return executionTerms.some(term => lowercaseMessage.includes(term));
  }
  
  private extractCodeBlocks(text: string): { code: string, language: string }[] {
    const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
    const blocks: { code: string, language: string }[] = [];
    
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }
    
    return blocks;
  }
}
