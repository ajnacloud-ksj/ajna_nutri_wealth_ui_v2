import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ChevronLeft, DollarSign, TrendingUp, TrendingDown, CreditCard, PiggyBank, Landmark } from "lucide-react";
import { money } from "./financeTypes";
import { KpiCard, MiniStat } from "./FinanceKpiCards";
import { useFinanceData } from "./useFinanceData";

interface FinanceCashFlowTabProps {
  data: ReturnType<typeof useFinanceData>;
}

export function FinanceCashFlowTab({ data }: FinanceCashFlowTabProps) {
  const [selectedIncomeSource, setSelectedIncomeSource] = useState<string | null>(null);
  const {
    monthlyData,
    summaryStats,
    outflowByMonth,
    outflowTotals,
    incomeBreakdown,
    filteredInvestmentSummary,
    accountBalances,
    numCompleteMonths,
  } = data;

  const {
    totalIncome,
    totalExpenses,
    totalRent,
    totalSpending,
    netSavings,
    totalInvested,
    investmentRate,
  } = summaryStats;

  const INV_COLORS = ["#7c3aed", "#3b82f6", "#10b981"];

  return (
    <div className="space-y-4">
      {/* Income vs Expenses + Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Income vs Expenses</CardTitle>
              <Badge variant="outline" className="text-xs">Monthly</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData as any[]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [money(v), ""]} />
                  <Bar dataKey="income" fill="#10b981" name="Income" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[6, 6, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Income Waterfall</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <MiniStat label="Income" value={money(totalIncome)} />
            <div className="border-t border-gray-100 my-2 pt-2">
              <MiniStat label="- Rent" value={`-${money(totalRent)}`} />
              <MiniStat label="- Living expenses" value={`-${money(totalSpending)}`} />
            </div>
            <div className="border-t border-gray-100 my-2 pt-2">
              <MiniStat label="= Net savings" value={money(netSavings)} />
              <span className="text-[10px] text-gray-400">{totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0}% savings rate</span>
            </div>
            <div className="border-t border-gray-100 my-2 pt-2">
              <MiniStat label="- Invested" value={`-${money(totalInvested)}`} />
              <MiniStat label="= Cash retained" value={money(netSavings - totalInvested)} />
            </div>
            <div className={`${netSavings >= 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-yellow-50 border-yellow-200 text-yellow-800"} border rounded-lg p-2 mt-2 text-xs`}>
              {netSavings - totalInvested >= 0
                ? `${money(netSavings - totalInvested)} retained in bank after expenses & investments.`
                : `Investments exceed net savings by ${money(Math.abs(netSavings - totalInvested))}. Drawing from prior savings.`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Breakdown */}
      {!selectedIncomeSource && (
        <>
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Income by Source</CardTitle>
                <p className="text-xs text-gray-500">Click any bar to see transaction details</p>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ height: Math.max(200, incomeBreakdown.sources.length * 45) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={incomeBreakdown.sources}
                    layout="vertical"
                    margin={{ left: 8, right: 24 }}
                    onClick={(e) => { if (e?.activeLabel) setSelectedIncomeSource(e.activeLabel as string); }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString()}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => {
                      const pct = incomeBreakdown.total > 0 ? ((v / incomeBreakdown.total) * 100).toFixed(1) : 0;
                      return [`${money(v)} (${pct}%)`, "Amount"];
                    }} />
                    <Bar dataKey="amount" radius={[0, 14, 14, 0]} style={{ cursor: "pointer" }}>
                      {incomeBreakdown.sources.map((entry: any, index: number) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                {incomeBreakdown.sources.map((src: any) => (
                  <div
                    key={src.name}
                    onClick={() => setSelectedIncomeSource(src.name)}
                    className="flex-1 min-w-[160px] p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-sm" style={{ background: src.color }} />
                      <span className="text-xs font-medium text-gray-500">{src.name}</span>
                    </div>
                    <div className="text-base font-bold">{money(src.amount)}</div>
                    <div className="text-[10px] text-gray-400">{src.count} deposits - {incomeBreakdown.total > 0 ? ((src.amount / incomeBreakdown.total) * 100).toFixed(0) : 0}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Income trend + Net savings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Income Trend by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeBreakdown.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number, name: string) => [money(v), name]} />
                      {incomeBreakdown.sources.map((src: any, i: number) => (
                        <Bar key={src.name} dataKey={src.name} stackId="inc" fill={src.color} name={src.name} radius={i === incomeBreakdown.sources.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Net Savings Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData as any[]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [money(v), "Net"]} />
                      <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} name="Net Savings" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Income source detail */}
      {selectedIncomeSource && (() => {
        const src = incomeBreakdown.sources.find((s: any) => s.name === selectedIncomeSource);
        if (!src) return null;
        const srcMonthly = incomeBreakdown.monthlyTrend.map((m: any) => ({
          month: m.month,
          amount: m[selectedIncomeSource] || 0,
        }));
        return (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setSelectedIncomeSource(null)} className="text-xs">
                <ChevronLeft className="h-3 w-3 mr-1" /> All income sources
              </Button>
              <span className="text-gray-300">/</span>
              <Badge variant="outline" className="text-xs font-semibold px-3 py-1" style={{ borderColor: src.color + "44", backgroundColor: src.color + "18", color: src.color }}>
                <span className="w-2 h-2 rounded-full mr-1.5 inline-block" style={{ background: src.color }} />
                {selectedIncomeSource}
              </Badge>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard icon={DollarSign} title="Total received" value={money(src.amount)} sub={`${incomeBreakdown.total > 0 ? ((src.amount / incomeBreakdown.total) * 100).toFixed(1) : 0}% of all income`} />
              <KpiCard icon={TrendingUp} title="Avg per month" value={money(Math.round(src.amount / numCompleteMonths))} sub={`Over ${numCompleteMonths} months`} />
              <KpiCard icon={CreditCard} title="Deposits" value={String(src.count)} sub={`${src.merchants.length} unique sources`} />
              <KpiCard icon={Landmark} title="Avg per deposit" value={money(Math.round(src.amount / src.count))} sub={`${src.count} total deposits`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Monthly Trend</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={srcMonthly}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [money(v), selectedIncomeSource]} />
                        <Bar dataKey="amount" fill={src.color} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Source Share</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={src.merchants.slice(0, 8)} dataKey="amount" nameKey="merchant" innerRadius={50} outerRadius={85} paddingAngle={2}>
                          {src.merchants.slice(0, 8).map((_: any, i: number) => (
                            <Cell key={i} fill={[src.color, src.color + "cc", src.color + "99", src.color + "66", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9"][i % 8]} />
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
          </>
        );
      })()}

      {/* Outflow breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Cash Outflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outflowByMonth.map((m: any) => (
                <div key={m.month} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{m.month}</div>
                    <div className="text-[10px] text-gray-400 space-x-1">
                      {m.investments > 0 && <span>Invest: {money(m.investments)}</span>}
                      {m.rent > 0 && <span>Rent: {money(m.rent)}</span>}
                      {m.expenses > 0 && <span>Spending: {money(m.expenses)}</span>}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{money(m.total)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Where Money Goes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <MiniStat label="Investments" value={money(outflowTotals.investments)} />
            <MiniStat label="Rent" value={money(outflowTotals.rent)} />
            <MiniStat label="Card payments" value={money(outflowTotals.cardPayments)} />
            <MiniStat label="Direct spending" value={money(outflowTotals.expenses)} />
            <MiniStat label="Zelle outgoing" value={money(outflowTotals.zelle)} />
            <MiniStat label="Other transfers" value={money(outflowTotals.otherTransfers)} />
            <div className="border-t border-gray-100 my-2 pt-2">
              <MiniStat label="Total outflow" value={money(outflowTotals.total)} />
            </div>
            {totalIncome > 0 && (
              <div className={`${(outflowTotals.investments / totalIncome) > 0.2 ? "bg-green-50 border-green-200 text-green-800" : "bg-yellow-50 border-yellow-200 text-yellow-800"} border rounded-lg p-2 mt-2 text-xs`}>
                {((outflowTotals.investments / totalIncome) * 100).toFixed(1)}% of income goes to investments
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Investment breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={TrendingUp} title="Total invested" value={money(filteredInvestmentSummary.totalInvested)} sub={`${filteredInvestmentSummary.count} transfers`} />
        {filteredInvestmentSummary.byDestination.map((d: any) => (
          <KpiCard key={d.name} icon={Landmark} title={d.name} value={money(d.amount)} sub={`${d.count} transfers`} />
        ))}
        <KpiCard icon={PiggyBank} title="Investment rate" value={`${investmentRate}%`} sub={`of ${money(totalIncome)} income`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Investment Trend by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredInvestmentSummary.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number, name: string) => [money(v), name]} />
                  {filteredInvestmentSummary.destNames.map((dest: string, i: number) => (
                    <Bar key={dest} dataKey={dest} stackId="inv" fill={INV_COLORS[i % 3]} name={dest} radius={i === filteredInvestmentSummary.destNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Split by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={filteredInvestmentSummary.byDestination} dataKey="amount" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {filteredInvestmentSummary.byDestination.map((_: any, i: number) => (
                      <Cell key={i} fill={INV_COLORS[i % 3]} />
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

      {/* Account balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">BofA Checking</span>
              <Landmark className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-xl font-bold">{money(accountBalances.bofaChecking)}</div>
            <div className="text-[10px] text-gray-400">As of {accountBalances.asOf || "latest"}</div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">SoFi Savings</span>
              <PiggyBank className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-xl font-bold">{money(accountBalances.sofiSavings)}</div>
            <div className="text-[10px] text-gray-400">As of {accountBalances.asOf || "latest"}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
