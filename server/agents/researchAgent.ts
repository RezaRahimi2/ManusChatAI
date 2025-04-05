import { Agent } from '@shared/schema';
import { BaseAgent } from './baseAgent';
import { LLMManager } from '../llm/llmManager';
import { MemoryManager } from '../memory/memory';
import { ToolManager } from '../tools/toolManager';

export class ResearchAgent extends BaseAgent {
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
      return `You are the Research Agent, specialized in finding, analyzing, and summarizing information. 
You have access to web search and can browse web pages to extract relevant information.
You also have access to a local deep research tool that allows you to retrieve contextually relevant information from past agent interactions and stored documents.

Provide comprehensive, accurate, and properly cited information. 
When providing research:
1. Be thorough and detailed
2. Cite your sources clearly
3. Structure information logically
4. Highlight key findings
5. Maintain objectivity
6. Address uncertainties and limitations
7. Draw upon relevant past conversations and context stored in the research database`;
    }
    
    return this.agentData.systemPrompt;
  }
  
  async generateResponse(workspaceId: number, userMessage: string): Promise<string> {
    let enhancedUserMessage = userMessage;
    let hasEnhancements = false;
    
    // Get relevant context from the local deep research tool
    const deepResearch = this.toolManager.getToolByType('deep_research');
    if (deepResearch) {
      try {
        // Retrieve relevant context from past interactions using the deep research tool
        const researchContext = await deepResearch.execute({
          action: 'retrieve_context',
          query: userMessage,
          workspaceId: workspaceId,
          topK: 5
        });
        
        if (researchContext && researchContext.length > 0) {
          enhancedUserMessage = `
Original request: ${userMessage}

Relevant context from past interactions:
${researchContext}

Based on this context and your knowledge, please provide a comprehensive response.`;
          hasEnhancements = true;
        }
      } catch (error) {
        console.error('Error using deep research tool:', error);
      }
    }
    
    // Check if the research task requires web search
    if (this.shouldUseWebSearch(userMessage)) {
      // Get web browser tool
      const webBrowser = this.toolManager.getToolByType('web_browser');
      
      if (webBrowser) {
        try {
          // Get search queries
          const searchQueries = await this.generateSearchQueries(userMessage);
          
          // Search the web
          const searchResults = await webBrowser.execute({
            action: 'search',
            query: searchQueries.join(' OR ')
          });
          
          // Add web search results to the enhanced message
          enhancedUserMessage = hasEnhancements 
            ? `${enhancedUserMessage}\n\nWeb search results:\n${JSON.stringify(searchResults, null, 2)}`
            : `
Original request: ${userMessage}

Web search results:
${JSON.stringify(searchResults, null, 2)}

Based on these search results and your knowledge, please provide a comprehensive research response.`;
          
          hasEnhancements = true;
        } catch (error) {
          console.error('Error using web browser tool:', error);
        }
      }
    }
    
    // Store the user message in the deep research database for future reference
    if (deepResearch) {
      try {
        await deepResearch.execute({
          action: 'store',
          query: userMessage,
          metadata: {
            type: 'user_query',
            workspaceId: workspaceId,
            agentId: this.getId(),
            timestamp: Date.now()
          },
          collection: 'agent_interactions'
        });
      } catch (error) {
        console.error('Error storing user message in deep research:', error);
      }
    }
    
    // Generate response with enhanced message or fall back to standard
    const response = await super.generateResponse(workspaceId, enhancedUserMessage);
    
    // Store the response in the deep research database for future reference
    if (deepResearch) {
      try {
        await deepResearch.execute({
          action: 'store',
          query: response,
          metadata: {
            type: 'agent_response',
            workspaceId: workspaceId,
            agentId: this.getId(),
            timestamp: Date.now()
          },
          collection: 'agent_interactions'
        });
      } catch (error) {
        console.error('Error storing response in deep research:', error);
      }
    }
    
    return response;
  }
  
  private shouldUseWebSearch(userMessage: string): boolean {
    // Determine if this request likely needs web search
    // Simple heuristics for now
    const searchTerms = [
      'search', 'find', 'look up', 'research', 'information about',
      'latest', 'current', 'recent', 'news', 'data on'
    ];
    
    const lowercaseMessage = userMessage.toLowerCase();
    return searchTerms.some(term => lowercaseMessage.includes(term));
  }
  
  private async generateSearchQueries(userMessage: string): Promise<string[]> {
    // Ask LLM to generate search queries
    const systemPrompt = `You are a search query generator. Based on the user's research request, generate 3 effective search queries that would help find relevant information. Return only the queries as a valid JSON array of strings. Do not include any additional explanation.`;
    
    try {
      const result = await this.llmManager.generateResponse({
        provider: this.agentData.provider,
        model: this.agentData.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        maxTokens: 500
      });
      
      const content = result.choices[0].message.content;
      
      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: split by newlines and clean up
      return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('"') && !line.startsWith('[') && !line.startsWith(']'));
    } catch (error) {
      console.error('Error generating search queries:', error);
      // Fallback to a simple query based on input
      return [userMessage];
    }
  }
}
