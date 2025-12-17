import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Save, Cpu, Key, Settings2, CheckCircle, XCircle, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type AIConfig = {
  geminiEnabled: boolean;
  geminiConfigured: boolean;
  geminiLastTested: string | null;
  geminiTestStatus: 'success' | 'failed' | null;
  openrouterEnabled: boolean;
  openrouterConfigured: boolean;
  openrouterLastTested: string | null;
  openrouterTestStatus: 'success' | 'failed' | null;
  defaultProvider: 'gemini' | 'openrouter';
  defaultModel: string;
};

type ModelsResponse = {
  models: {
    gemini: string[];
    openrouter: string[];
  };
  configured: {
    gemini: boolean;
    openrouter: boolean;
  };
};

export default function AdminAISettings() {
  const { toast } = useToast();
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [geminiEnabled, setGeminiEnabled] = useState(true);
  const [openrouterEnabled, setOpenrouterEnabled] = useState(true);
  const [defaultProvider, setDefaultProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [defaultModel, setDefaultModel] = useState("gemini-3-pro");

  const { data: config, isLoading: configLoading } = useQuery<AIConfig>({
    queryKey: ["/api/admin/ai-config"],
  });

  const { data: modelsData, isLoading: modelsLoading } = useQuery<ModelsResponse>({
    queryKey: ["/api/ai-builder/models"],
  });

  useEffect(() => {
    if (config) {
      setGeminiEnabled(config.geminiEnabled ?? true);
      setOpenrouterEnabled(config.openrouterEnabled ?? true);
      setDefaultProvider(config.defaultProvider || 'gemini');
      setDefaultModel(config.defaultModel || 'gemini-3-pro');
    }
  }, [config]);

  const saveGeminiMutation = useMutation({
    mutationFn: async (data: { apiKey: string; enabled: boolean }) => {
      return apiRequest("POST", "/api/admin/ai-config/gemini", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-builder/models"] });
      setGeminiApiKey("");
      toast({ title: "Gemini configuration saved", description: "API key has been saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save Gemini configuration.", variant: "destructive" });
    },
  });

  const saveOpenrouterMutation = useMutation({
    mutationFn: async (data: { apiKey: string; enabled: boolean }) => {
      return apiRequest("POST", "/api/admin/ai-config/openrouter", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-builder/models"] });
      setOpenrouterApiKey("");
      toast({ title: "OpenRouter configuration saved", description: "API key has been saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save OpenRouter configuration.", variant: "destructive" });
    },
  });

  const testGeminiMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/ai-config/test/gemini", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-config"] });
      if (data.success) {
        toast({ title: "Connection successful", description: "Gemini API key is valid and working." });
      } else {
        toast({ title: "Connection failed", description: data.error || "Could not connect to Gemini API.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Test failed", description: "Could not test Gemini connection.", variant: "destructive" });
    },
  });

  const testOpenrouterMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/ai-config/test/openrouter", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-config"] });
      if (data.success) {
        toast({ title: "Connection successful", description: "OpenRouter API key is valid and working." });
      } else {
        toast({ title: "Connection failed", description: data.error || "Could not connect to OpenRouter API.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Test failed", description: "Could not test OpenRouter connection.", variant: "destructive" });
    },
  });

  const saveDefaultsMutation = useMutation({
    mutationFn: async (data: { defaultProvider: string; defaultModel: string }) => {
      return apiRequest("POST", "/api/admin/ai-config/defaults", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-config"] });
      toast({ title: "Defaults saved", description: "Default provider and model have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save default settings.", variant: "destructive" });
    },
  });

  const handleSaveGemini = () => {
    saveGeminiMutation.mutate({ apiKey: geminiApiKey, enabled: geminiEnabled });
  };

  const handleSaveOpenrouter = () => {
    saveOpenrouterMutation.mutate({ apiKey: openrouterApiKey, enabled: openrouterEnabled });
  };

  const handleSaveDefaults = () => {
    saveDefaultsMutation.mutate({ defaultProvider, defaultModel });
  };

  const currentModels = defaultProvider === 'gemini' 
    ? modelsData?.models.gemini || [] 
    : modelsData?.models.openrouter || [];

  const getStatusBadge = (configured: boolean, enabled: boolean, testStatus: 'success' | 'failed' | null) => {
    if (!enabled) {
      return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Disabled</Badge>;
    }
    if (!configured) {
      return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Not Configured</Badge>;
    }
    if (testStatus === 'success') {
      return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
    }
    if (testStatus === 'failed') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Test Failed</Badge>;
    }
    return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Configured</Badge>;
  };

  if (configLoading || modelsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Page Builder Settings</h1>
        <p className="text-muted-foreground">
          Configure AI providers and models for the page builder
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Google Gemini
              </CardTitle>
              {getStatusBadge(config?.geminiConfigured ?? false, geminiEnabled, config?.geminiTestStatus ?? null)}
            </div>
            <CardDescription>
              Use Google's Gemini models directly via API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="gemini-enabled">Enable Gemini</Label>
              <Switch
                id="gemini-enabled"
                checked={geminiEnabled}
                onCheckedChange={setGeminiEnabled}
                data-testid="switch-gemini-enabled"
              />
            </div>
            
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="gemini-key">API Key</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="gemini-key"
                  type="password"
                  placeholder={config?.geminiConfigured ? "••••••••••••••••" : "Enter Gemini API key"}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="pl-10"
                  disabled={!geminiEnabled}
                  data-testid="input-gemini-key"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google AI Studio
                </a>
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveGemini}
                disabled={saveGeminiMutation.isPending || !geminiEnabled}
                className="flex-1"
                data-testid="button-save-gemini"
              >
                {saveGeminiMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => testGeminiMutation.mutate()}
                disabled={testGeminiMutation.isPending || !config?.geminiConfigured || !geminiEnabled}
                data-testid="button-test-gemini"
              >
                {testGeminiMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Test
              </Button>
            </div>

            {config?.geminiLastTested && (
              <p className="text-xs text-muted-foreground">
                Last tested: {new Date(config.geminiLastTested).toLocaleString()}
              </p>
            )}

            <div className="text-sm">
              <p className="font-medium mb-2">Available Models:</p>
              <div className="flex flex-wrap gap-1">
                {modelsData?.models.gemini.slice(0, 4).map((model) => (
                  <Badge key={model} variant="outline" className="text-xs">
                    {model}
                  </Badge>
                ))}
                {(modelsData?.models.gemini.length || 0) > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{(modelsData?.models.gemini.length || 0) - 4} more
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                OpenRouter
              </CardTitle>
              {getStatusBadge(config?.openrouterConfigured ?? false, openrouterEnabled, config?.openrouterTestStatus ?? null)}
            </div>
            <CardDescription>
              Access multiple AI models via OpenRouter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="openrouter-enabled">Enable OpenRouter</Label>
              <Switch
                id="openrouter-enabled"
                checked={openrouterEnabled}
                onCheckedChange={setOpenrouterEnabled}
                data-testid="switch-openrouter-enabled"
              />
            </div>
            
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="openrouter-key">API Key</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="openrouter-key"
                  type="password"
                  placeholder={config?.openrouterConfigured ? "••••••••••••••••" : "Enter OpenRouter API key"}
                  value={openrouterApiKey}
                  onChange={(e) => setOpenrouterApiKey(e.target.value)}
                  className="pl-10"
                  disabled={!openrouterEnabled}
                  data-testid="input-openrouter-key"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  OpenRouter
                </a>
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveOpenrouter}
                disabled={saveOpenrouterMutation.isPending || !openrouterEnabled}
                className="flex-1"
                data-testid="button-save-openrouter"
              >
                {saveOpenrouterMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => testOpenrouterMutation.mutate()}
                disabled={testOpenrouterMutation.isPending || !config?.openrouterConfigured || !openrouterEnabled}
                data-testid="button-test-openrouter"
              >
                {testOpenrouterMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Test
              </Button>
            </div>

            {config?.openrouterLastTested && (
              <p className="text-xs text-muted-foreground">
                Last tested: {new Date(config.openrouterLastTested).toLocaleString()}
              </p>
            )}

            <div className="text-sm">
              <p className="font-medium mb-2">Available Models:</p>
              <div className="flex flex-wrap gap-1">
                {modelsData?.models.openrouter.slice(0, 4).map((model) => (
                  <Badge key={model} variant="outline" className="text-xs">
                    {model.split('/')[1] || model}
                  </Badge>
                ))}
                {(modelsData?.models.openrouter.length || 0) > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{(modelsData?.models.openrouter.length || 0) - 4} more
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Default Settings
          </CardTitle>
          <CardDescription>
            Set the default AI provider and model for page generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Provider</Label>
              <Select 
                value={defaultProvider} 
                onValueChange={(v) => {
                  setDefaultProvider(v as any);
                  const models = v === 'gemini' ? modelsData?.models.gemini : modelsData?.models.openrouter;
                  if (models && models.length > 0) {
                    setDefaultModel(models[0]);
                  }
                }}
              >
                <SelectTrigger data-testid="select-default-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini" disabled={!geminiEnabled}>
                    Google Gemini {!geminiEnabled && "(Disabled)"}
                  </SelectItem>
                  <SelectItem value="openrouter" disabled={!openrouterEnabled}>
                    OpenRouter {!openrouterEnabled && "(Disabled)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Model</Label>
              <Select value={defaultModel} onValueChange={setDefaultModel}>
                <SelectTrigger data-testid="select-default-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {defaultProvider === 'openrouter' ? (model.split('/')[1] || model) : model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveDefaults} disabled={saveDefaultsMutation.isPending} data-testid="button-save-defaults">
              {saveDefaultsMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
