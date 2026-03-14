
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Settings, Bot, Mic, ShoppingCart, UtensilsCrossed, Receipt, Dumbbell, Brain, Edit, X, Save, Key, Eye, EyeOff, Check } from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ModelConfig {
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
  cost_per_1k: number;
  fallback_provider: string | null;
  fallback_model: string | null;
}

interface EditForm {
  provider: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  timeout_seconds: number;
  cost_per_1k_tokens: number;
  fallback_provider: string;
  fallback_model: string;
}

const USE_CASE_META: Record<string, { label: string; icon: any; color: string }> = {
  classifier: { label: "Classifier", icon: Brain, color: "bg-purple-100 text-purple-700" },
  food: { label: "Food Analysis", icon: UtensilsCrossed, color: "bg-green-100 text-green-700" },
  receipt: { label: "Receipt Analysis", icon: Receipt, color: "bg-blue-100 text-blue-700" },
  workout: { label: "Workout Analysis", icon: Dumbbell, color: "bg-orange-100 text-orange-700" },
  shopping: { label: "Shopping Lists", icon: ShoppingCart, color: "bg-amber-100 text-amber-700" },
  voice_stt: { label: "Voice STT", icon: Mic, color: "bg-red-100 text-red-700" },
  voice_tts: { label: "Voice TTS", icon: Mic, color: "bg-pink-100 text-pink-700" },
};

interface ApiKeyInfo {
  env_var: string;
  provider: string;
  is_set: boolean;
  masked_value: string;
}

