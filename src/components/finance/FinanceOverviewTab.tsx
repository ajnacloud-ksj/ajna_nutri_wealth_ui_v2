import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { money, CATEGORY_COLORS } from "./financeTypes";
import { KpiCard, MiniStat } from "./FinanceKpiCards";
import { useFinanceData } from "./useFinanceData";

interface FinanceOverviewTabProps {
  data: ReturnType<typeof useFinanceData>;
  onCategoryClick: (category: string) => void;
}

export function FinanceOverviewTab({ data, onCategoryClick }: FinanceOverviewTabProps) {
  const {
    summaryStats,
    financialTrend,
    categoryTotals,
    heatMapData,
    cardUsage,
    monthlyData,
    numCompleteMonths,
    isPartialMonth,
  } = data;

  const {
    totalIncome,
    totalExpenses,
    netSavings,
    totalInvested,
    avgMonthlyIncome,
    avgMonthlyExpense,
    investmentRate,
  } = summaryStats;

  const CARD_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-4">
      {/* Income vs Expenses + Quick Read */}
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
                <BarChart data={financialTrend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number, name: string) => [money(v), name]} />
                  <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Quick Read</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">Where your income goes</div>
            <MiniStat label="Earned" value={`${money(totalIncome)} (${money(avgMonthlyIncome)}/mo)`} />
            <div className="border-t border-gray-100 my-2 pt-2">
              <MiniStat label="Spent" value={`${money(totalExpenses)} (${totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(0) : 0}%)`} />
              <span className="text-[11px] text-gray-400 pl-1">{money(avgMonthlyExpense)}/mo</span>
            </div>
            <div className="border-t border-gray-100 my-2 pt-2">
              <MiniStat label="Saved (income - expenses)" value={`${money(netSavings)} (${totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(0) : 0}%)`} />
            </div>
            <div className="bg-gray-50 rounded-lg p-2 mt-2 text-xs">
              <div className="font-semibold text-gray-700 mb-1">Of your {money(netSavings)} saved:</div>
              <MiniStat label="Invested (Fidelity + Robinhood)" value={money(totalInvested)} />
              <MiniStat label="Kept in bank" value={money(netSavings - totalInvested)} />
            </div>
            {isPartialMonth && <div className="text-[10px] text-gray-400 mt-2">Current month excluded from averages (partial data)</div>}
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2 text-xs text-green-800">
              For every $1 earned: {totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(0) : 0}c spent, {totalIncome > 0 ? ((totalInvested / totalIncome) * 100).toFixed(0) : 0}c invested, {totalIncome > 0 ? (((netSavings - totalInvested) / totalIncome) * 100).toFixed(0) : 0}c in bank.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings & Investment Growth + Share of Spend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Savings & Investment Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialTrend}>
                  <defs>
                    <linearGradient id="gradCumSav" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCumInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number, name: string) => [money(v), name]} />
                  <Area type="monotone" dataKey="cumSavings" stroke="#10b981" strokeWidth={2.5} fill="url(#gradCumSav)" name="Cumulative net savings" />
                  <Area type="monotone" dataKey="cumInvested" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gradCumInv)" name="Cumulative invested" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Share of Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryTotals} dataKey="amount" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {categoryTotals.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [money(v), "Amount"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card Usage + Online vs In-store */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Card Usage</CardTitle>
              <p className="text-xs text-gray-500">Spending by account/card</p>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ height: Math.max(200, cardUsage.cards.length * 50) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cardUsage.cards} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString()}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm shadow-lg">
                          <div className="font-semibold mb-1">{d.name}</div>
                          <div>{money(d.amount)} - {d.count} transactions</div>
                          <div className="text-gray-500 text-xs mt-1">
                            {d.topCats.map((c: any) => `${c.name}: ${money(c.amount)}`).join(" | ")}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="amount" radius={[0, 10, 10, 0]}>
                    {cardUsage.cards.map((_: any, i: number) => (
                      <Cell key={i} fill={CARD_COLORS[i % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100">
              {cardUsage.cards.map((card: any, i: number) => (
                <div key={card.name} className="p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-sm" style={{ background: CARD_COLORS[i % 5] }} />
                    <span className="text-xs font-semibold">{card.name}</span>
                  </div>
                  <div className="text-lg font-bold">{money(card.amount)}</div>
                  <div className="text-[10px] text-gray-400">{card.count} txns - {cardUsage.total > 0 ? ((card.amount / cardUsage.total) * 100).toFixed(0) : 0}% of spend</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Online vs In-store</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Online", value: cardUsage.onlineTotal },
                      { name: "In-store", value: cardUsage.inStoreTotal },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    <Cell fill="#6366f1" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center space-y-1 mt-2">
              <div className="text-sm text-gray-600">
                Online: <strong>{money(cardUsage.onlineTotal)}</strong> ({cardUsage.total > 0 ? ((cardUsage.onlineTotal / cardUsage.total) * 100).toFixed(0) : 0}%)
              </div>
              <div className="text-sm text-gray-600">
                In-store: <strong>{money(cardUsage.inStoreTotal)}</strong> ({cardUsage.total > 0 ? ((cardUsage.inStoreTotal / cardUsage.total) * 100).toFixed(0) : 0}%)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending Heat Map */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Spending Heat Map</CardTitle>
            <p className="text-xs text-gray-500">Darker = higher spend that month. Click a category to analyze.</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: 3 }}>
              <thead>
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold min-w-[110px]">Category</th>
                  {monthlyData.map((m) => (
                    <th key={m.month} className="px-1 py-1.5 text-center font-medium min-w-[55px] text-[10px]">
                      {m.month.replace(" 20", " '")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatMapData.map((row) => {
                  const catInfo = categoryTotals.find((c) => c.name === row.category);
                  const color = catInfo?.color || "#6b7280";
                  return (
                    <tr
                      key={row.category}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => onCategoryClick(row.category)}
                    >
                      <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} />
                          {row.category}
                        </span>
                      </td>
                      {monthlyData.map((m) => {
                        const val = row[m.month] || 0;
                        const intensity = row._max > 0 ? (val as number) / row._max : 0;
                        return (
                          <td
                            key={m.month}
                            className="px-1 py-1.5 text-center rounded"
                            style={{
                              background: val > 0 ? `${color}${Math.round(intensity * 200 + 20).toString(16).padStart(2, "0")}` : "#f8fafc",
                              color: intensity > 0.6 ? "white" : "#334155",
                              fontWeight: val > 0 ? 500 : 400,
                              fontSize: 10,
                            }}
                          >
                            {val > 0 ? `$${Math.round(val as number).toLocaleString()}` : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Category Mix */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Category Mix</CardTitle>
            <p className="text-xs text-gray-500">Click a bar to analyze</p>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ height: Math.max(320, categoryTotals.length * 36) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryTotals}
                layout="vertical"
                margin={{ left: 16, right: 16 }}
                onClick={(e) => { if (e?.activeLabel) onCategoryClick(e.activeLabel as string); }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [money(v), "Amount"]} />
                <Bar dataKey="amount" radius={[0, 14, 14, 0]} style={{ cursor: "pointer" }}>
                  {categoryTotals.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
