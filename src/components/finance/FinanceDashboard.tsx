import { useState, useEffect, useCallback, useRef } from "react";
import { DollarSign, TrendingDown, TrendingUp, PiggyBank, Calendar, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { money, DATE_RANGES } from "./financeTypes";
import { KpiCard } from "./FinanceKpiCards";
import { useFinanceData } from "./useFinanceData";
import { FinanceOverviewTab } from "./FinanceOverviewTab";
import { FinanceSpendingTab } from "./FinanceSpendingTab";
import { FinanceCashFlowTab } from "./FinanceCashFlowTab";
import { FinanceTransactionsTab } from "./FinanceTransactionsTab";
import { FinanceAlertsTab } from "./FinanceAlertsTab";
import { backendApi } from "@/lib/api/client";

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function FinanceDashboard() {
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await backendApi.get("/v1/bank-statements/dashboard");
      if (error) throw error;
      if (data && data.transactions && data.transactions.length > 0) {
        setDashboardData(data);
      }
    } catch (err) {
      console.log("Dashboard API not available, showing empty state", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setUploadStatus("error");
      setUploadMessage("Please select a CSV file.");
      return;
    }

    setUploadStatus("uploading");
    setUploadMessage(`Uploading ${file.name}...`);

    try {
      const text = await file.text();
      const base64 = btoa(unescape(encodeURIComponent(text)));

      const { data, error } = await backendApi.post("/v1/bank-statements/upload", {
        csv_data: base64,
        filename: file.name,
      });

      if (error) throw error;

      const imported = data?.imported_count ?? data?.imported ?? 0;
      const skipped = data?.skipped_count ?? data?.skipped ?? 0;
      const account = data?.account_name ?? "";

      setUploadStatus("success");
      setUploadMessage(
        `Imported ${imported} transactions${skipped > 0 ? ` (${skipped} duplicates skipped)` : ""}${account ? ` for ${account}` : ""}.`
      );

      // Refresh dashboard after successful upload
      await fetchDashboard();
    } catch (err: any) {
      setUploadStatus("error");
      setUploadMessage(err?.message || "Upload failed. Please try again.");
    }

    // Reset file input so the same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const data = useFinanceData(range, dashboardData);
  const {
    summaryStats,
    dateRange,
  } = data;

  const {
    totalIncome,
    totalExpenses,
    totalInvested,
    netSavings,
    investmentRate,
    avgMonthlyIncome,
    avgMonthlyExpense,
    avgMonthlyInvestment,
  } = summaryStats;

  const handleCategoryClick = (category: string) => {
    setTab("spending");
    setSelectedCategory(category);
  };

  const hasData = dashboardData && dashboardData.transactions?.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Fintech Dashboard</p>
          <h2 className="text-xl font-bold text-gray-900">Personal Finance Intelligence</h2>
          <p className="text-sm text-gray-500">
            {hasData ? (
              <>Full financial dashboard across all accounts.{" "}
                {dateRange && <span className="text-gray-400">Data from {dateRange.start} to {dateRange.end}</span>}
              </>
            ) : (
              "Upload a bank statement CSV to get started."
            )}
          </p>
        </div>
        <Button
          variant={showUpload ? "default" : "outline"}
          size="sm"
          onClick={() => { setShowUpload(!showUpload); setUploadStatus("idle"); }}
          className={`shrink-0 ${showUpload ? "bg-green-600 hover:bg-green-700" : ""}`}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Import Bank Statements
        </Button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <Card className="border border-green-200 bg-green-50/50">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Import Bank Statement</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Supports Apple Card, Chase, Bank of America, Discover, and SoFi CSV exports. Auto-detects format.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-green-600 file:text-white file:cursor-pointer hover:file:bg-green-700"
                  disabled={uploadStatus === "uploading"}
                />
              </div>
            </div>
            {uploadStatus !== "idle" && (
              <div className={`mt-3 flex items-center gap-2 text-xs ${
                uploadStatus === "uploading" ? "text-blue-600" :
                uploadStatus === "success" ? "text-green-700" :
                "text-red-600"
              }`}>
                {uploadStatus === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {uploadStatus === "success" && <CheckCircle className="h-3.5 w-3.5" />}
                {uploadStatus === "error" && <AlertCircle className="h-3.5 w-3.5" />}
                {uploadMessage}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading dashboard...
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasData && (
        <Card className="border border-dashed border-gray-300">
          <CardContent className="py-12 text-center">
            <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No transaction data yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Import Bank Statements" above to upload your first bank statement.</p>
          </CardContent>
        </Card>
      )}

      {/* Dashboard content - only show when we have data */}
      {!loading && hasData && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={DollarSign} title="Total income" value={money(totalIncome)} sub={`Avg ${money(avgMonthlyIncome)}/mo`} />
            <KpiCard icon={TrendingDown} title="Total expenses" value={money(totalExpenses)} sub={`${totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(0) : 0}% of income | Avg ${money(avgMonthlyExpense)}/mo`} />
            <KpiCard icon={TrendingUp} title="Investments" value={money(totalInvested)} sub={`${investmentRate}% of income | Avg ${money(avgMonthlyInvestment)}/mo`} />
            <KpiCard icon={PiggyBank} title="Net savings" value={money(netSavings)} sub={`${totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0}% savings rate`} />
          </div>

          {/* Tabs + Date range */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Tabs value={tab} onValueChange={(v) => { setTab(v); setSelectedCategory(null); }}>
              <TabsList className="bg-gray-100">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="spending" className="text-xs">Spending</TabsTrigger>
                <TabsTrigger value="cashflow" className="text-xs">Cash Flow</TabsTrigger>
                <TabsTrigger value="transactions" className="text-xs">Transactions</TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {DATE_RANGES.map((r) => (
                <Button
                  key={r.label}
                  variant={range === r.label ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setRange(r.label)}
                  className={`h-7 px-2.5 text-xs ${range === r.label ? "bg-green-600 hover:bg-green-700" : ""}`}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          {tab === "overview" && <FinanceOverviewTab data={data} onCategoryClick={handleCategoryClick} />}
          {tab === "spending" && <FinanceSpendingTab data={data} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />}
          {tab === "cashflow" && <FinanceCashFlowTab data={data} />}
          {tab === "transactions" && <FinanceTransactionsTab data={data} />}
          {tab === "alerts" && <FinanceAlertsTab data={data} />}
        </>
      )}
    </div>
  );
}
