import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import { LLMProviderSettings } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("llm-providers");

  // Fetch LLM providers
  const {
    data: providers = [] as LLMProviderSettings[],
    isLoading,
    error,
  } = useQuery<LLMProviderSettings[]>({
    queryKey: ['/api/llm-providers'],
    staleTime: 60 * 1000, // 1 minute
  });

  // Create a mutation for updating provider settings
  const updateProviderMutation = useMutation({
    mutationFn: async (provider: LLMProviderSettings) => {
      const res = await apiRequest('POST', '/api/llm-providers', provider);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/llm-providers'] });
      toast({
        title: "Provider settings updated",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update provider settings",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Create a mutation for testing provider connection
  const testConnectionMutation = useMutation({
    mutationFn: async ({ provider, model }: { provider: string; model?: string }) => {
      const res = await apiRequest('POST', '/api/llm-test', { provider, model });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection successful",
        description: data.response || "LLM provider is working properly.",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Could not connect to the LLM provider.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleProviderUpdate = (provider: LLMProviderSettings) => {
    updateProviderMutation.mutate(provider);
  };

  // Test connection to an LLM provider
  const testConnection = (provider: string, model?: string) => {
    testConnectionMutation.mutate({ provider, model });
  };

  const getDefaultFormState = (provider: string): LLMProviderSettings => {
    return {
      provider,
      apiKey: '',
      baseUrl: '',
      models: [],
      isEnabled: true,
    };
  };

  // Add custom provider state
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [customProvider, setCustomProvider] = useState({
    name: '',
    baseUrl: 'https://',
    requiresKey: true,
  });

  return (
    <div className="font-sans bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50 h-screen flex flex-col">
      <Header
        onToggleSidebar={() => {}}
        onToggleDetails={() => {}}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Configure your application settings</p>
            </div>
            <Button onClick={() => navigate("/")}>
              Back to Dashboard
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-2 w-[400px]">
              <TabsTrigger value="llm-providers">LLM Providers</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>

            <TabsContent value="llm-providers" className="space-y-4">
              <div className="grid gap-4">
                {isLoading && (
                  <div className="flex justify-center items-center p-8">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                    <span>Loading providers...</span>
                  </div>
                )}

                {error && (
                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="text-destructive">Error loading providers</CardTitle>
                      <CardDescription>
                        {error instanceof Error ? error.message : "Unknown error"}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}

                {!isLoading && !error && (
                  <>
                    {/* OpenAI settings */}
                    <ProviderSettingsCard
                      initialData={
                        providers.find(p => p.provider === "openai") ||
                        getDefaultFormState("openai")
                      }
                      onUpdate={handleProviderUpdate}
                      onTestConnection={testConnection}
                      defaultModels={["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"]}
                      defaultUrl="https://api.openai.com/v1"
                      testingConnection={testConnectionMutation.isPending}
                      title="OpenAI"
                      description="Configure OpenAI API settings (GPT-4, GPT-3.5)"
                    />

                    {/* Anthropic settings */}
                    <ProviderSettingsCard
                      initialData={
                        providers.find(p => p.provider === "anthropic") ||
                        getDefaultFormState("anthropic")
                      }
                      onUpdate={handleProviderUpdate}
                      onTestConnection={testConnection}
                      defaultModels={["claude-3-7-sonnet-20250219", "claude-3-opus-20240229", "claude-3-haiku-20240307"]}
                      defaultUrl="https://api.anthropic.com/v1"
                      testingConnection={testConnectionMutation.isPending}
                      title="Anthropic"
                      description="Configure Anthropic API settings (Claude models)"
                    />

                    {/* Perplexity settings */}
                    <ProviderSettingsCard
                      initialData={
                        providers.find(p => p.provider === "perplexity") ||
                        getDefaultFormState("perplexity")
                      }
                      onUpdate={handleProviderUpdate}
                      onTestConnection={testConnection}
                      defaultModels={["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online"]}
                      defaultUrl="https://api.perplexity.ai"
                      testingConnection={testConnectionMutation.isPending}
                      title="Perplexity AI"
                      description="Configure Perplexity API settings"
                    />

                    {/* xAI settings */}
                    <ProviderSettingsCard
                      initialData={
                        providers.find(p => p.provider === "xai") ||
                        getDefaultFormState("xai")
                      }
                      onUpdate={handleProviderUpdate}
                      onTestConnection={testConnection}
                      defaultModels={["grok-2-1212", "grok-vision-beta"]}
                      defaultUrl="https://api.x.ai/v1"
                      testingConnection={testConnectionMutation.isPending}
                      title="xAI (Grok)"
                      description="Configure xAI API settings (Grok models)"
                    />

                    {/* Ollama settings */}
                    <ProviderSettingsCard
                      initialData={
                        providers.find(p => p.provider === "ollama") ||
                        getDefaultFormState("ollama")
                      }
                      onUpdate={handleProviderUpdate}
                      onTestConnection={testConnection}
                      defaultModels={["llama3", "mistral", "codellama"]}
                      defaultUrl="http://localhost:11434"
                      testingConnection={testConnectionMutation.isPending}
                      title="Ollama (Local)"
                      description="Configure Ollama local settings"
                      requiresKey={false}
                    />

                    {/* LM Studio settings */}
                    <ProviderSettingsCard
                      initialData={
                        providers.find(p => p.provider === "lmstudio") ||
                        getDefaultFormState("lmstudio")
                      }
                      onUpdate={handleProviderUpdate}
                      onTestConnection={testConnection}
                      defaultModels={["local-model"]}
                      defaultUrl="http://localhost:1234/v1"
                      testingConnection={testConnectionMutation.isPending}
                      title="LM Studio (Local)"
                      description="Configure LM Studio local settings"
                      requiresKey={false}
                    />
                    
                    {/* Custom providers */}
                    {providers
                      .filter(p => !["openai", "anthropic", "ollama", "lmstudio", "perplexity", "xai"].includes(p.provider))
                      .map(provider => (
                        <ProviderSettingsCard
                          key={provider.provider}
                          initialData={provider}
                          onUpdate={handleProviderUpdate}
                          onTestConnection={testConnection}
                          defaultModels={[]}
                          defaultUrl={provider.baseUrl || ''}
                          testingConnection={testConnectionMutation.isPending}
                          title={`${provider.provider} (Custom)`}
                          description="OpenAI-compatible API"
                          requiresKey={true}
                        />
                      ))}
                      
                    {/* Add custom provider button */}
                    <Card className="border-dashed border-2 hover:bg-accent/50 transition-colors">
                      <CardContent className="flex items-center justify-center p-8">
                        <Dialog open={isAddingProvider} onOpenChange={setIsAddingProvider}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                              <Plus size={16} />
                              Add Custom OpenAI-Compatible Provider
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Custom Provider</DialogTitle>
                              <DialogDescription>
                                Add a custom OpenAI-compatible LLM provider
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="provider-name">Provider Name</Label>
                                <Input
                                  id="provider-name"
                                  placeholder="e.g., Together AI, Groq, etc."
                                  value={customProvider.name}
                                  onChange={(e) => setCustomProvider(prev => ({ ...prev, name: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="provider-url">Base URL</Label>
                                <Input
                                  id="provider-url"
                                  placeholder="e.g., https://api.together.xyz/v1"
                                  value={customProvider.baseUrl}
                                  onChange={(e) => setCustomProvider(prev => ({ ...prev, baseUrl: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Should end with /v1 for OpenAI-compatible endpoints
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="provider-requires-key"
                                  checked={customProvider.requiresKey}
                                  onCheckedChange={(checked) => setCustomProvider(prev => ({ ...prev, requiresKey: checked }))}
                                />
                                <Label htmlFor="provider-requires-key">Requires API Key</Label>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={() => {
                                  if (!customProvider.name.trim()) {
                                    return;
                                  }
                                  
                                  const providerName = customProvider.name.trim().toLowerCase().replace(/\s+/g, '-');
                                  
                                  const newProvider = getDefaultFormState(providerName);
                                  newProvider.baseUrl = customProvider.baseUrl;
                                  newProvider.models = ["default-model"];
                                  
                                  handleProviderUpdate(newProvider);
                                  setIsAddingProvider(false);
                                  setCustomProvider({
                                    name: '',
                                    baseUrl: 'https://',
                                    requiresKey: true,
                                  });
                                }}
                                disabled={!customProvider.name.trim()}
                              >
                                Add Provider
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Configure general application settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">General settings will be implemented soon.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

interface ProviderSettingsCardProps {
  initialData: LLMProviderSettings;
  onUpdate: (provider: LLMProviderSettings) => void;
  onTestConnection: (provider: string, model?: string) => void;
  defaultModels: string[];
  defaultUrl: string;
  testingConnection: boolean;
  title: string;
  description: string;
  requiresKey?: boolean;
}

function ProviderSettingsCard({
  initialData,
  onUpdate,
  onTestConnection,
  defaultModels,
  defaultUrl,
  testingConnection,
  title,
  description,
  requiresKey = true,
}: ProviderSettingsCardProps) {
  const [formState, setFormState] = useState<LLMProviderSettings>(initialData);
  const [modelInput, setModelInput] = useState('');

  useEffect(() => {
    setFormState(initialData);
  }, [initialData]);

  const handleInputChange = (field: keyof LLMProviderSettings, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddModel = () => {
    if (!modelInput.trim()) return;
    
    setFormState((prev) => ({
      ...prev,
      models: [...(prev.models || []), modelInput.trim()],
    }));
    
    setModelInput('');
  };

  const handleRemoveModel = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      models: (prev.models || []).filter((_, i) => i !== index),
    }));
  };

  const handleResetUrl = () => {
    handleInputChange('baseUrl', defaultUrl);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Switch
            checked={formState.isEnabled}
            onCheckedChange={(checked) => handleInputChange('isEnabled', checked)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {requiresKey && (
          <div className="space-y-2">
            <Label htmlFor={`${formState.provider}-apiKey`}>API Key</Label>
            <Input
              id={`${formState.provider}-apiKey`}
              type="password"
              placeholder="Enter API key"
              value={formState.apiKey || ''}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor={`${formState.provider}-baseUrl`}>Base URL</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetUrl}
            >
              Reset to Default
            </Button>
          </div>
          <Input
            id={`${formState.provider}-baseUrl`}
            placeholder="Enter base URL"
            value={formState.baseUrl || defaultUrl}
            onChange={(e) => handleInputChange('baseUrl', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Models</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add model name"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddModel();
                }
              }}
            />
            <Button onClick={handleAddModel}>Add</Button>
          </div>
          {(!formState.models || formState.models.length === 0) && (
            <div className="text-sm text-muted-foreground mt-2">
              <p>Default models: {defaultModels.join(', ')}</p>
            </div>
          )}
          {formState.models && formState.models.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formState.models.map((model, index) => (
                <div
                  key={index}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md flex items-center gap-2"
                >
                  <span>{model}</span>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => handleRemoveModel(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => onTestConnection(formState.provider, formState.models?.[0])}
          disabled={testingConnection || (!formState.isEnabled)}
        >
          {testingConnection ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Connection"
          )}
        </Button>
        <Button onClick={() => onUpdate(formState)} disabled={!formState.isEnabled}>
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}