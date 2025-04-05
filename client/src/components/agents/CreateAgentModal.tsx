import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useAgentContext } from "@/context/AgentContext";
import { LLMProviderSettings } from "@shared/schema";
import { Info } from "lucide-react";

interface CreateAgentModalProps {
  onClose: () => void;
}

export default function CreateAgentModal({ onClose }: CreateAgentModalProps) {
  const { createAgent } = useAgentContext();
  const [name, setName] = useState("");
  const [type, setType] = useState("research");
  const [model, setModel] = useState("gpt-4o");
  const [provider, setProvider] = useState("openai");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4000);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [providerSettings, setProviderSettings] = useState<LLMProviderSettings[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch provider settings when component mounts
  useEffect(() => {
    const fetchProviderSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/llm-providers');
        if (response.ok) {
          const data = await response.json();
          setProviderSettings(data);
        }
      } catch (error) {
        console.error('Error fetching LLM provider settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProviderSettings();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    await createAgent({
      name,
      type,
      model,
      provider,
      systemPrompt,
      temperature,
      maxTokens: maxTokens,
      tools: selectedTools,
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} agent`,
      isActive: true
    });

    onClose();
  };

  const handleToolToggle = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId) 
        : [...prev, toolId]
    );
  };

  // Update available models when provider changes
  useEffect(() => {
    if (provider.startsWith('litellm-')) {
      const actualProvider = provider.replace('litellm-', '');
      
      // Fetch models for this LiteLLM provider
      fetch(`/api/litellm-models/${actualProvider}`)
        .then(response => response.json())
        .then(data => {
          if (data && data.models) {
            setAvailableModels(data.models);
            if (data.models.length > 0) {
              setModel(data.models[0]);
            }
          }
        })
        .catch(error => console.error(`Error fetching models for ${provider}:`, error));
    } else {
      // Find the provider in our settings
      const providerSetting = providerSettings.find(p => p.provider === provider);
      if (providerSetting && providerSetting.models && providerSetting.models.length > 0) {
        setAvailableModels(providerSetting.models);
        setModel(providerSetting.models[0]);
      } else {
        // For built-in providers without configured models, set default models
        switch (provider) {
          case "openai":
            setAvailableModels(["gpt-4o", "gpt-4", "gpt-3.5-turbo"]);
            setModel("gpt-4o");
            break;
          case "anthropic":
            setAvailableModels(["claude-3-7-sonnet-20250219", "claude-3-opus-20240229", "claude-3-haiku-20240307"]);
            setModel("claude-3-7-sonnet-20250219");
            break;
          case "ollama":
            setAvailableModels(["llama3", "mistral", "codellama"]);
            setModel("llama3");
            break;
          case "lmstudio":
            setAvailableModels(["local-model"]);
            setModel("local-model");
            break;
          case "perplexity":
            setAvailableModels(["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online"]);
            setModel("llama-3.1-sonar-small-128k-online");
            break;
          case "xai":
            setAvailableModels(["grok-2-1212", "grok-vision-beta"]);
            setModel("grok-2-1212");
            break;
          case "deepseek":
            setAvailableModels(["deepseek-chat", "deepseek-coder", "deepseek-llm-7b-chat"]);
            setModel("deepseek-chat");
            break;
          default:
            setAvailableModels([]);
        }
      }
    }
  }, [provider, providerSettings]);

  // When provider changes, update model options
  const handleProviderChange = (value: string) => {
    setProvider(value);
    
    // Set default model for the provider - this is now handled by the useEffect that watches provider changes
    // If the provider has configured models in Settings, they'll be used
    // Otherwise, the defaults below are used as fallbacks
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

  const renderModelOptions = () => {
    // If we have available models from provider settings or LiteLLM
    if (availableModels.length > 0) {
      return (
        <>
          {availableModels.map(modelName => (
            <SelectItem key={modelName} value={modelName}>
              {modelName}
            </SelectItem>
          ))}
        </>
      );
    }
    
    // Default built-in providers
    switch (provider) {
      case "openai":
        return (
          <>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4">GPT-4</SelectItem>
            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
          </>
        );
      case "anthropic":
        return (
          <>
            <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</SelectItem>
            <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
            <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
            <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
          </>
        );
      case "ollama":
        return (
          <>
            <SelectItem value="ollama/llama3">Llama 3</SelectItem>
            <SelectItem value="ollama/llama2">Llama 2</SelectItem>
            <SelectItem value="ollama/mistral">Mistral</SelectItem>
            <SelectItem value="ollama/codellama">Code Llama</SelectItem>
          </>
        );
      case "lmstudio":
        return (
          <>
            <SelectItem value="lmstudio/mistral">Mistral</SelectItem>
            <SelectItem value="lmstudio/llama2">Llama 2</SelectItem>
            <SelectItem value="lmstudio/openchat">OpenChat</SelectItem>
          </>
        );
      case "perplexity":
        return (
          <>
            <SelectItem value="llama-3.1-sonar-small-128k-online">Llama 3.1 Sonar Small</SelectItem>
            <SelectItem value="llama-3.1-sonar-large-128k-online">Llama 3.1 Sonar Large</SelectItem>
            <SelectItem value="llama-3.1-sonar-huge-128k-online">Llama 3.1 Sonar Huge</SelectItem>
          </>
        );
      case "xai":
        return (
          <>
            <SelectItem value="grok-2-1212">Grok 2</SelectItem>
            <SelectItem value="grok-2-vision-1212">Grok 2 Vision</SelectItem>
            <SelectItem value="grok-vision-beta">Grok Vision Beta</SelectItem>
            <SelectItem value="grok-beta">Grok Beta</SelectItem>
          </>
        );
      case "deepseek":
        return (
          <>
            <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
            <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
            <SelectItem value="deepseek-llm-7b-chat">DeepSeek LLM 7B Chat</SelectItem>
          </>
        );
      case "litellm":
        return (
          <>
            <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
            <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 (Anthropic)</SelectItem>
            <SelectItem value="mistral-large-latest">Mistral Large</SelectItem>
            <SelectItem value="llama3-70b-8192">Llama 3 70B (Groq)</SelectItem>
          </>
        );
      default:
        // If it's a custom provider with no models set yet
        if (provider.startsWith('litellm-')) {
          return (
            <SelectItem value="default-model">
              Default model
            </SelectItem>
          );
        }
        return null;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="agent-name">Agent Name</Label>
            <Input 
              id="agent-name" 
              placeholder="My Custom Agent" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="agent-type">Agent Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orchestrator">Orchestrator</SelectItem>
                <SelectItem value="research">Research Agent</SelectItem>
                <SelectItem value="code">Coding Agent</SelectItem>
                <SelectItem value="writer">Writing Agent</SelectItem>
                <SelectItem value="data">Data Analysis Agent</SelectItem>
                <SelectItem value="custom">Custom Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="llm-provider">LLM Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
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
                {providerSettings
                  .filter(p => p.provider.startsWith('litellm-'))
                  .map(p => (
                    <SelectItem key={p.provider} value={p.provider}>
                      {p.provider.replace('litellm-', '')} (LiteLLM)
                    </SelectItem>
                  ))
                }
                
                {/* Custom OpenAI-compatible providers - configured in settings */}
                {providerSettings
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
          
          <div className="grid gap-2">
            <Label htmlFor="llm-model">LLM Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.length > 0 ? (
                  availableModels.map(modelName => (
                    <SelectItem key={modelName} value={modelName}>
                      {modelName}
                    </SelectItem>
                  ))
                ) : (
                  renderModelOptions()
                )}
              </SelectContent>
            </Select>
            {availableModels.length > 0 && (
              <div className="flex items-center mt-1">
                <Info className="w-4 h-4 mr-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  These models are configured in Settings → LLM Providers
                </p>
              </div>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea 
              id="system-prompt" 
              placeholder="You are a specialized agent that..." 
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="h-20 resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input 
                id="temperature" 
                type="number" 
                min="0" 
                max="2" 
                step="0.1" 
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input 
                id="max-tokens" 
                type="number" 
                min="100" 
                step="100" 
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label>Available Tools</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="web-browser" 
                  checked={selectedTools.includes("web_browser")}
                  onCheckedChange={() => handleToolToggle("web_browser")}
                />
                <Label htmlFor="web-browser" className="cursor-pointer">Web Browser</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="file-system" 
                  checked={selectedTools.includes("file_system")}
                  onCheckedChange={() => handleToolToggle("file_system")}
                />
                <Label htmlFor="file-system" className="cursor-pointer">File System</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="code-execution" 
                  checked={selectedTools.includes("code_execution")}
                  onCheckedChange={() => handleToolToggle("code_execution")}
                />
                <Label htmlFor="code-execution" className="cursor-pointer">Code Execution</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="api-connector" 
                  checked={selectedTools.includes("api_connector")}
                  onCheckedChange={() => handleToolToggle("api_connector")}
                />
                <Label htmlFor="api-connector" className="cursor-pointer">API Connector</Label>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit}>Create Agent</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
