import { useState } from "react";
import { useAgentContext } from "@/context/AgentContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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
  
  if (!selectedAgent) return null;

  // When provider changes, update model options
  const provider = selectedAgent.provider;

  const handleToolToggle = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId) 
        : [...prev, toolId]
    );
  };

  const handleSave = async () => {
    if (selectedAgent) {
      await updateAgent({
        ...selectedAgent,
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

  // Agent icon color based on type
  const getAgentColor = (type: string) => {
    switch (type) {
      case "orchestrator": return "bg-primary-500";
      case "research": return "bg-secondary-400";
      case "code": return "bg-accent-500";
      case "writer": return "bg-success-500";
      default: return "bg-neutral-500";
    }
  };

  // Agent icon based on type
  const getAgentIcon = (type: string) => {
    switch (type) {
      case "orchestrator": return "smart_toy";
      case "research": return "search";
      case "code": return "code";
      case "writer": return "edit";
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
            <Label className="block text-xs font-medium mb-1">LLM Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {renderModelOptions()}
              </SelectContent>
            </Select>
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
