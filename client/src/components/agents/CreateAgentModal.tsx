import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useAgentContext } from "@/context/AgentContext";

interface CreateAgentModalProps {
  onClose: () => void;
}

export default function CreateAgentModal({ onClose }: CreateAgentModalProps) {
  const { createAgent } = useAgentContext();
  const [name, setName] = useState("");
  const [type, setType] = useState("research");
  const [model, setModel] = useState("gpt-4");
  const [provider, setProvider] = useState("openai");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4000);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

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

  // When provider changes, update model options
  const handleProviderChange = (value: string) => {
    setProvider(value);
    
    // Set default model for the provider
    switch (value) {
      case "openai":
        setModel("gpt-4");
        break;
      case "anthropic":
        setModel("claude-3-sonnet");
        break;
      case "ollama":
        setModel("ollama/llama2");
        break;
      case "lmstudio":
        setModel("lmstudio/mistral");
        break;
    }
  };

  const renderModelOptions = () => {
    switch (provider) {
      case "openai":
        return (
          <>
            <SelectItem value="gpt-4">GPT-4</SelectItem>
            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
          </>
        );
      case "anthropic":
        return (
          <>
            <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
            <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
            <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
          </>
        );
      case "ollama":
        return (
          <>
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
      default:
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
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                <SelectItem value="lmstudio">LM Studio (Local)</SelectItem>
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
                {renderModelOptions()}
              </SelectContent>
            </Select>
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
