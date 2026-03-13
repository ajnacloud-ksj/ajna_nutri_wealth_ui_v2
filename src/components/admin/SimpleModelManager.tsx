
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Settings, Bot, Mic, ShoppingCart, UtensilsCrossed, Receipt, Dumbbell, Brain } from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";

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

const USE_CASE_META: Record<string, { label: string; icon: any; color: string }> = {
  classifier: { label: "Classifier", icon: Brain, color: "bg-purple-100 text-purple-700" },
  food: { label: "Food Analysis", icon: UtensilsCrossed, color: "bg-green-100 text-green-700" },
  receipt: { label: "Receipt Analysis", icon: Receipt, color: "bg-blue-100 text-blue-700" },
  workout: { label: "Workout Analysis", icon: Dumbbell, color: "bg-orange-100 text-orange-700" },
  shopping: { label: "Shopping Lists", icon: ShoppingCart, color: "bg-amber-100 text-amber-700" },
  voice_stt: { label: "Voice STT", icon: Mic, color: "bg-red-100 text-red-700" },
  voice_tts: { label: "Voice TTS", icon: Mic, color: "bg-pink-100 text-pink-700" },
};

const SimpleModelManager = () => {
  const [configs, setConfigs] = useState<Record<string, ModelConfig>>({});
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
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
              </div>
            </div>
          );
        })}

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Settings className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Providers:</strong> {providers.join(", ")}</p>
              <p>Model configs are stored in <code className="bg-muted px-1 rounded">app_ai_model_config</code> and can be updated via <code className="bg-muted px-1 rounded">PUT /v1/models/config/{'<use_case>'}</code></p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleModelManager;
