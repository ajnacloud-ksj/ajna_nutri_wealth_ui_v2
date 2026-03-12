import { useMemo } from "react";
import { MonthlyData, Transaction, OutflowMonth, CATEGORY_COLORS, CATEGORY_LABELS } from "./financeTypes";

const EMPTY_DATA = { monthlyData: [], transactions: [], outflowByMonth: [], recurringItems: [], accountBalances: { bofaChecking: 0, sofiSavings: 0 }, dateRange: null };

export function useFinanceData(range: string, dashboardData?: any) {
  const rawData = dashboardData || EMPTY_DATA;

  const allMonthlyData = (rawData.monthlyData || []) as MonthlyData[];
  const allTransactions = (rawData.transactions || []) as Transaction[];
  const allOutflowByMonth = (rawData.outflowByMonth || []) as OutflowMonth[];
  const recurringItems = rawData.recurringItems || [];
  const accountBalances = rawData.accountBalances || { bofaChecking: 0, sofiSavings: 0 };
  const dateRange = rawData.dateRange;

  const monthlyData = useMemo(() => {
    if (range === "All") return allMonthlyData;
    const months = [
      { label: "1M", months: 1 },
      { label: "3M", months: 3 },
      { label: "6M", months: 6 },
      { label: "1Y", months: 12 },
    ].find((r) => r.label === range)?.months || 0;
    if (months === 0) return allMonthlyData;
    return allMonthlyData.slice(-months);
  }, [range, allMonthlyData]);

  const allowedMonths = useMemo(() => new Set(monthlyData.map((m) => m.month)), [monthlyData]);

  const outflowByMonth = useMemo(() => {
    if (range === "All") return allOutflowByMonth;
    const months = [
      { label: "1M", months: 1 },
      { label: "3M", months: 3 },
      { label: "6M", months: 6 },
      { label: "1Y", months: 12 },
    ].find((r) => r.label === range)?.months || 0;
    if (months === 0) return allOutflowByMonth;
    return allOutflowByMonth.slice(-months);
  }, [range, allOutflowByMonth]);

  const outflowTotals = useMemo(() => {
    const t = { investments: 0, cardPayments: 0, rent: 0, expenses: 0, zelle: 0, otherTransfers: 0, total: 0 };
    for (const m of outflowByMonth) {
      t.investments += m.investments;
      t.cardPayments += m.cardPayments;
      t.rent += m.rent;
      t.expenses += m.expenses;
      t.zelle += m.zelle;
      t.otherTransfers += m.otherTransfers;
      t.total += m.total;
    }
    return t;
  }, [outflowByMonth]);

  const isPartialMonth = useMemo(() => {
    if (monthlyData.length === 0) return false;
    const last = monthlyData[monthlyData.length - 1];
    const now = new Date();
    const currentMonthKey = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return last.month === currentMonthKey;
  }, [monthlyData]);

  const completeMonths = isPartialMonth ? monthlyData.slice(0, -1) : monthlyData;
  const numCompleteMonths = completeMonths.length || 1;

  const summaryStats = useMemo(() => {
    const totalIncome = monthlyData.reduce((a, b) => a + (b.income || 0), 0);
    const totalExpenses = monthlyData.reduce((a, b) => a + (b.expenses || 0), 0);
    const totalRent = monthlyData.reduce((a, b) => a + (b.housing || 0), 0);
    const netSavings = totalIncome - totalExpenses;
    const avgMonthlyExpense = monthlyData.length > 0 ? Math.round(totalExpenses / monthlyData.length) : 0;

    const totalInvested = outflowTotals.investments;
    const investmentRate = totalIncome > 0 ? ((totalInvested / totalIncome) * 100).toFixed(1) : "0";
    const avgMonthlyIncome = Math.round(totalIncome / numCompleteMonths);
    const avgMonthlyInvestment = Math.round(totalInvested / numCompleteMonths);

    return {
      totalIncome,
      totalExpenses,
      totalRent,
      totalSpending: totalExpenses - totalRent,
      netSavings,
      avgMonthlyExpense,
      totalInvested,
      investmentRate,
      avgMonthlyIncome,
      avgMonthlyInvestment,
    };
  }, [monthlyData, outflowTotals, numCompleteMonths]);

  const categoryTotals = useMemo(() => {
    const catKeys = Object.keys(CATEGORY_COLORS);
    const totals = catKeys.map((key) => ({
      name: CATEGORY_LABELS[key],
      amount: monthlyData.reduce((a, b) => a + ((b[key] as number) || 0), 0),
      color: CATEGORY_COLORS[key],
    }));
    return totals.filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [monthlyData]);

  const financialTrend = useMemo(() => {
    const investByMonth: Record<string, number> = {};
    let txns = allTransactions.filter((t) => t.transactionType === "transfer" && t.amount < 0);
    if (range !== "All") {
      txns = txns.filter((t) => {
        const d = new Date(t.date + "T00:00:00");
        const mk = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        return allowedMonths.has(mk);
      });
    }
    const investKw = ["FID BKG SVC", "ROBINHOOD", "INSTANT PAYMENT; ROBINHOOD"];
    for (const t of txns) {
      const upper = t.description.toUpperCase();
      if (investKw.some((kw) => upper.includes(kw))) {
        const d = new Date(t.date + "T00:00:00");
        const mk = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        investByMonth[mk] = (investByMonth[mk] || 0) + Math.abs(t.amount);
      }
    }
    let cumSavings = 0;
    let cumInvested = 0;
    return monthlyData.map((m) => {
      const inv = Math.round((investByMonth[m.month] || 0) * 100) / 100;
      const net = m.income - m.expenses;
      cumSavings += net;
      cumInvested += inv;
      return {
        month: m.month,
        income: m.income,
        expenses: m.expenses,
        net: Math.round(net * 100) / 100,
        investments: inv,
        cumSavings: Math.round(cumSavings * 100) / 100,
        cumInvested: Math.round(cumInvested * 100) / 100,
      };
    });
  }, [monthlyData, allTransactions, range, allowedMonths]);

  const heatMapData = useMemo(() => {
    const cats = categoryTotals.slice(0, 10).map((c) => c.name);
    const catKeyMap: Record<string, string> = {};
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      catKeyMap[label] = key;
    }
    return cats.map((catName) => {
      const key = catKeyMap[catName];
      const row: Record<string, any> = { category: catName };
      let max = 0;
      for (const m of monthlyData) {
        const val = (m[key] as number) || 0;
        if (val > max) max = val;
        row[m.month] = val;
      }
      row._max = max;
      return row;
    });
  }, [monthlyData, categoryTotals]);

  const cardUsage = useMemo(() => {
    let txns = allTransactions.filter((t) => t.transactionType === "expense");
    if (range !== "All") {
      txns = txns.filter((t) => {
        const d = new Date(t.date + "T00:00:00");
        const mk = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        return allowedMonths.has(mk);
      });
    }
    const byCard: Record<string, any> = {};
    let onlineTotal = 0, inStoreTotal = 0;
    const onlineKw = ["AMAZON", "AMZN", "APPLE.COM", "NETFLIX", "OPENAI", "ANTHROPIC", "CURSOR", "DISNEYPLUS", "DISNEY+", "GENSPARK", "LOVABLE", "PULUMI", "MINT MOBILE", "COMCAST", "WWW COSTCO COM", "REI.COM", "ONEQUINCE", "PUSHMYCART", "EBAY", "AFFIRM", "IC* COSTCO BY INSTACAR", "EZCATER", "RELISH BY EZCATER"];
    for (const t of txns) {
      const src = t.sourceAccount;
      if (!byCard[src]) byCard[src] = { name: src, amount: 0, count: 0, categories: {} };
      const amt = Math.abs(t.amount);
      byCard[src].amount += amt;
      byCard[src].count++;
      byCard[src].categories[t.category] = (byCard[src].categories[t.category] || 0) + amt;
      const upper = t.description.toUpperCase();
      if (onlineKw.some((kw) => upper.includes(kw))) onlineTotal += amt;
      else inStoreTotal += amt;
    }
    const cards = Object.values(byCard)
      .map((c: any) => {
        const topCats = Object.entries(c.categories)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, amount]: [string, any]) => ({ name, amount: Math.round(amount) }));
        return { ...c, amount: Math.round(c.amount * 100) / 100, topCats };
      })
      .sort((a: any, b: any) => b.amount - a.amount);
    const total = cards.reduce((s: number, c: any) => s + c.amount, 0);
    return { cards, total, onlineTotal: Math.round(onlineTotal), inStoreTotal: Math.round(inStoreTotal) };
  }, [allTransactions, range, allowedMonths]);

  const filteredAlerts = useMemo(() => {
    const out: { title: string; body: string; level: string }[] = [];
    const { totalIncome, totalExpenses } = summaryStats;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    if (savingsRate > 20) {
      out.push({ title: "Strong Savings Rate", body: `You're saving ${savingsRate.toFixed(1)}% of your income. Well done!`, level: "good" });
    } else if (savingsRate > 0) {
      out.push({ title: "Positive Savings", body: `Savings rate is ${savingsRate.toFixed(1)}%. Consider ways to increase it.`, level: "info" });
    } else {
      out.push({ title: "Spending Exceeds Income", body: `You're spending more than you earn. Review your expenses.`, level: "warning" });
    }
    if (categoryTotals.length > 0) {
      const top = categoryTotals[0];
      out.push({ title: `Top Spending: ${top.name}`, body: `${top.name} is your biggest expense at $${top.amount.toLocaleString()}.`, level: "info" });
    }
    if (monthlyData.length >= 2) {
      let maxSpike = 0, spikeMonth = "";
      for (let i = 1; i < monthlyData.length; i++) {
        const prev = monthlyData[i - 1].expenses;
        const curr = monthlyData[i].expenses;
        if (prev > 0) {
          const pct = ((curr - prev) / prev) * 100;
          if (pct > maxSpike) { maxSpike = pct; spikeMonth = monthlyData[i].month; }
        }
      }
      if (maxSpike > 30) {
        out.push({ title: "Spending Spike", body: `${spikeMonth} had a ${maxSpike.toFixed(0)}% increase in spending vs the prior month.`, level: "warning" });
      }
    }
    return out;
  }, [summaryStats, categoryTotals, monthlyData]);

  const getCategoryDetail = (selectedCategory: string | null) => {
    if (!selectedCategory) return null;
    let txns = allTransactions.filter((t) => t.transactionType === "expense" && t.category === selectedCategory);
    if (range !== "All") {
      txns = txns.filter((t) => {
        const d = new Date(t.date + "T00:00:00");
        const mk = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        return allowedMonths.has(mk);
      });
    }
    const byMonth: Record<string, number> = {};
    for (const t of txns) {
      const d = new Date(t.date + "T00:00:00");
      const mk = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!byMonth[mk]) byMonth[mk] = 0;
      byMonth[mk] += Math.abs(t.amount);
    }
    const monthlyTrend = monthlyData.map((m) => ({
      month: m.month,
      amount: Math.round((byMonth[m.month] || 0) * 100) / 100,
    }));
    const byMerchant: Record<string, any> = {};
    for (const t of txns) {
      const merchant = t.merchant || t.description.slice(0, 35);
      if (!byMerchant[merchant]) byMerchant[merchant] = { merchant, amount: 0, count: 0, dates: [] as string[] };
      byMerchant[merchant].amount += Math.abs(t.amount);
      byMerchant[merchant].count++;
      byMerchant[merchant].dates.push(t.date);
    }
    const merchants = Object.values(byMerchant)
      .map((m: any) => ({ ...m, amount: Math.round(m.amount * 100) / 100, lastDate: m.dates.sort().pop() }))
      .sort((a: any, b: any) => b.amount - a.amount);
    const total = Math.round(txns.reduce((s, t) => s + Math.abs(t.amount), 0) * 100) / 100;
    const recent = [...txns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    return { monthlyTrend, merchants, total, txnCount: txns.length, recent };
  };

  const incomeBreakdown = useMemo(() => {
    let txns = allTransactions.filter((t) => t.transactionType === "income");
    if (range !== "All") {
      txns = txns.filter((t) => {
        const d = new Date(t.date + "T00:00:00");
        const mk = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        return allowedMonths.has(mk);
      });
    }
    const sourceMap: Record<string, any> = {};
    const categorize = (desc: string) => {
      const upper = desc.toUpperCase();
      if (upper.includes("TRACELINK")) return "Salary";
      if (upper.includes("IRS") && upper.includes("TREAS")) return "Tax Refund";
      if (upper.includes("INTEREST")) return "Interest";
      if (upper.includes("ZELLE PAYMENT FROM")) return "Zelle Received";
      if (upper.includes("BKOFAMERICA MOBILE")) return "Mobile Deposit";
      return "Other Income";
    };
    for (const t of txns) {
      const source = categorize(t.description);
      const amt = Math.abs(t.amount);
      const merchant = t.merchant || t.description.slice(0, 40);
      if (!sourceMap[source]) sourceMap[source] = { name: source, amount: 0, count: 0, merchants: {} };
      sourceMap[source].amount += amt;
      sourceMap[source].count++;
      if (!sourceMap[source].merchants[merchant]) sourceMap[source].merchants[merchant] = { merchant, amount: 0, count: 0, dates: [] as string[] };
      sourceMap[source].merchants[merchant].amount += amt;
      sourceMap[source].merchants[merchant].count++;
      sourceMap[source].merchants[merchant].dates.push(t.date);
    }
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#7c3aed", "#ef4444", "#ec4899"];
    const sources = Object.values(sourceMap)
      .map((s: any, i: number) => ({
        ...s,
        amount: Math.round(s.amount * 100) / 100,
        color: colors[i % colors.length],
        merchants: Object.values(s.merchants)
          .map((m: any) => ({
            ...m,
            amount: Math.round(m.amount * 100) / 100,
            avg: Math.round(m.amount / m.count),
            lastDate: m.dates.sort().pop(),
          }))
          .sort((a: any, b: any) => b.amount - a.amount),
      }))
      .sort((a: any, b: any) => b.amount - a.amount);
    const total = sources.reduce((s: number, c: any) => s + c.amount, 0);

    const byMonth: Record<string, Record<string, number>> = {};
    for (const t of txns) {
      const source = categorize(t.description);
      const d = new Date(t.date + "T00:00:00");
      const mk = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!byMonth[mk]) byMonth[mk] = {};
      byMonth[mk][source] = (byMonth[mk][source] || 0) + Math.abs(t.amount);
    }
    const sourceNames = sources.map((s: any) => s.name);
    const monthlyTrend = monthlyData.map((m) => {
      const row: Record<string, any> = { month: m.month };
      for (const src of sourceNames) row[src] = Math.round((byMonth[m.month]?.[src] || 0) * 100) / 100;
      return row;
    });
    return { sources, total, sourceNames, monthlyTrend };
  }, [allTransactions, range, allowedMonths, monthlyData]);

  const filteredInvestmentSummary = useMemo(() => {
    let txns = allTransactions.filter((t) => t.transactionType === "transfer" && t.amount < 0);
    if (range !== "All") {
      txns = txns.filter((t) => {
        const d = new Date(t.date + "T00:00:00");
        const mk = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        return allowedMonths.has(mk);
      });
    }
    const destMap: Record<string, string[]> = {
      "Fidelity (401k/Brokerage)": ["FID BKG SVC"],
      "Robinhood": ["ROBINHOOD", "INSTANT PAYMENT; ROBINHOOD"],
    };
    const byDest: Record<string, any> = {};
    const byMonth: Record<string, Record<string, number>> = {};
    for (const t of txns) {
      const upper = t.description.toUpperCase();
      for (const [dest, keywords] of Object.entries(destMap)) {
        if (keywords.some((kw) => upper.includes(kw))) {
          const amt = Math.abs(t.amount);
          if (!byDest[dest]) byDest[dest] = { name: dest, amount: 0, count: 0 };
          byDest[dest].amount += amt;
          byDest[dest].count++;
          const d = new Date(t.date + "T00:00:00");
          const mk = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          if (!byMonth[mk]) byMonth[mk] = {};
          byMonth[mk][dest] = (byMonth[mk][dest] || 0) + amt;
          break;
        }
      }
    }
    const byDestination = Object.values(byDest)
      .map((d: any) => ({ ...d, amount: Math.round(d.amount * 100) / 100 }))
      .sort((a: any, b: any) => b.amount - a.amount);
    const totalInvested = byDestination.reduce((s: number, d: any) => s + d.amount, 0);
    const count = byDestination.reduce((s: number, d: any) => s + d.count, 0);
    const destNames = byDestination.map((d: any) => d.name);
    const monthlyTrend = monthlyData.map((m) => {
      const row: Record<string, any> = { month: m.month };
      for (const dest of destNames) row[dest] = Math.round((byMonth[m.month]?.[dest] || 0) * 100) / 100;
      row.total = destNames.reduce((s: number, d: string) => s + (row[d] || 0), 0);
      return row;
    });
    return { totalInvested, byDestination, count, monthlyTrend, destNames };
  }, [allTransactions, range, allowedMonths, monthlyData]);

  const dateFilteredRecurring = useMemo(() => {
    if (range === "All") return recurringItems;
    let txns = allTransactions.filter((t) => t.transactionType === "expense");
    txns = txns.filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      const mk = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return allowedMonths.has(mk);
    });
    const byMerchant: Record<string, any> = {};
    for (const t of txns) {
      const key = t.description;
      if (!byMerchant[key]) byMerchant[key] = { merchant: key, type: t.category, amounts: [] as number[], dates: [] as string[] };
      byMerchant[key].amounts.push(Math.abs(t.amount));
      byMerchant[key].dates.push(t.date);
    }
    return Object.values(byMerchant)
      .filter((m: any) => m.amounts.length >= 2)
      .map((m: any) => {
        const avg = m.amounts.reduce((a: number, b: number) => a + b, 0) / m.amounts.length;
        const sortedDates = m.dates.sort();
        let cadence = "monthly";
        if (sortedDates.length >= 2) {
          const gaps: number[] = [];
          for (let i = 1; i < sortedDates.length; i++) {
            gaps.push((new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / (1000 * 60 * 60 * 24));
          }
          const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
          if (avgGap > 300) cadence = "yearly";
          else if (avgGap > 60) cadence = "quarterly";
        }
        return { merchant: m.merchant, type: m.type, cadence, avgAmount: Math.round(avg * 100) / 100 };
      })
      .sort((a: any, b: any) => b.avgAmount - a.avgAmount);
  }, [range, allowedMonths, recurringItems, allTransactions]);

  const allSources = useMemo(() => [...new Set(allTransactions.map((t) => t.sourceAccount))].filter(Boolean).sort() as string[], [allTransactions]);
  const allCategories = useMemo(() => [...new Set(allTransactions.map((t) => t.category))].filter(Boolean).sort() as string[], [allTransactions]);
  const allTypes = useMemo(() => [...new Set(allTransactions.map((t) => t.transactionType))].filter(Boolean).sort() as string[], [allTransactions]);

  return {
    monthlyData,
    allTransactions,
    allowedMonths,
    outflowByMonth,
    outflowTotals,
    summaryStats,
    categoryTotals,
    financialTrend,
    heatMapData,
    cardUsage,
    filteredAlerts,
    getCategoryDetail,
    incomeBreakdown,
    filteredInvestmentSummary,
    dateFilteredRecurring,
    accountBalances,
    dateRange,
    numCompleteMonths,
    isPartialMonth,
    allSources,
    allCategories,
    allTypes,
  };
}
