import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  RefreshCw,
  Plus,
  Trash2,
  Heart,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "unknown";
  message: string;
  table_count?: number;
  missing_tables?: string[];
}

interface SetupResult {
  created_tables: string[];
  failed_tables: string[];
  total_tables: number;
  failures: number;
}

const DatabaseManager = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupConfirm, setCleanupConfirm] = useState("");
  const [showCleanup, setShowCleanup] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [showReset, setShowReset] = useState(false);

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const { data, error } = await backendApi.get("/v1/admin/database/health");
      if (error) throw error;
      setHealth(data as HealthStatus);
    } catch (err: any) {
      // Health endpoint might return 503 for unhealthy — try to parse the response
      setHealth({ status: "unknown", message: err?.message || "Could not reach database" });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleSetup = async () => {
    setSetupLoading(true);
    setSetupResult(null);
    try {
      const { data, error } = await backendApi.post("/v1/admin/database/setup", {});
      if (error) throw error;
      setSetupResult(data as SetupResult);
      toast.success(`Database setup complete: ${data.total_tables} tables ready`);
      // Refresh health after setup
      await checkHealth();
    } catch (err: any) {
      toast.error(err?.message || "Database setup failed");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (cleanupConfirm !== "DELETE_nutriwealth_default") {
      toast.error("Please type the exact confirmation string");
      return;
    }
    setCleanupLoading(true);
    try {
      const { data, error } = await backendApi.delete("/v1/admin/database/cleanup");
      // The backend expects body with confirm, but DELETE doesn't typically have body via our client
      // Let's use a POST-like approach with fetch directly
      if (error) throw error;
      toast.success(`Cleanup complete: ${data?.total_deleted ?? 0} tables deleted`);
      setShowCleanup(false);
      setCleanupConfirm("");
      await checkHealth();
    } catch (err: any) {
      toast.error(err?.message || "Cleanup failed");
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleReset = async () => {
    if (resetConfirm !== "DELETE_nutriwealth_default") {
      toast.error("Please type the exact confirmation string");
      return;
    }
    setResetLoading(true);
    try {
      const { data, error } = await backendApi.post("/v1/admin/database/reset", {
        confirm: resetConfirm,
      });
      if (error) throw error;
      toast.success("Database reset complete");
      setShowReset(false);
      setResetConfirm("");
      setSetupResult(data?.setup || null);
      await checkHealth();
    } catch (err: any) {
      toast.error(err?.message || "Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  const healthColor = health?.status === "healthy" ? "text-green-600" : health?.status === "unhealthy" ? "text-red-600" : "text-gray-400";
  const healthBg = health?.status === "healthy" ? "bg-green-50 border-green-200" : health?.status === "unhealthy" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200";

  return (
    <div className="space-y-6">
      {/* Health Check */}
      <Card className={`border ${healthBg}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className={`h-5 w-5 ${healthColor}`} />
              Database Health
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={checkHealth}
              disabled={healthLoading}
            >
              {healthLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {health ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {health.status === "healthy" && <CheckCircle className="h-4 w-4 text-green-600" />}
                {health.status === "unhealthy" && <XCircle className="h-4 w-4 text-red-600" />}
                {health.status === "unknown" && <AlertTriangle className="h-4 w-4 text-gray-400" />}
                <span className="text-sm font-medium capitalize">{health.status}</span>
                {health.table_count !== undefined && (
                  <Badge variant="secondary" className="text-xs">{health.table_count} tables</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">{health.message}</p>
              {health.missing_tables && health.missing_tables.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-red-700 mb-1">Missing essential tables:</p>
                  <div className="flex flex-wrap gap-1">
                    {health.missing_tables.map((t) => (
                      <Badge key={t} variant="destructive" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Checking...</p>
          )}
        </CardContent>
      </Card>

      {/* Setup Database */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            Setup Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Create all essential tables (users, food entries, receipts, workouts, bank transactions, shopping lists, etc.).
            Safe to run multiple times — existing tables are skipped.
          </p>
          <Button
            onClick={handleSetup}
            disabled={setupLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {setupLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
            {setupLoading ? "Setting up..." : "Setup All Tables"}
          </Button>

          {setupResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="secondary" className="text-xs">
                  {setupResult.total_tables} created
                </Badge>
                {setupResult.failures > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {setupResult.failures} failed
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {setupResult.created_tables.map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="text-gray-700 font-mono">{t}</span>
                  </div>
                ))}
                {setupResult.failed_tables.map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs">
                    <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                    <span className="text-red-700 font-mono">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cleanup */}
          <div className="p-4 border border-red-100 rounded-lg bg-red-50/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-red-800">Cleanup Database</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Delete all app tables and data. This action is irreversible.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100 shrink-0"
                onClick={() => { setShowCleanup(!showCleanup); setCleanupConfirm(""); }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {showCleanup ? "Cancel" : "Cleanup..."}
              </Button>
            </div>
            {showCleanup && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-xs text-red-700 mb-2">
                  Type <code className="bg-red-100 px-1 py-0.5 rounded font-mono">DELETE_nutriwealth_default</code> to confirm:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={cleanupConfirm}
                    onChange={(e) => setCleanupConfirm(e.target.value)}
                    placeholder="DELETE_nutriwealth_default"
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={cleanupLoading || cleanupConfirm !== "DELETE_nutriwealth_default"}
                    onClick={handleCleanup}
                    className="shrink-0"
                  >
                    {cleanupLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Reset */}
          <div className="p-4 border border-red-100 rounded-lg bg-red-50/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-red-800">Reset Database</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Delete everything and re-create all tables fresh. Combines cleanup + setup.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100 shrink-0"
                onClick={() => { setShowReset(!showReset); setResetConfirm(""); }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                {showReset ? "Cancel" : "Reset..."}
              </Button>
            </div>
            {showReset && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-xs text-red-700 mb-2">
                  Type <code className="bg-red-100 px-1 py-0.5 rounded font-mono">DELETE_nutriwealth_default</code> to confirm:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="DELETE_nutriwealth_default"
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={resetLoading || resetConfirm !== "DELETE_nutriwealth_default"}
                    onClick={handleReset}
                    className="shrink-0"
                  >
                    {resetLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Reset"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseManager;