const SimpleModelManager = () => {
  const [configs, setConfigs] = useState<Record<string, ModelConfig>>({});
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUseCase, setEditingUseCase] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    provider: '',
    model_name: '',
    temperature: 0,
    max_tokens: 0,
    timeout_seconds: 0,
    cost_per_1k_tokens: 0,
    fallback_provider: '',
    fallback_model: '',
  });
  const [saving, setSaving] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [keyEdits, setKeyEdits] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [savingKeys, setSavingKeys] = useState(false);

  useEffect(() => {
    loadConfigs();
    loadApiKeys();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await backendApi.get('/v1/models/config');

      if (error) throw error;
      setConfigs(data?.configs || {});
      setProviders(data?.available_providers || []);
    } catch (error) {
      console.error('Failed to load model configs:', error);
      toast.error('Failed to load model configs');
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      setApiKeysLoading(true);
      const { data, error } = await backendApi.get('/v1/admin/api-keys');
      if (error) throw error;
      setApiKeys(data?.api_keys || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setApiKeysLoading(false);
    }
  };

  const saveApiKeys = async () => {
    const keysToUpdate: Record<string, string> = {};
    for (const [envVar, value] of Object.entries(keyEdits)) {
      if (value.trim()) {
        keysToUpdate[envVar] = value.trim();
      }
    }

    if (Object.keys(keysToUpdate).length === 0) {
      toast.error('No keys to update');
      return;
    }

    setSavingKeys(true);
    try {
      const { error } = await backendApi.put('/v1/admin/api-keys', { keys: keysToUpdate });
      if (error) throw error;

      toast.success(`Updated ${Object.keys(keysToUpdate).length} API key(s)`);
      setKeyEdits({});
      await loadApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update API keys');
    } finally {
      setSavingKeys(false);
    }
  };

  const openEdit = (useCase: string) => {
    const config = configs[useCase];
    setEditForm({
      provider: config.provider,
      model_name: config.model,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      timeout_seconds: config.timeout,
      cost_per_1k_tokens: config.cost_per_1k,
      fallback_provider: config.fallback_provider || '',
      fallback_model: config.fallback_model || '',
    });
    setEditingUseCase(useCase);
  };

  const saveConfig = async () => {
    if (!editingUseCase) return;

    setSaving(true);
    try {
      const updates: Record<string, any> = {
        provider: editForm.provider,
        model_name: editForm.model_name,
        temperature: editForm.temperature,
        max_tokens: editForm.max_tokens,
        timeout_seconds: editForm.timeout_seconds,
        cost_per_1k_tokens: editForm.cost_per_1k_tokens,
      };

      if (editForm.fallback_provider) {
        updates.fallback_provider = editForm.fallback_provider;
        updates.fallback_model = editForm.fallback_model;
      }

      const { error } = await backendApi.put(
        `/v1/models/config/${editingUseCase}`,
        updates
      );

      if (error) throw error;

      toast.success(`Updated ${editingUseCase} model config`);
      setEditingUseCase(null);
      await loadConfigs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Loading model configs...
        </CardContent>
      </Card>
    );
  }

  const useCases = Object.keys(configs);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Model Configuration
              </CardTitle>
              <CardDescription>
                {useCases.length} use cases configured across {providers.length} providers
              </CardDescription>
            </div>
            <Button onClick={loadConfigs} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {useCases.map((useCase) => {
            const config = configs[useCase];
            const meta = USE_CASE_META[useCase] || { label: useCase, icon: Bot, color: "bg-gray-100 text-gray-700" };
            const Icon = meta.icon;

            return (
              <div key={useCase} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-md ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{meta.label}</span>
                      <Badge variant="outline" className="text-xs font-mono">
                        {config.provider}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {config.model}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                  {config.max_tokens > 0 && (
                    <span title="Max tokens">{config.max_tokens} tok</span>
                  )}
                  <span title="Timeout">{config.timeout}s</span>
                  {config.fallback_provider && (
                    <Badge variant="secondary" className="text-xs">
                      fallback: {config.fallback_provider}/{config.fallback_model}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(useCase)}
                    title="Edit configuration"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <Settings className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Providers:</strong> {providers.join(", ")}</p>
                <p>Click the edit icon on any model to update its configuration.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Management */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage provider API keys (stored as Lambda environment variables)
              </CardDescription>
            </div>
            <Button onClick={loadApiKeys} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {apiKeysLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Loading API keys...
            </div>
          ) : (
            <>
              {apiKeys.map((keyInfo) => (
                <div key={keyInfo.env_var} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{keyInfo.provider}</span>
                      {keyInfo.is_set ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                          <Check className="h-3 w-3 mr-1" />
                          Set
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-red-500 border-red-300">
                          Not Set
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {keyInfo.env_var}
                      {keyInfo.is_set && !keyEdits[keyInfo.env_var] && (
                        <span className="ml-2 text-gray-400">
                          {showKey[keyInfo.env_var] ? keyInfo.masked_value : '••••••••'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {keyInfo.is_set && !keyEdits[keyInfo.env_var] && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowKey(prev => ({ ...prev, [keyInfo.env_var]: !prev[keyInfo.env_var] }))}
                      >
                        {showKey[keyInfo.env_var] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                    <Input
                      type="password"
                      placeholder={keyInfo.is_set ? "Enter new key to update..." : "Enter API key..."}
                      value={keyEdits[keyInfo.env_var] || ''}
                      onChange={(e) => setKeyEdits(prev => ({ ...prev, [keyInfo.env_var]: e.target.value }))}
                      className="w-64 text-sm font-mono"
                    />
                  </div>
                </div>
              ))}

              {Object.values(keyEdits).some(v => v.trim()) && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setKeyEdits({})}>
                    Cancel
                  </Button>
                  <Button onClick={saveApiKeys} disabled={savingKeys}>
                    <Save className="h-4 w-4 mr-1" />
                    {savingKeys ? 'Updating Lambda...' : 'Save API Keys'}
                  </Button>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  API keys are stored as Lambda environment variables. Updating a key will trigger a Lambda cold start on the next invocation.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUseCase} onOpenChange={(open) => !open && setEditingUseCase(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Edit {editingUseCase ? (USE_CASE_META[editingUseCase]?.label || editingUseCase) : ''} Config
            </DialogTitle>
            <DialogDescription>
              Update model provider, parameters, and fallback settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Provider</Label>
                <Input
                  value={editForm.provider}
                  onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                  placeholder="openai"
                />
              </div>
              <div>
                <Label>Model Name</Label>
                <Input
                  value={editForm.model_name}
                  onChange={(e) => setEditForm({ ...editForm, model_name: e.target.value })}
                  placeholder="gpt-4o-mini"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Temperature</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={editForm.temperature}
                  onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  value={editForm.max_tokens}
                  onChange={(e) => setEditForm({ ...editForm, max_tokens: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Timeout (s)</Label>
                <Input
                  type="number"
                  value={editForm.timeout_seconds}
                  onChange={(e) => setEditForm({ ...editForm, timeout_seconds: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
            <div>
              <Label>Cost per 1K tokens</Label>
              <Input
                type="number"
                step="0.00001"
                value={editForm.cost_per_1k_tokens}
                onChange={(e) => setEditForm({ ...editForm, cost_per_1k_tokens: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fallback Provider</Label>
                <Input
                  value={editForm.fallback_provider}
                  onChange={(e) => setEditForm({ ...editForm, fallback_provider: e.target.value })}
                  placeholder="groq (optional)"
                />
              </div>
              <div>
                <Label>Fallback Model</Label>
                <Input
                  value={editForm.fallback_model}
                  onChange={(e) => setEditForm({ ...editForm, fallback_model: e.target.value })}
                  placeholder="llama-3.3-70b-versatile"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUseCase(null)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={saveConfig} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SimpleModelManager;
