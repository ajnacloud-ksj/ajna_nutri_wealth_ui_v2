import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, Filter, TrendingDown, TrendingUp, PiggyBank, ArrowUpDown } from "lucide-react";
import { money, moneyDecimal, CATEGORY_COLORS, CATEGORY_LABELS } from "./financeTypes";
import { KpiCard } from "./FinanceKpiCards";
import { useFinanceData } from "./useFinanceData";

const PAGE_SIZE = 25;

interface FinanceTransactionsTabProps {
  data: ReturnType<typeof useFinanceData>;
}

export function FinanceTransactionsTab({ data }: FinanceTransactionsTabProps) {
  const { allTransactions, allowedMonths, allSources, allCategories, allTypes } = data;

  const [txnSearch, setTxnSearch] = useState("");
  const [txnSource, setTxnSource] = useState("all");
  const [txnCategory, setTxnCategory] = useState("all");
  const [txnType, setTxnType] = useState("all");
  const [txnPage, setTxnPage] = useState(0);
  const [txnSort, setTxnSort] = useState({ key: "date", dir: "desc" });

  const resetTxnPage = useCallback(() => setTxnPage(0), []);

  const toggleSort = useCallback((key: string) => {
    setTxnSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc",
    }));
  }, []);

  const filteredTransactions = useMemo(() => {
    let txns = [...allTransactions];
    if (txnSource !== "all") txns = txns.filter((t) => t.sourceAccount === txnSource);
    if (txnCategory !== "all") txns = txns.filter((t) => t.category === txnCategory);
    if (txnType !== "all") txns = txns.filter((t) => t.transactionType === txnType);
    if (txnSearch) {
      const q = txnSearch.toLowerCase();
      txns = txns.filter((t) => t.description.toLowerCase().includes(q));
    }
    const { key, dir } = txnSort;
    txns.sort((a, b) => {
      let cmp = 0;
      if (key === "date") cmp = a.date.localeCompare(b.date);
      else if (key === "amount") cmp = a.amount - b.amount;
      else if (key === "description") cmp = a.description.localeCompare(b.description);
      else if (key === "category") cmp = a.category.localeCompare(b.category);
      return dir === "desc" ? -cmp : cmp;
    });
    return txns;
  }, [allTransactions, txnSource, txnCategory, txnType, txnSearch, txnSort]);

  const txnPageCount = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safeTxnPage = Math.min(txnPage, txnPageCount - 1);
  const pagedTransactions = filteredTransactions.slice(safeTxnPage * PAGE_SIZE, (safeTxnPage + 1) * PAGE_SIZE);

  const txnSummary = useMemo(() => {
    const expenses = filteredTransactions.filter((t) => t.transactionType === "expense");
    const totalExp = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const income = filteredTransactions.filter((t) => t.transactionType === "income");
    const totalInc = income.reduce((s, t) => s + t.amount, 0);
    const byCat: Record<string, number> = {};
    for (const t of expenses) {
      byCat[t.category] = (byCat[t.category] || 0) + Math.abs(t.amount);
    }
    const catBreakdown = Object.entries(byCat)
      .filter(([, amount]) => amount > 0)
      .map(([name, amount]) => {
        const catKey = Object.keys(CATEGORY_LABELS).find((k) => CATEGORY_LABELS[k] === name);
        return { name, amount: Math.round(amount * 100) / 100, color: catKey ? CATEGORY_COLORS[catKey] : "#6b7280" };
      })
      .sort((a, b) => b.amount - a.amount);
    const catTotal = catBreakdown.reduce((s, c) => s + c.amount, 0);
    return {
      totalExp: Math.round(totalExp * 100) / 100,
      totalInc: Math.round(totalInc * 100) / 100,
      count: filteredTransactions.length,
      catBreakdown,
      catTotal,
    };
  }, [filteredTransactions]);

  const hasActiveFilters = txnSearch || txnSource !== "all" || txnCategory !== "all" || txnType !== "all";

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Filter} title="Showing" value={txnSummary.count.toLocaleString()} sub="transactions" />
        <KpiCard icon={TrendingDown} title="Total expenses" value={money(txnSummary.totalExp)} sub="filtered view" />
        <KpiCard icon={TrendingUp} title="Total income" value={money(txnSummary.totalInc)} sub="filtered view" />
        <KpiCard icon={PiggyBank} title="Net" value={money(txnSummary.totalInc - txnSummary.totalExp)} sub="income - expenses" />
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setTxnSearch(""); setTxnSource("all"); setTxnCategory("all"); setTxnType("all"); resetTxnPage(); }}
            className="text-xs"
          >
            <ChevronLeft className="h-3 w-3 mr-1" /> Clear all
          </Button>
          {txnSearch && (
            <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
              Search: "{txnSearch}"
              <span onClick={() => { setTxnSearch(""); resetTxnPage(); }} className="cursor-pointer ml-1 opacity-60">&times;</span>
            </Badge>
          )}
          {txnSource !== "all" && (
            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
              Account: {txnSource}
              <span onClick={() => { setTxnSource("all"); resetTxnPage(); }} className="cursor-pointer ml-1 opacity-60">&times;</span>
            </Badge>
          )}
          {txnCategory !== "all" && (
            <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
              Category: {txnCategory}
              <span onClick={() => { setTxnCategory("all"); resetTxnPage(); }} className="cursor-pointer ml-1 opacity-60">&times;</span>
            </Badge>
          )}
          {txnType !== "all" && (
            <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700">
              Type: {txnType}
              <span onClick={() => { setTxnType("all"); resetTxnPage(); }} className="cursor-pointer ml-1 opacity-60">&times;</span>
            </Badge>
          )}
        </div>
      )}

      {/* Category breakdown chart */}
      {txnSummary.catBreakdown.length > 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
              <p className="text-xs text-gray-500">Click a bar to filter the transaction table</p>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ height: Math.max(280, txnSummary.catBreakdown.length * 32) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={txnSummary.catBreakdown}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                  onClick={(e) => { if (e?.activeLabel) { setTxnCategory(e.activeLabel as string); resetTxnPage(); } }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString()}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => {
                    const pct = txnSummary.catTotal > 0 ? ((v / txnSummary.catTotal) * 100).toFixed(1) : 0;
                    return [`${money(v)} (${pct}%)`, "Amount"];
                  }} />
                  <Bar dataKey="amount" radius={[0, 10, 10, 0]} style={{ cursor: "pointer" }}>
                    {txnSummary.catBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions table with filters */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">All Transactions</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={txnSearch}
                onChange={(e) => { setTxnSearch(e.target.value); resetTxnPage(); }}
                placeholder="Search description..."
                className="w-48 h-8 text-xs"
              />
              <Select value={txnSource} onValueChange={(v) => { setTxnSource(v); resetTxnPage(); }}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All accounts" /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All accounts</SelectItem>
                  {allSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={txnCategory} onValueChange={(v) => { setTxnCategory(v); resetTxnPage(); }}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All categories</SelectItem>
                  {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={txnType} onValueChange={(v) => { setTxnType(v); resetTxnPage(); }}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All types</SelectItem>
                  {allTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-3 py-2 text-left cursor-pointer hover:text-gray-900" onClick={() => toggleSort("date")}>
                    <span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:text-gray-900" onClick={() => toggleSort("description")}>
                    <span className="flex items-center gap-1">Description <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-3 py-2 text-right cursor-pointer hover:text-gray-900" onClick={() => toggleSort("amount")}>
                    <span className="flex items-center gap-1 justify-end">Amount <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:text-gray-900" onClick={() => toggleSort("category")}>
                    <span className="flex items-center gap-1">Category <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-3 py-2 text-left">Account</th>
                  <th className="px-3 py-2 text-left">Type</th>
                </tr>
              </thead>
              <tbody>
                {pagedTransactions.map((t, i) => (
                  <tr key={`${t.date}-${i}`} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{t.date}</td>
                    <td className="px-3 py-2 text-xs max-w-[300px] truncate" title={t.description}>
                      {t.description.length > 60 ? t.description.slice(0, 57) + "..." : t.description}
                    </td>
                    <td className={`px-3 py-2 text-right text-xs font-semibold ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {moneyDecimal(t.amount)}
                    </td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{t.category}</Badge></td>
                    <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px]">{t.sourceAccount}</Badge></td>
                    <td className="px-3 py-2 text-xs text-gray-500">{t.transactionType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              disabled={safeTxnPage === 0}
              onClick={() => setTxnPage(safeTxnPage - 1)}
              className="text-xs"
            >
              <ChevronLeft className="h-3 w-3 mr-1" /> Prev
            </Button>
            <span className="text-xs text-gray-500">
              Page {safeTxnPage + 1} of {txnPageCount} ({filteredTransactions.length} transactions)
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safeTxnPage >= txnPageCount - 1}
              onClick={() => setTxnPage(safeTxnPage + 1)}
              className="text-xs"
            >
              Next <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
