
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { ReceiptEntry } from "@/types/receipt";

interface CompactReceiptStatsGridProps {
  receipts: ReceiptEntry[];
}

export const CompactReceiptStatsGrid = ({ receipts }: CompactReceiptStatsGridProps) => {
  const totalReceipts = receipts.length;
  const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0);
  const avgAmount = totalReceipts > 0 ? totalAmount / totalReceipts : 0;

  // Calculate this month's spending
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs font-medium">Total Receipts</p>
              <p className="text-xl font-bold">{totalReceipts}</p>
            </div>
            <Receipt className="h-6 w-6 text-orange-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-500 to-purple-500 text-white border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium">Total Spending</p>
              <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
            <DollarSign className="h-6 w-6 text-blue-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs font-medium">This Month</p>
              <p className="text-xl font-bold">{formatCurrency(thisMonthAmount)}</p>
            </div>
            <Calendar className="h-6 w-6 text-green-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium">Avg Spending</p>
              <p className="text-xl font-bold">{formatCurrency(avgAmount)}</p>
            </div>
            <TrendingUp className="h-6 w-6 text-emerald-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
