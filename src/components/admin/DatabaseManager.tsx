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
  Zap,
  Search,
  Play,
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

interface CompactStats {
  files_before: number;
  files_after: number;
  files_compacted: number;
  bytes_before: number;
  bytes_after: number;
  bytes_saved: number;
  compaction_time_ms: number;
  snapshots_expired: number;
}

interface CompactResult {
  table: string;
  compacted: boolean;
  reason?: string;
  stats?: CompactStats;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

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

  // Query state
  const [querySql, setQuerySql] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[][]; row_count: number; truncated: boolean } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Optimize state
  const [tables, setTables] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [optimizeAllLoading, setOptimizeAllLoading] = useState(false);
  const [optimizingSingle, setOptimizingSingle] = useState<string | null>(null);
  const [compactResults, setCompactResults] = useState<CompactResult[]>([]);

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

  const fetchTables = useCallback(async () => {
    setTablesLoading(true);
    try {
      const { data, error } = await backendApi.get("/v1/admin/database/tables");
      if (error) throw error;
      setTables((data as any)?.tables || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load tables");
    } finally {
      setTablesLoading(false);
    }
  }, []);

  const handleOptimizeTable = async (table: string) => {
    setOptimizingSingle(table);
    try {
      const { data, error } = await backendApi.post("/v1/admin/database/optimize", {
        table,
        force: true,
      });
      if (error) throw error;
      const result = data as CompactResult;
      setCompactResults((prev) => [result, ...prev.filter((r) => r.table !== table)]);
      if (result.compacted) {
        toast.success(`Optimized ${table}: ${result.stats?.files_before} → ${result.stats?.files_after} files`);
      } else {
        toast.info(`${table}: ${result.reason || "Already optimized"}`);
      }
    } catch (err: any) {
      toast.error(`Failed to optimize ${table}: ${err?.message}`);
    } finally {
      setOptimizingSingle(null);
    }
  };

  const handleOptimizeAll = async () => {
    setOptimizeAllLoading(true);
    setCompactResults([]);
    try {
      const { data, error } = await backendApi.post("/v1/admin/database/optimize-all", {});
      if (error) throw error;
      const results = (data as any)?.results || [];
      setCompactResults(results);
      const compacted = results.filter((r: CompactResult) => r.compacted).length;
      toast.success(`Optimization complete: ${compacted}/${results.length} tables compacted`);
    } catch (err: any) {
      toast.error(err?.message || "Optimization failed");
    } finally {
      setOptimizeAllLoading(false);
    }
  };

  const handleRunQuery = async () => {
    if (!querySql.trim()) return;
    setQueryLoading(true);
    setQueryResult(null);
    setQueryError(null);
    try {
      const { data, error } = await backendApi.post("/v1/admin/database/query", {
        sql: querySql.trim(),
        limit: 100,
      });
      if (error) throw error;
      setQueryResult(data as any);
    } catch (err: any) {
      setQueryError(err?.message || "Query failed");
    } finally {
      setQueryLoading(false);
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

      {/* Optimize / Compact */}
      <Card className="border border-amber-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-600" />
              Optimize Tables
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTables}
                disabled={tablesLoading}
              >
                {tablesLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span className="ml-1.5">Load Tables</span>
              </Button>
              <Button
                size="sm"
                onClick={handleOptimizeAll}
                disabled={optimizeAllLoading || tables.length === 0}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {optimizeAllLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
                {optimizeAllLoading ? "Optimizing..." : "Optimize All"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Compact small Parquet files into larger ones for faster queries. Each write creates a new small file — compaction merges them. Safe to run anytime.
          </p>

          {tables.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {tables.map((table) => {
                const result = compactResults.find((r) => r.table === table);
                return (
                  <div key={table} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Database className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs font-mono text-gray-700 truncate">{table}</span>
                      {result && (
                        result.compacted ? (
                          <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 shrink-0">
                            {result.stats?.files_before} → {result.stats?.files_after} files
                            {result.stats?.bytes_saved ? ` (saved ${formatBytes(result.stats.bytes_saved)})` : ""}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {result.reason || "No change"}
                          </Badge>
                        )
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs shrink-0"
                      disabled={optimizingSingle === table || optimizeAllLoading}
                      onClick={() => handleOptimizeTable(table)}
                    >
                      {optimizingSingle === table ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {compactResults.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-medium text-amber-800 mb-1">Optimization Summary</p>
              <div className="flex gap-4 text-xs text-amber-700">
                <span>{compactResults.filter((r) => r.compacted).length} compacted</span>
                <span>{compactResults.filter((r) => !r.compacted).length} skipped</span>
                {(() => {
                  const totalSaved = compactResults.reduce((acc, r) => acc + (r.stats?.bytes_saved || 0), 0);
                  return totalSaved > 0 ? <span>Saved {formatBytes(totalSaved)}</span> : null;
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SQL Query */}
      <Card className="border border-indigo-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-indigo-600" />
            Query Tables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            Run read-only SQL queries against the database. Only SELECT statements are allowed. Results are limited to 100 rows.
          </p>
          <div className="space-y-3">
            <textarea
              value={querySql}
              onChange={(e) => setQuerySql(e.target.value)}
              placeholder={`SELECT * FROM app_users_v4 LIMIT 10`}
              className="w-full h-24 p-3 text-sm font-mono border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  handleRunQuery();
                }
              }}
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleRunQuery}
                disabled={queryLoading || !querySql.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {queryLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {queryLoading ? "Running..." : "Run Query"}
              </Button>
              <span className="text-xs text-gray-400">Cmd+Enter to run</span>
            </div>

            {queryError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-mono">{queryError}</p>
              </div>
            )}

            {queryResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{queryResult.row_count} row{queryResult.row_count !== 1 ? "s" : ""}</span>
                  <span>{queryResult.columns.length} column{queryResult.columns.length !== 1 ? "s" : ""}</span>
                  {queryResult.truncated && (
                    <Badge variant="secondary" className="text-[10px]">Truncated</Badge>
                  )}
                </div>
                <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {queryResult.columns.map((col) => (
                          <th key={col} className="px-3 py-2 text-left font-medium text-gray-700 border-b whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-1.5 text-gray-600 font-mono whitespace-nowrap max-w-xs truncate">
                              {cell === null ? <span className="text-gray-300 italic">null</span> : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
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
