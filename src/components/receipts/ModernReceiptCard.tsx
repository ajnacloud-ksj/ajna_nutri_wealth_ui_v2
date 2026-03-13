import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar, CreditCard, ShoppingCart, FileText } from "lucide-react";
import { ReceiptEntry } from "@/types/receipt";
import { ResolvedImg } from "@/components/ui/lazy-image";

interface ModernReceiptCardProps {
  receipt: ReceiptEntry;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ModernReceiptCard = ({ receipt, onView, onDelete }: ModernReceiptCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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

  return (
    <div
      className="group flex items-center gap-4 p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
        {receipt.image_url ? (
          <ResolvedImg
            src={receipt.image_url}
            alt="Receipt"
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText className="h-6 w-6 text-gray-300" />
        )}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 truncate">
            {receipt.vendor || 'Unknown Vendor'}
          </span>
          {receipt.category && (
            <Badge variant="secondary" className="text-[10px] h-5 font-normal hidden sm:inline-flex">
              {receipt.category}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(receipt.receipt_date || receipt.created_at)}
          </span>
          {itemCount > 0 && (
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              {itemCount} items
            </span>
          )}
          {Array.isArray(receipt.tags) && receipt.tags.length > 0 && (
            <span className="hidden sm:inline text-gray-400">
              {receipt.tags[0]}
            </span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <div className="font-bold text-sm tabular-nums">
          {formatCurrency(receipt.total_amount)}
        </div>
      </div>

      {/* Delete - visible on hover */}
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onDelete(receipt.id); }}
        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
