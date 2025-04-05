import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { setupWebSocketHandlers } from "./socket";
import { agentManager } from "./agents/agentManager";
import { memoryManager } from "./memory/memory";
import { toolManager } from "./tools/toolManager";
import { LLMManager } from "./llm/llmManager";
import { testLiteLLMConnection, LITELLM_PROVIDERS, getSupportedModelsForProvider } from "./llm/litellmManager";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  setupWebSocketHandlers(wss, agentManager);
  
  // Initialize the agent manager
  await agentManager.initialize();
  
  // API Routes
  
  // Agents API
  app.get('/api/agents', async (req, res) => {
    try {
      const agents = await agentManager.getAllAgents();
      res.json(agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  });
  
  app.get('/api/agents/:id', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const agent = await agentManager.getAgentById(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json(agent);
    } catch (error) {
      console.error('Error fetching agent:', error);
      res.status(500).json({ error: 'Failed to fetch agent' });
    }
  });
  
  app.post('/api/agents', async (req, res) => {
    try {
      const newAgent = await agentManager.createAgent(req.body);
      res.status(201).json(newAgent);
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({ error: 'Failed to create agent' });
    }
  });
  
  app.put('/api/agents/:id', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      console.log(`Updating agent ${agentId} with data:`, JSON.stringify(req.body));
      
      const updatedAgent = await agentManager.updateAgent(agentId, req.body);
      
      if (!updatedAgent) {
        console.log(`Agent ${agentId} not found for update`);
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      console.log(`Successfully updated agent ${agentId}:`, JSON.stringify(updatedAgent));
      res.json(updatedAgent);
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });
  
  app.patch('/api/agents/:id', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      console.log(`Patching agent ${agentId} with data:`, JSON.stringify(req.body));
      
      const updatedAgent = await agentManager.updateAgent(agentId, req.body);
      
      if (!updatedAgent) {
        console.log(`Agent ${agentId} not found for patch`);
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      console.log(`Successfully patched agent ${agentId}:`, JSON.stringify(updatedAgent));
      res.json(updatedAgent);
    } catch (error) {
      console.error('Error patching agent:', error);
      res.status(500).json({ error: 'Failed to patch agent' });
    }
  });
  
  app.delete('/api/agents/:id', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      await agentManager.deleteAgent(agentId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting agent:', error);
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  });
  
  // Workspaces API
  app.get('/api/workspaces', async (req, res) => {
    try {
      const workspaces = await storage.getAllWorkspaces();
      res.json(workspaces);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  });
  
  app.get('/api/workspaces/:id', async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const workspace = await storage.getWorkspaceById(workspaceId);
      
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      res.json(workspace);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      res.status(500).json({ error: 'Failed to fetch workspace' });
    }
  });
  
  app.post('/api/workspaces', async (req, res) => {
    try {
      const newWorkspace = await storage.createWorkspace({
        ...req.body,
        createdAt: Date.now()
      });
      res.status(201).json(newWorkspace);
    } catch (error) {
      console.error('Error creating workspace:', error);
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  });
  
  app.delete('/api/workspaces/:id', async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      await storage.deleteWorkspace(workspaceId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting workspace:', error);
      res.status(500).json({ error: 'Failed to delete workspace' });
    }
  });
  
  // Messages API
  app.get('/api/messages', async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;
      
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }
      
      const messages = await storage.getMessagesByWorkspace(workspaceId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });
  
  // Tools API
  app.get('/api/tools', async (req, res) => {
    try {
      const tools = await toolManager.getAllTools();
      res.json(tools);
    } catch (error) {
      console.error('Error fetching tools:', error);
      res.status(500).json({ error: 'Failed to fetch tools' });
    }
  });
  
  // LLM Provider Settings API
  app.get('/api/llm-providers', async (req, res) => {
    try {
      const providers = await storage.getAllLLMProviderSettings();
      res.json(providers);
    } catch (error) {
      console.error('Error fetching LLM providers:', error);
      res.status(500).json({ error: 'Failed to fetch LLM providers' });
    }
  });
  
  app.get('/api/llm-providers/:provider', async (req, res) => {
    try {
      const providerName = req.params.provider;
      const provider = await storage.getLLMProviderSettings(providerName);
      
      if (!provider) {
        return res.status(404).json({ error: 'LLM provider not found' });
      }
      
      res.json(provider);
    } catch (error) {
      console.error('Error fetching LLM provider:', error);
      res.status(500).json({ error: 'Failed to fetch LLM provider' });
    }
  });
  
  app.post('/api/llm-providers', async (req, res) => {
    try {
      console.log('Received LLM provider settings:', JSON.stringify(req.body, null, 2));
      
      const { llmProviderSettingsSchema } = await import('@shared/schema');
      const result = llmProviderSettingsSchema.safeParse(req.body);
      
      if (!result.success) {
        console.error('Validation error:', JSON.stringify(result.error, null, 2));
        return res.status(400).json({ error: 'Invalid LLM provider settings', details: result.error });
      }
      
      const provider = await storage.setLLMProviderSettings(result.data);
      res.status(201).json(provider);
    } catch (error) {
      console.error('Error updating LLM provider:', error);
      res.status(500).json({ error: 'Failed to update LLM provider' });
    }
  });
  
  // LLM Test Endpoint
  app.post('/api/llm-test', async (req, res) => {
    try {
      const { provider, model } = req.body;
      
      if (!provider) {
        return res.status(400).json({ error: 'Provider is required' });
      }
      
      // Create a simple test message
      const testMessages = [
        { role: 'user', content: 'Say "Connection successful" if you can see this message' }
      ];
      
      // Use the imported LLM manager
      const llmManager = new LLMManager();
      
      // Get provider settings to determine default model
      const providerSettings = await storage.getLLMProviderSettings(provider);
      let defaultModel = 'default-model';
      
      // Set appropriate default model based on provider
      if (provider === 'openai') {
        defaultModel = 'gpt-4o';
      } else if (provider === 'anthropic') {
        defaultModel = 'claude-3-7-sonnet-20250219';
      } else if (provider === 'ollama') {
        defaultModel = 'llama3';
      } else if (provider === 'lmstudio') {
        defaultModel = 'local-model';
      } else if (provider === 'perplexity') {
        defaultModel = 'llama-3.1-sonar-small-128k-online';
      } else if (provider === 'xai') {
        defaultModel = 'grok-2-1212';
      } else if (provider === 'deepseek') {
        defaultModel = 'deepseek-chat';
      } else if (providerSettings && providerSettings.models && providerSettings.models.length > 0) {
        // For custom providers, use the first model in their list if available
        defaultModel = providerSettings.models[0];
      }
      
      const response = await llmManager.generateResponse({
        provider,
        model: model || defaultModel,
        messages: testMessages,
        maxTokens: 50
      });
      
      res.json({
        success: true,
        response: response.choices[0]?.message?.content || 'No response content'
      });
    } catch (error) {
      console.error('Error testing LLM connection:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // LiteLLM Models/Connection Test Endpoint
  app.post('/api/litellm-test', async (req, res) => {
    try {
      const { provider, apiKey, baseUrl, model } = req.body;
      
      if (!provider) {
        return res.status(400).json({ error: 'Provider is required' });
      }
      
      // Test the connection to the LiteLLM provider and get available models
      const result = await testLiteLLMConnection(provider, apiKey, baseUrl, model);
      
      res.json(result);
    } catch (error) {
      console.error('Error testing LiteLLM connection:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Get LiteLLM supported providers
  app.get('/api/litellm-providers', async (req, res) => {
    try {
      res.json(LITELLM_PROVIDERS);
    } catch (error) {
      console.error('Error fetching LiteLLM providers:', error);
      res.status(500).json({ error: 'Failed to fetch LiteLLM providers' });
    }
  });
  
  // Get default models for a LiteLLM provider
  app.get('/api/litellm-models/:provider', async (req, res) => {
    try {
      const provider = req.params.provider;
      const models = getSupportedModelsForProvider(provider);
      
      res.json({
        provider,
        models
      });
    } catch (error) {
      console.error('Error fetching models for provider:', error);
      res.status(500).json({ error: 'Failed to fetch provider models' });
    }
  });
  
  return httpServer;
}
