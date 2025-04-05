import { Agent } from '@shared/schema';
import { BaseAgent } from './baseAgent';
import { LLMManager } from '../llm/llmManager';
import { MemoryManager } from '../memory/memory';
import { ToolManager } from '../tools/toolManager';

export class WriterAgent extends BaseAgent {
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
      return `You are the Writer Agent, specialized in creating high-quality written content.
You excel at crafting engaging narratives, clear explanations, and persuasive arguments.
Follow these writing principles:
1. Understand your audience and purpose
2. Create clear, logical structures
3. Use engaging, appropriate language
4. Show rather than tell when possible
5. Be concise and avoid unnecessary words
6. Use active voice primarily
7. Incorporate specific examples and evidence
8. Maintain consistent tone and style

Adapt your writing style, tone, and structure based on the specific type of content requested.`;
    }
    
    return this.agentData.systemPrompt;
  }
  
  async generateResponse(workspaceId: number, userMessage: string): Promise<string> {
    // Analyze the writing request to determine style and structure
    const writingAnalysis = await this.analyzeWritingRequest(userMessage);
    
    // Enhance the user message with the analysis
    const enhancedUserMessage = `
Original request: ${userMessage}

Writing analysis:
- Content type: ${writingAnalysis.contentType}
- Target audience: ${writingAnalysis.audience}
- Tone: ${writingAnalysis.tone}
- Key elements to include: ${writingAnalysis.keyElements.join(', ')}
- Suggested structure: ${writingAnalysis.structure}

Please create content based on this analysis.`;
    
    // Generate response with enhanced context
    return super.generateResponse(workspaceId, enhancedUserMessage);
  }
  
  private async analyzeWritingRequest(userMessage: string): Promise<{
    contentType: string;
    audience: string;
    tone: string;
    keyElements: string[];
    structure: string;
  }> {
    // Ask LLM to analyze the writing request
    const systemPrompt = `You are a writing analyst. Based on the user's writing request, analyze and determine:
1. The type of content requested (article, blog post, email, report, etc.)
2. The likely target audience
3. The appropriate tone (formal, conversational, technical, etc.)
4. Key elements that should be included
5. A suggested structure for the content

Return your analysis as a valid JSON object with the following properties:
{
  "contentType": "string",
  "audience": "string",
  "tone": "string",
  "keyElements": ["string"],
  "structure": "string"
}`;
    
    try {
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
      
      const content = result.choices[0].message.content;
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback with default values
      return {
        contentType: 'general content',
        audience: 'general audience',
        tone: 'neutral',
        keyElements: ['clarity', 'conciseness', 'relevance'],
        structure: 'introduction, body, conclusion'
      };
    } catch (error) {
      console.error('Error analyzing writing request:', error);
      // Return default values
      return {
        contentType: 'general content',
        audience: 'general audience',
        tone: 'neutral',
        keyElements: ['clarity', 'conciseness', 'relevance'],
        structure: 'introduction, body, conclusion'
      };
    }
  }
}
