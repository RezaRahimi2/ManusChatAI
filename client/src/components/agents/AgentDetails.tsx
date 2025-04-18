import { useState, useEffect } from "react";
import { useAgentContext } from "@/context/AgentContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LLMProviderSettings } from "@shared/schema";

interface AgentDetailsProps {
  onClose: () => void;
}

export default function AgentDetails({ onClose }: AgentDetailsProps) {
  const { selectedAgent, updateAgent } = useAgentContext();
  
  const [model, setModel] = useState(selectedAgent?.model || "");
  const [systemPrompt, setSystemPrompt] = useState(selectedAgent?.systemPrompt || "");
  const [temperature, setTemperature] = useState(selectedAgent?.temperature ? selectedAgent.temperature / 100 : 0.7);
  const [maxTokens, setMaxTokens] = useState(selectedAgent?.maxTokens || 4000);
  const [selectedTools, setSelectedTools] = useState<string[]>(selectedAgent?.tools || []);
  const [providerSettings, setProviderSettings] = useState<Record<string, LLMProviderSettings>>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch provider settings and models when component mounts
  useEffect(() => {
    const fetchProviderSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/llm-providers');
        if (response.ok) {
          const data = await response.json();
          
          // Convert array to provider -> settings map
          const settingsMap: Record<string, LLMProviderSettings> = {};
          data.forEach((provider: LLMProviderSettings) => {
            settingsMap[provider.provider] = provider;
          });
          
          setProviderSettings(settingsMap);
        }
      } catch (error) {
        console.error('Error fetching LLM provider settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProviderSettings();
  }, []);
  
  // Update models when selected agent changes
  useEffect(() => {
    if (selectedAgent) {
      const provider = selectedAgent.provider;
      
      // Check if this is a LiteLLM provider
      if (provider.startsWith('litellm-')) {
        const actualProvider = provider.replace('litellm-', '');
        
        // Fetch models for this LiteLLM provider
        fetch(`/api/litellm-models/${actualProvider}`)
          .then(response => response.json())
          .then(data => {
            if (data && data.models) {
              setAvailableModels(data.models);
            }
          })
          .catch(error => console.error(`Error fetching models for ${provider}:`, error));
      } else if (providerSettings[provider] && providerSettings[provider].models) {
        // Use models from provider settings
        setAvailableModels(providerSettings[provider].models || []);
      } else {
        // Reset models for built-in providers (will use renderModelOptions defaults)
        setAvailableModels([]);
      }
    }
  }, [selectedAgent, providerSettings]);
  
  if (!selectedAgent) return null;

  // When provider changes, update model options
  const [provider, setProvider] = useState(selectedAgent?.provider || "openai");

  useEffect(() => {
    // When selected agent changes, update the provider state
    if (selectedAgent) {
      setProvider(selectedAgent.provider);
    }
  }, [selectedAgent]);

  const handleToolToggle = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId) 
        : [...prev, toolId]
    );
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    
    // Set default model for the provider
    switch (value) {
      case "openai":
        setModel("gpt-4o");
        break;
      case "anthropic":
        setModel("claude-3-7-sonnet-20250219");
        break;
      case "ollama":
        setModel("llama3");
        break;
      case "lmstudio":
        setModel("local-model");
        break;
      case "perplexity":
        setModel("llama-3.1-sonar-small-128k-online");
        break;
      case "xai":
        setModel("grok-2-1212");
        break;
      case "deepseek":
        setModel("deepseek-chat");
        break;
      case "litellm":
        setModel("gpt-4o");
        break;
    }
  };

  const handleSave = async () => {
    if (selectedAgent) {
      await updateAgent({
        ...selectedAgent,
        provider,
        model,
        systemPrompt,
        temperature,
        maxTokens,
        tools: selectedTools
      });
    }
  };

  const handleReset = () => {
    if (selectedAgent) {
      setModel(selectedAgent.model);
      setSystemPrompt(selectedAgent.systemPrompt || "");
      setTemperature(selectedAgent.temperature ? selectedAgent.temperature / 100 : 0.7);
      setMaxTokens(selectedAgent.maxTokens || 4000);
      setSelectedTools(selectedAgent.tools || []);
    }
  };

  const renderModelOptions = () => {
    // Get the appropriate default models based on provider
    const getDefaultModels = () => {
      switch (provider) {
        case "openai":
          return ["gpt-4o", "gpt-4", "gpt-3.5-turbo"];
        case "anthropic":
          return ["claude-3-7-sonnet-20250219", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku"];
        case "ollama":
          return ["ollama/llama3", "ollama/llama2", "ollama/mistral", "ollama/codellama"];
        case "lmstudio":
          return ["lmstudio/mistral", "lmstudio/llama2", "lmstudio/openchat"];
        case "perplexity":
          return ["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-huge-128k-online"];
        case "xai":
          return ["grok-2-1212", "grok-2-vision-1212", "grok-vision-beta", "grok-beta"];
        case "deepseek":
          return ["deepseek-chat", "deepseek-coder", "deepseek-llm-7b-chat"];
        case "litellm":
          return ["gpt-4o", "claude-3-7-sonnet-20250219", "mistral-large-latest", "llama3-70b-8192"];
        default:
          return provider.startsWith('litellm-') ? ["default-model"] : [];
      }
    };
    
    // Combine default models with any custom models from provider settings
    const defaultModels = getDefaultModels();
    let combinedModels = [...defaultModels];
    
    // Add models from provider settings if they're not already in the defaults
    if (providerSettings[provider] && providerSettings[provider].models) {
      const settingsModels = providerSettings[provider].models || [];
      settingsModels.forEach(model => {
        if (!combinedModels.includes(model)) {
          combinedModels.push(model);
        }
      });
    }
    
    // If this is a LiteLLM provider, use availableModels instead
    if (provider.startsWith('litellm-') && availableModels.length > 0) {
      combinedModels = availableModels;
    }
    
    // Generate the SelectItem components
    return (
      <>
        {combinedModels.map(modelName => (
          <SelectItem key={modelName} value={modelName}>
            {modelName}
          </SelectItem>
        ))}
      </>
    );
  };

  // Agent icon color based on type
  const getAgentColor = (type: string) => {
    switch (type) {
      case "orchestrator": return "bg-primary-500";
      case "enhanced_orchestrator": return "bg-primary-600";
      case "research": return "bg-secondary-400";
      case "code": return "bg-accent-500";
      case "writer": return "bg-success-500";
      case "planner": return "bg-amber-500";
      case "thinker": return "bg-indigo-500";
      case "agno": return "bg-emerald-500";
      default: return "bg-neutral-500";
    }
  };

  // Agent icon based on type
  const getAgentIcon = (type: string) => {
    switch (type) {
      case "orchestrator": return "smart_toy";
      case "enhanced_orchestrator": return "precision_manufacturing";
      case "research": return "search";
      case "code": return "code";
      case "writer": return "edit";
      case "planner": return "view_timeline";
      case "thinker": return "psychology";
      case "agno": return "memory";
      default: return "engineering";
    }
  };

  return (
    <aside className="w-72 border-l border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <h2 className="font-medium text-sm uppercase text-neutral-500 dark:text-neutral-400">Agent Details</h2>
        <button 
          className="p-1 text-neutral-500 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
          onClick={onClose}
        >
          <span className="material-icons text-sm">close</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full ${getAgentColor(selectedAgent.type)} flex items-center justify-center mr-3`}>
              <span className="material-icons text-white text-sm">{getAgentIcon(selectedAgent.type)}</span>
            </div>
            <div>
              <h3 className="font-medium">{selectedAgent.name}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{selectedAgent.description}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <Label className="block text-xs font-medium mb-1">LLM Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {/* Top tier cloud providers */}
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="perplexity">Perplexity AI</SelectItem>
                <SelectItem value="xai">xAI (Grok)</SelectItem>
                <SelectItem value="deepseek">DeepSeek AI</SelectItem>
                
                {/* Local providers */}
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                <SelectItem value="lmstudio">LM Studio (Local)</SelectItem>
                
                {/* LiteLLM proxy */}
                <SelectItem value="litellm">LiteLLM</SelectItem>
                
                {/* Custom LiteLLM providers - configured in settings */}
                {Object.values(providerSettings)
                  .filter(p => p.provider.startsWith('litellm-'))
                  .map(p => (
                    <SelectItem key={p.provider} value={p.provider}>
                      {p.provider.replace('litellm-', '')} (LiteLLM)
                    </SelectItem>
                  ))
                }
                
                {/* Custom OpenAI-compatible providers - configured in settings */}
                {Object.values(providerSettings)
                  .filter(p => !['openai', 'anthropic', 'ollama', 'lmstudio', 'perplexity', 'xai', 'deepseek', 'litellm'].includes(p.provider) && 
                              !p.provider.startsWith('litellm-'))
                  .map(p => (
                    <SelectItem key={p.provider} value={p.provider}>
                      {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)} (Custom)
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          
          <div className="mt-4">
            <Label className="block text-xs font-medium mb-1">LLM Model</Label>
            <Select 
              value={model} 
              onValueChange={setModel}
              onOpenChange={(open) => {
                // Refresh provider settings when dropdown is opened
                if (open) {
                  const fetchProviderSettings = async () => {
                    try {
                      const response = await fetch('/api/llm-providers');
                      if (response.ok) {
                        const data = await response.json();
                        
                        // Convert array to provider -> settings map
                        const settingsMap: Record<string, LLMProviderSettings> = {};
                        data.forEach((provider: LLMProviderSettings) => {
                          settingsMap[provider.provider] = provider;
                        });
                        
                        setProviderSettings(settingsMap);
                        
                        // Update available models if this provider is selected
                        if (provider && settingsMap[provider] && settingsMap[provider].models) {
                          setAvailableModels(settingsMap[provider].models || []);
                        }
                      }
                    } catch (error) {
                      console.error('Error refreshing LLM provider settings:', error);
                    }
                  };
                  
                  fetchProviderSettings();
                }
              }}
            >
              <SelectTrigger className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {renderModelOptions()}
              </SelectContent>
            </Select>
            <div className="flex items-center mt-1">
              <span className="material-icons text-neutral-500 text-xs mr-1">info</span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Models include both defaults and those configured in Settings
              </p>
            </div>
          </div>
          
          <div className="mt-4">
            <Label className="block text-xs font-medium mb-1">System Prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-sm h-32 resize-none"
            />
          </div>
          
          <div className="flex mt-4">
            <div className="flex-1 pr-1">
              <Label className="block text-xs font-medium mb-1">Temperature</Label>
              <div className="flex items-center">
                <Slider 
                  value={[temperature]} 
                  min={0} 
                  max={2} 
                  step={0.1} 
                  onValueChange={(vals) => setTemperature(vals[0])}
                  className="flex-1 mr-2"
                />
                <span className="text-sm w-8">{temperature.toFixed(1)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Label className="block text-xs font-medium mb-1">Max Tokens</Label>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              min="100"
              step="100"
              className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg"
            />
          </div>
        </div>
        
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="font-medium text-sm mb-2">Available Tools</h3>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="web-browser-details" 
                checked={selectedTools.includes("web_browser")}
                onCheckedChange={() => handleToolToggle("web_browser")}
              />
              <Label htmlFor="web-browser-details" className="text-sm cursor-pointer">Web Browser</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="file-system-details" 
                checked={selectedTools.includes("file_system")}
                onCheckedChange={() => handleToolToggle("file_system")}
              />
              <Label htmlFor="file-system-details" className="text-sm cursor-pointer">File System</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="code-execution-details" 
                checked={selectedTools.includes("code_execution")}
                onCheckedChange={() => handleToolToggle("code_execution")}
              />
              <Label htmlFor="code-execution-details" className="text-sm cursor-pointer">Code Execution</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="api-connector-details" 
                checked={selectedTools.includes("api_connector")}
                onCheckedChange={() => handleToolToggle("api_connector")}
              />
              <Label htmlFor="api-connector-details" className="text-sm cursor-pointer">API Connector</Label>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-sm">Memory Configuration</h3>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Settings</span>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-medium">Short-term Memory</Label>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">10 messages</span>
              </div>
              <Slider
                defaultValue={[10]}
                min={5}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-medium">Vector Memory</Label>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Enabled</span>
              </div>
              <Select defaultValue="in-memory">
                <SelectTrigger className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chromadb">ChromaDB</SelectItem>
                  <SelectItem value="pinecone">Pinecone</SelectItem>
                  <SelectItem value="redis">Redis</SelectItem>
                  <SelectItem value="in-memory">In-memory</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <Button
          className="w-full"
          onClick={handleSave}
        >
          Save Configuration
        </Button>
        
        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={handleReset}
        >
          Reset to Default
        </Button>
      </div>
    </aside>
  );
}
