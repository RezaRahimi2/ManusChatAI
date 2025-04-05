import { Message } from '@shared/schema';
import { storage } from '../storage';

// Simple in-memory vector storage for demonstration
interface VectorEntry {
  id: number;
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
}

interface ShortTermMemoryConfig {
  maxMessages: number;
}

interface VectorMemoryConfig {
  dimensions: number;
  similarityThreshold: number;
}

interface MemoryConfig {
  shortTerm: ShortTermMemoryConfig;
  vector: VectorMemoryConfig;
}

export class MemoryManager {
  private config: MemoryConfig;
  private vectorStore: Map<number, VectorEntry[]> = new Map();
  
  constructor() {
    this.config = {
      shortTerm: {
        maxMessages: 20, // Default max messages in short-term memory
      },
      vector: {
        dimensions: 1536, // Default for OpenAI embeddings
        similarityThreshold: 0.75,
      }
    };
  }
  
  // Short-term memory methods
  async getShortTermMemory(workspaceId: number): Promise<Message[]> {
    try {
      const messages = await storage.getMessagesByWorkspace(workspaceId);
      // Sort by creation time and limit to max messages
      return messages
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-this.config.shortTerm.maxMessages);
    } catch (error) {
      console.error('Error getting short-term memory:', error);
      return [];
    }
  }
  
  async addToShortTermMemory(workspaceId: number, message: Message): Promise<void> {
    // Short-term memory is managed through storage
    // This is just a pass-through as we already store messages in the database
    // No additional action needed because getShortTermMemory fetches from storage
  }
  
  // Vector memory methods
  async addToVectorMemory(workspaceId: number, message: Message): Promise<void> {
    try {
      // Create a simple embedding (in a real system, you would use a proper embedding model)
      const embedding = await this.createEmbedding(message.content);
      
      // Get current vector store for this workspace or create a new one
      let workspaceVectors = this.vectorStore.get(workspaceId) || [];
      
      // Add new vector
      workspaceVectors.push({
        id: message.id,
        text: message.content,
        embedding,
        metadata: {
          role: message.role,
          createdAt: message.createdAt,
          agentId: message.agentId,
        }
      });
      
      // Update vector store
      this.vectorStore.set(workspaceId, workspaceVectors);
      
      console.log(`Added message ${message.id} to vector memory for workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error adding to vector memory:', error);
    }
  }
  
  async searchVectorMemory(workspaceId: number, query: string, limit: number = 5): Promise<Message[]> {
    try {
      // Get vectors for this workspace
      const workspaceVectors = this.vectorStore.get(workspaceId) || [];
      
      if (workspaceVectors.length === 0) {
        return [];
      }
      
      // Create embedding for query
      const queryEmbedding = await this.createEmbedding(query);
      
      // Calculate similarity scores
      const results = workspaceVectors.map(entry => ({
        entry,
        similarity: this.calculateCosineSimilarity(queryEmbedding, entry.embedding)
      }));
      
      // Sort by similarity and filter by threshold
      const filteredResults = results
        .filter(r => r.similarity >= this.config.vector.similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
      
      // Get message IDs
      const messageIds = filteredResults.map(r => r.entry.id);
      
      // Fetch full messages from storage
      const messages = await Promise.all(
        messageIds.map(id => storage.getMessageById(id))
      );
      
      // Filter out undefined messages
      return messages.filter((m): m is Message => m !== undefined);
    } catch (error) {
      console.error('Error searching vector memory:', error);
      return [];
    }
  }
  
  // Helper methods for vector operations
  private async createEmbedding(text: string): Promise<number[]> {
    // In a real system, you would call an embedding API (OpenAI, etc.)
    // This is a very simple mock implementation
    const hash = this.simpleHash(text);
    // Create a pseudo-random embedding vector of the configured dimension
    return Array.from({ length: this.config.vector.dimensions }, (_, i) => 
      Math.sin(hash + i) / 2 + 0.5
    );
  }
  
  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
  
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must be of the same dimension');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }
  
  // Memory store operations
  async storeMemory(key: string, value: string, metadata: Record<string, any> = {}): Promise<void> {
    try {
      await storage.createMemory({
        type: 'general',
        key,
        value,
        metadata,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error('Error storing memory:', error);
    }
  }
  
  async retrieveMemory(key: string): Promise<string | null> {
    try {
      const memory = await storage.getMemoryByKey(key);
      return memory?.value || null;
    } catch (error) {
      console.error('Error retrieving memory:', error);
      return null;
    }
  }
  
  async deleteMemory(key: string): Promise<void> {
    try {
      await storage.deleteMemoryByKey(key);
    } catch (error) {
      console.error('Error deleting memory:', error);
    }
  }
  
  // Configuration methods
  setShortTermConfig(config: Partial<ShortTermMemoryConfig>): void {
    this.config.shortTerm = {
      ...this.config.shortTerm,
      ...config,
    };
  }
  
  setVectorConfig(config: Partial<VectorMemoryConfig>): void {
    this.config.vector = {
      ...this.config.vector,
      ...config,
    };
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();
