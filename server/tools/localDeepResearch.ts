import axios from 'axios';
import { Tool } from '@shared/schema';
import { ITool } from './toolManager';

/**
 * Tool for integrating with the local-deep-research library
 * https://github.com/LearningCircuit/local-deep-research
 */
export class LocalDeepResearchTool implements ITool {
  private baseUrl: string;
  private tool: Tool;
  
  constructor(tool: Tool) {
    this.tool = tool;
    // Default to localhost:5000 if no config is provided
    this.baseUrl = (tool.config as any)?.baseUrl || 'http://localhost:5000';
  }
  
  getName(): string {
    return this.tool.name;
  }
  
  getType(): string {
    return this.tool.type;
  }
  
  getDescription(): string {
    return this.tool.description || 'Semantic search and document storage for advanced research capabilities';
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
          enum: ['search', 'store', 'delete', 'get_collections', 'retrieve_context'],
          description: 'The action to perform with the local deep research tool'
        },
        query: {
          type: 'string',
          description: 'The search query or document content'
        },
        collection: {
          type: 'string',
          description: 'The collection name to search or store in'
        },
        documentId: {
          type: 'string',
          description: 'The document ID to delete or retrieve'
        },
        metadata: {
          type: 'object',
          description: 'Metadata to associate with the document'
        },
        topK: {
          type: 'number',
          description: 'Number of results to return for search operations'
        },
        workspaceId: {
          type: 'number',
          description: 'The workspace ID to filter results by'
        }
      },
      required: ['action']
    };
  }
  
  async execute(params: any): Promise<any> {
    const { action } = params;
    
    switch (action) {
      case 'search':
        return this.semanticSearch(
          params.query, 
          params.collection || 'default', 
          params.topK || 5
        );
        
      case 'store':
        return this.storeDocument(
          params.query, 
          params.metadata || {}, 
          params.collection || 'default'
        );
        
      case 'delete':
        return this.deleteDocument(
          params.documentId, 
          params.collection || 'default'
        );
        
      case 'get_collections':
        return this.getCollections();
        
      case 'retrieve_context':
        return this.retrieveRelevantContext(
          params.query,
          params.workspaceId,
          params.topK || 5
        );
        
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`
        };
    }
  }
  
  /**
   * Get the tool's configuration
   */
  getConfig(): Tool {
    return this.tool;
  }
  
  /**
   * Store a document for indexing and later retrieval
   */
  async storeDocument(
    document: string, 
    metadata: Record<string, any> = {},
    collectionName: string = 'default'
  ): Promise<{ success: boolean; documentId?: string; error?: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/store`, {
        document,
        metadata,
        collection: collectionName
      });
      
      if (response.status === 200) {
        return { 
          success: true, 
          documentId: response.data.document_id 
        };
      } else {
        return { 
          success: false, 
          error: `Server responded with status ${response.status}` 
        };
      }
    } catch (error) {
      console.error('Error storing document:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Search for similar documents based on a query
   */
  async semanticSearch(
    query: string, 
    collectionName: string = 'default', 
    topK: number = 5
  ): Promise<{ 
    success: boolean; 
    results?: Array<{ 
      document: string; 
      metadata: Record<string, any>; 
      score: number 
    }>; 
    error?: string 
  }> {
    try {
      const response = await axios.post(`${this.baseUrl}/search`, {
        query,
        collection: collectionName,
        top_k: topK
      });
      
      if (response.status === 200) {
        // Check if results exist before trying to map them
        if (response.data && Array.isArray(response.data.results)) {
          return { 
            success: true, 
            results: response.data.results.map((result: any) => ({
              document: result.document,
              metadata: result.metadata,
              score: result.score
            })) 
          };
        } else {
          // Handle case where results are missing or not an array
          console.log('Warning: No valid results array in search response', response.data);
          return {
            success: true,
            results: [] // Return empty results array instead of undefined
          };
        }
      } else {
        return { 
          success: false, 
          error: `Server responded with status ${response.status}` 
        };
      }
    } catch (error) {
      console.error('Error during semantic search:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Delete a document from the index
   */
  async deleteDocument(
    documentId: string,
    collectionName: string = 'default'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.delete(`${this.baseUrl}/document`, {
        data: {
          document_id: documentId,
          collection: collectionName
        }
      });
      
      if (response.status === 200) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `Server responded with status ${response.status}` 
        };
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Get information about the available collections
   */
  async getCollections(): Promise<{ 
    success: boolean; 
    collections?: Array<{ 
      name: string; 
      documentCount: number 
    }>; 
    error?: string 
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/collections`);
      
      if (response.status === 200) {
        // Check if collections exist before trying to map them
        if (response.data && Array.isArray(response.data.collections)) {
          return { 
            success: true, 
            collections: response.data.collections.map((collection: any) => ({
              name: collection.name,
              documentCount: collection.document_count
            }))
          };
        } else {
          // Handle case where collections are missing or not an array
          console.log('Warning: No valid collections array in response', response.data);
          return {
            success: true,
            collections: [] // Return empty collections array instead of undefined
          };
        }
      } else {
        return { 
          success: false, 
          error: `Server responded with status ${response.status}` 
        };
      }
    } catch (error) {
      console.error('Error getting collections:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Store a chunk of text from agent interactions in the research database
   */
  async storeAgentInteraction(
    content: string,
    agentId: number,
    workspaceId: number,
    messageId: number
  ): Promise<{ success: boolean; error?: string }> {
    // Create metadata for the agent interaction
    const metadata = {
      source: 'agent_interaction',
      agentId,
      workspaceId,
      messageId,
      timestamp: Date.now()
    };
    
    // Store in the 'agent_interactions' collection
    return this.storeDocument(content, metadata, 'agent_interactions');
  }
  
  /**
   * Retrieve relevant context based on a query from agent interactions
   */
  async retrieveRelevantContext(
    query: string,
    workspaceId?: number,
    topK: number = 5
  ): Promise<string> {
    try {
      // Search in the agent_interactions collection
      const results = await this.semanticSearch(query, 'agent_interactions', topK);
      
      if (!results.success || !results.results || results.results.length === 0) {
        console.log('No relevant context found or search was unsuccessful');
        return '';
      }
      
      // If workspace ID is provided, filter by workspace
      let filteredResults = results.results;
      if (workspaceId !== undefined) {
        filteredResults = results.results.filter(result => {
          try {
            return result.metadata && result.metadata.workspaceId === workspaceId;
          } catch (error) {
            console.warn('Error filtering result by workspaceId:', error);
            return false;
          }
        });
      }
      
      // Handle no results after filtering
      if (filteredResults.length === 0) {
        console.log('No results remaining after workspace filtering');
        return '';
      }
      
      // Format the results into a coherent context summary
      const contextPieces = filteredResults.map(result => {
        try {
          // Include a score indicator (higher score = more relevant)
          const relevanceIndicator = `[Relevance: ${Math.round((result.score || 0) * 100)}%]`;
          return `${relevanceIndicator}\n${result.document || 'No content available'}\n`;
        } catch (error) {
          console.warn('Error formatting search result:', error);
          return '[Error formatting result]';
        }
      });
      
      return contextPieces.join('\n---\n\n');
    } catch (error) {
      console.error('Error in retrieveRelevantContext:', error);
      // Return empty string rather than letting the error propagate
      return '';
    }
  }
}