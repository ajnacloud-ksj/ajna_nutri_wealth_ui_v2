import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar, ShoppingCart, FileText, Store, CreditCard, Tag } from "lucide-react";
import { ReceiptEntry } from "@/types/receipt";
import { ResolvedImg } from "@/components/ui/lazy-image";

interface ModernReceiptCardProps {
  receipt: ReceiptEntry;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Grocery: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  Restaurant: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  Retail: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Gas: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  Pharmacy: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  Entertainment: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Services: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  Other: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

export const ModernReceiptCard = ({ receipt, onView, onDelete }: ModernReceiptCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getItemCount = (items: any) => {
    if (!items) return 0;
    if (Array.isArray(items)) return items.length;
    if (items.items && Array.isArray(items.items)) return items.items.length;
    return 0;
  };

  const handleCardClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) return;
    onView(receipt.id);
  };

  const itemCount = getItemCount(receipt.items);
  const category = receipt.purchase_channel || receipt.category || receipt.tags?.[0] || "Other";
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.Other;

  return (
    <div
      className={`group relative flex gap-4 p-4 rounded-xl bg-white border ${style.border} hover:shadow-lg transition-all duration-200 cursor-pointer`}
      onClick={handleCardClick}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${style.bg.replace('50', '400')} opacity-60`} />

      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center border border-gray-100">
        {receipt.image_url ? (
          <ResolvedImg
            src={receipt.image_url}
            alt="Receipt"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${style.bg}`}>
            <FileText className={`h-6 w-6 ${style.text}`} />
          </div>
        )}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-2">
          <Store className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-sm text-gray-900 truncate">
            {receipt.vendor || 'Unknown Vendor'}
          </span>
          <Badge className={`${style.bg} ${style.text} border-0 text-[10px] h-5 font-medium px-2 hidden sm:inline-flex`}>
            {category}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(receipt.receipt_date || receipt.created_at)}
          </span>
          {itemCount > 0 && (
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          )}
          {receipt.payment_method && receipt.payment_method !== 'Other' && (
            <span className="flex items-center gap-1 hidden md:flex">
              <CreditCard className="h-3 w-3" />
              {receipt.payment_method}
              {receipt.card_last_digits && ` ...${receipt.card_last_digits}`}
            </span>
          )}
        </div>
      </div>

      {/* Amount + delete */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="font-bold text-base tabular-nums text-gray-900">
            {formatCurrency(receipt.total_amount)}
          </div>
          {receipt.tax_amount != null && receipt.tax_amount > 0 && (
            <div className="text-[10px] text-gray-400 mt-0.5">
              incl. {formatCurrency(receipt.tax_amount)} tax
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onDelete(receipt.id); }}
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
