import { Receipt, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { ReceiptEntry } from "@/types/receipt";

interface CompactReceiptStatsGridProps {
  receipts: ReceiptEntry[];
}

export const CompactReceiptStatsGrid = ({ receipts }: CompactReceiptStatsGridProps) => {
  const totalReceipts = receipts.length;
  const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0);
  const avgAmount = totalReceipts > 0 ? totalAmount / totalReceipts : 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthReceipts = receipts.filter(receipt => {
    const receiptDate = new Date(receipt.receipt_date || receipt.created_at);
    return receiptDate.getMonth() === currentMonth && receiptDate.getFullYear() === currentYear;
  });
  const thisMonthAmount = thisMonthReceipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const stats = [
    { label: 'Receipts', value: String(totalReceipts), icon: Receipt, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Spent', value: formatCurrency(totalAmount), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'This Month', value: formatCurrency(thisMonthAmount), icon: Calendar, color: 'text-violet-600 bg-violet-50' },
    { label: 'Average', value: formatCurrency(avgAmount), icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-3 p-3 rounded-xl border bg-white">
          <div className={`p-2 rounded-lg ${stat.color}`}>
            <stat.icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold tabular-nums leading-tight">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
