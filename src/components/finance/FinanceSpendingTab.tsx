import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ChevronLeft, DollarSign, TrendingDown, CreditCard, TrendingUp } from "lucide-react";
import { money, moneyDecimal, CATEGORY_COLORS, CATEGORY_LABELS } from "./financeTypes";
import { KpiCard } from "./FinanceKpiCards";
import { useFinanceData } from "./useFinanceData";

interface FinanceSpendingTabProps {
  data: ReturnType<typeof useFinanceData>;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}

export function FinanceSpendingTab({ data, selectedCategory, onSelectCategory }: FinanceSpendingTabProps) {
  const {
    categoryTotals,
    monthlyData,
    summaryStats,
    dateFilteredRecurring,
    getCategoryDetail,
    numCompleteMonths,
  } = data;

  const { totalExpenses } = summaryStats;
  const categoryKeys = Object.keys(CATEGORY_COLORS);
  const categoryDetail = useMemo(() => getCategoryDetail(selectedCategory), [selectedCategory, getCategoryDetail]);

  // Category list view
  if (!selectedCategory) {
    return (
      <div className="space-y-4">
        {/* Category bars */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
              <p className="text-xs text-gray-500">Click any bar to drill down into that category</p>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ height: Math.max(360, categoryTotals.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryTotals}
                  layout="vertical"
                  margin={{ left: 16, right: 24 }}
                  onClick={(e) => { if (e?.activeLabel) onSelectCategory(e.activeLabel as string); }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString()}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => {
                    const pct = totalExpenses > 0 ? ((v / totalExpenses) * 100).toFixed(1) : 0;
                    return [`${money(v)} (${pct}%)`, "Amount"];
                  }} />
                  <Bar dataKey="amount" radius={[0, 14, 14, 0]} style={{ cursor: "pointer" }}>
                    {categoryTotals.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Inline stats */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              {categoryTotals.slice(0, 6).map((cat) => (
                <div
                  key={cat.name}
                  onClick={() => onSelectCategory(cat.name)}
                  className="flex-1 min-w-[140px] p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-sm" style={{ background: cat.color }} />
                    <span className="text-xs font-medium text-gray-500">{cat.name}</span>
                  </div>
                  <div className="text-base font-bold">{money(cat.amount)}</div>
                  <div className="text-[10px] text-gray-400">
                    {money(Math.round(cat.amount / numCompleteMonths))}/mo - {totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly category trend + Recurring */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Monthly Category Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData as any[]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [money(v), "Amount"]} />
                    {categoryKeys.map((key) => (
                      <Bar key={key} dataKey={key} stackId="a" fill={CATEGORY_COLORS[key]} name={CATEGORY_LABELS[key]} />
                    ))}
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Recurring Charges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dateFilteredRecurring.slice(0, 12).map((item: any) => (
                  <div key={item.merchant} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{item.merchant}</div>
                      <div className="text-[10px] text-gray-400">{item.type} - {item.cadence}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{moneyDecimal(item.avgAmount)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Category detail drill-down
  if (!categoryDetail) return null;
  const catColor = categoryTotals.find((c) => c.name === selectedCategory)?.color || "#6b7280";
  const topMerchants = categoryDetail.merchants.slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectCategory(null)}
          className="text-xs"
        >
          <ChevronLeft className="h-3 w-3 mr-1" /> All categories
        </Button>
        <span className="text-gray-300">/</span>
        <Badge
          variant="outline"
          className="text-xs font-semibold px-3 py-1"
          style={{ borderColor: catColor + "44", backgroundColor: catColor + "18", color: catColor }}
        >
          <span className="w-2 h-2 rounded-full mr-1.5 inline-block" style={{ background: catColor }} />
          {selectedCategory}
        </Badge>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={DollarSign} title="Total spent" value={money(categoryDetail.total)} sub={`${totalExpenses > 0 ? ((categoryDetail.total / totalExpenses) * 100).toFixed(1) : 0}% of all expenses`} />
        <KpiCard icon={TrendingDown} title="Avg per month" value={money(Math.round(categoryDetail.total / numCompleteMonths))} sub={`Over ${numCompleteMonths} months`} />
        <KpiCard icon={CreditCard} title="Transactions" value={String(categoryDetail.txnCount)} sub={`${categoryDetail.merchants.length} unique merchants`} />
        <KpiCard icon={TrendingUp} title="Top merchant" value={categoryDetail.merchants[0]?.merchant || "N/A"} sub={categoryDetail.merchants[0] ? `${money(categoryDetail.merchants[0].amount)} (${((categoryDetail.merchants[0].amount / categoryDetail.total) * 100).toFixed(0)}%)` : ""} />
      </div>

      {/* Monthly trend + Merchant share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDetail.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [money(v), selectedCategory]} />
                  <Bar dataKey="amount" fill={catColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Merchant Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topMerchants} dataKey="amount" nameKey="merchant" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {topMerchants.map((_: any, i: number) => (
                      <Cell key={i} fill={[catColor, catColor + "cc", catColor + "99", catColor + "66", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9"][i % 8]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Merchant table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">All Merchants in {selectedCategory}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 text-left">
                  <th className="px-3 py-2 font-semibold">Merchant</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  <th className="px-3 py-2 text-right font-semibold">% of Category</th>
                  <th className="px-3 py-2 text-right font-semibold">Txns</th>
                  <th className="px-3 py-2 text-right font-semibold">Avg/txn</th>
                  <th className="px-3 py-2 text-right font-semibold">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {categoryDetail.merchants.map((m: any) => (
                  <tr key={m.merchant} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium">{m.merchant}</td>
                    <td className="px-3 py-2 text-right font-semibold">{money(m.amount)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ background: catColor, width: `${categoryDetail.total > 0 ? ((m.amount / categoryDetail.total) * 100) : 0}%` }} />
                        </div>
                        <span className="text-xs">{categoryDetail.total > 0 ? ((m.amount / categoryDetail.total) * 100).toFixed(1) : 0}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{m.count}</td>
                    <td className="px-3 py-2 text-right">{money(Math.round(m.amount / m.count))}</td>
                    <td className="px-3 py-2 text-right text-gray-400 text-xs">{m.lastDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      {categoryDetail.recent.length > 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-left">
                    <th className="px-3 py-1.5">Date</th>
                    <th className="px-3 py-1.5">Description</th>
                    <th className="px-3 py-1.5">Account</th>
                    <th className="px-3 py-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryDetail.recent.map((t: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-3 py-1.5 text-gray-500">{t.date}</td>
                      <td className="px-3 py-1.5">{t.merchant || t.description.slice(0, 50)}</td>
                      <td className="px-3 py-1.5"><Badge variant="secondary" className="text-[10px]">{t.sourceAccount}</Badge></td>
                      <td className="px-3 py-1.5 text-right font-semibold">{money(Math.abs(t.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
