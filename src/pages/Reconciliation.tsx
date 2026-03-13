import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitCompare, RefreshCw, PlayCircle, CheckCircle2, AlertCircle, ArrowLeftRight, DollarSign, Receipt as ReceiptIcon } from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReconciliationSummary {
  transfers: {
    count: number;
    total_amount: number;
  };
  double_counts: {
    count: number;
    total_amount: number;
    net_adjustment: number;
  };
  receipts: {
    matched_count: number;
    matched_amount: number;
    unmatched_count: number;
    unmatched_amount: number;
  };
}

interface TransferMatch {
  transfer_id: string;
  related_transfer_id: string;
  from_account: string;
  to_account: string;
  amount: number;
  date: string;
  description?: string;
}

interface DoubleCount {
  entry_id: string;
  duplicate_entry_id: string;
  amount: number;
  date: string;
  description: string;
  vendor?: string;
}

interface ReceiptMatch {
  receipt_id: string;
  food_entry_id: string;
  receipt_vendor: string;
  receipt_amount: number;
  receipt_date: string;
  food_description: string;
  food_amount: number;
  food_date: string;
  confidence_score: number;
}

interface UnmatchedReceipt {
  receipt_id: string;
  vendor: string;
  amount: number;
  date: string;
  items_count: number;
}

interface ReconciliationResult {
  transfer_matches: TransferMatch[];
  double_counts: DoubleCount[];
  receipt_matches: ReceiptMatch[];
  unmatched_receipts: UnmatchedReceipt[];
  summary: ReconciliationSummary;
}

const Reconciliation = () => {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await backendApi.get('/v1/reconciliation/summary');
      if (response.data) {
        setSummary(response.data);
      } else if (response.error) {
        throw response.error;
      }
    } catch (error: any) {
      console.error('Error fetching reconciliation summary:', error);
      toast.error("Failed to load reconciliation summary");
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    try {
      setRunning(true);
      const response = await backendApi.post('/v1/reconciliation/run', {});
      if (response.data) {
        setReconciliationResult(response.data);
        setSummary(response.data.summary);
        toast.success("Reconciliation completed successfully");
      } else if (response.error) {
        throw response.error;
      }
    } catch (error: any) {
      console.error('Error running reconciliation:', error);
      toast.error("Failed to run reconciliation");
    } finally {
      setRunning(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="nw-loading-spinner h-12 w-12 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading reconciliation data...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-md">
              <GitCompare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reconciliation</h1>
              <p className="text-sm text-gray-600">Match transfers, detect duplicates, and verify receipts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSummary}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={runReconciliation}
              disabled={running}
              size="sm"
              className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
            >
              <PlayCircle className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Running...' : 'Run Reconciliation'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Transfer Matches</CardTitle>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summary.transfers.count}</div>
                <p className="text-xs text-gray-600 mt-1">
                  Total: {formatCurrency(summary.transfers.total_amount)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Double Counts</CardTitle>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{summary.double_counts.count}</div>
                <p className="text-xs text-gray-600 mt-1">
                  Adjustment: {formatCurrency(summary.double_counts.net_adjustment)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Receipt Matches</CardTitle>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <ReceiptIcon className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {summary.receipts.matched_count} / {summary.receipts.matched_count + summary.receipts.unmatched_count}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Matched: {formatCurrency(summary.receipts.matched_amount)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reconciliation Results */}
        {reconciliationResult && (
          <div className="space-y-4">
            {/* Transfer Matches */}
            {reconciliationResult.transfer_matches.length > 0 && (
              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                    <CardTitle>Transfer Matches</CardTitle>
                  </div>
                  <CardDescription>
                    Detected {reconciliationResult.transfer_matches.length} matching transfer pairs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>From Account</TableHead>
                        <TableHead>To Account</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationResult.transfer_matches.map((match, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{match.from_account}</TableCell>
                          <TableCell>{match.to_account}</TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            {formatCurrency(match.amount)}
                          </TableCell>
                          <TableCell>{formatDate(match.date)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {match.description || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Double Counts */}
            {reconciliationResult.double_counts.length > 0 && (
              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <CardTitle>Double Count Detections</CardTitle>
                  </div>
                  <CardDescription>
                    Found {reconciliationResult.double_counts.length} potential duplicate entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationResult.double_counts.map((doubleCount, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{doubleCount.description}</TableCell>
                          <TableCell>{doubleCount.vendor || '-'}</TableCell>
                          <TableCell className="font-semibold text-orange-600">
                            {formatCurrency(doubleCount.amount)}
                          </TableCell>
                          <TableCell>{formatDate(doubleCount.date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              Duplicate
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Receipt Matches */}
            {reconciliationResult.receipt_matches.length > 0 && (
              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <CardTitle>Receipt Matches</CardTitle>
                  </div>
                  <CardDescription>
                    Matched {reconciliationResult.receipt_matches.length} receipts with food entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Receipt Amount</TableHead>
                        <TableHead>Food Entry</TableHead>
                        <TableHead>Food Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationResult.receipt_matches.map((match, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{match.receipt_vendor}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(match.receipt_amount)}
                          </TableCell>
                          <TableCell className="text-sm">{match.food_description}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(match.food_amount)}
                          </TableCell>
                          <TableCell>{formatDate(match.receipt_date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                match.confidence_score >= 0.8
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : match.confidence_score >= 0.6
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }
                            >
                              {Math.round(match.confidence_score * 100)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Unmatched Receipts */}
            {reconciliationResult.unmatched_receipts.length > 0 && (
              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ReceiptIcon className="h-5 w-5 text-gray-600" />
                    <CardTitle>Unmatched Receipts</CardTitle>
                  </div>
                  <CardDescription>
                    {reconciliationResult.unmatched_receipts.length} receipts without matching food entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationResult.unmatched_receipts.map((receipt, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{receipt.vendor}</TableCell>
                          <TableCell className="font-semibold text-gray-600">
                            {formatCurrency(receipt.amount)}
                          </TableCell>
                          <TableCell>{formatDate(receipt.date)}</TableCell>
                          <TableCell>{receipt.items_count} items</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              Unmatched
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {reconciliationResult.transfer_matches.length === 0 &&
             reconciliationResult.double_counts.length === 0 &&
             reconciliationResult.receipt_matches.length === 0 &&
             reconciliationResult.unmatched_receipts.length === 0 && (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    All Clear!
                  </h3>
                  <p className="text-gray-600 text-center max-w-md">
                    No issues found. Your accounts are reconciled and all receipts are matched.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Initial State - No Reconciliation Run Yet */}
        {!reconciliationResult && summary && (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <GitCompare className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to Reconcile
              </h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                Click "Run Reconciliation" to analyze your transactions, detect duplicates, and match receipts with food entries.
              </p>
              <Button
                onClick={runReconciliation}
                disabled={running}
                className="bg-green-600 hover:bg-green-700"
              >
                <PlayCircle className={`mr-2 h-4 w-4 ${running ? 'animate-spin' : ''}`} />
                {running ? 'Running Reconciliation...' : 'Run Reconciliation'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
};

export default Reconciliation;
