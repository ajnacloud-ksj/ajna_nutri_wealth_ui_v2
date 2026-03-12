import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Receipt,
  DollarSign,
  Store,
  CreditCard,
  Calendar,
  ShoppingCart,
  Tag,
  Clock,
  Hash,
  CheckCircle,
  Percent,
  Package,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import SidebarLayout from "@/components/layout/SidebarLayout";

interface ReceiptItem {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount: number;
  category?: string;
  subcategory?: string;
  department?: string;
  is_taxable?: boolean;
}

interface ReceiptData {
  id: string;
  vendor: string;
  store_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  receipt_date: string;
  receipt_time?: string;
  purchase_channel?: string;
  total_amount: number;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  currency?: string;
  payment_method?: string;
  card_last_digits?: string;
  transaction_id?: string;
  receipt_id?: string;
  image_url?: string;
  notes?: string;
  tags?: string;
  items: ReceiptItem[];
  created_at: string;
  updated_at?: string;
  has_image?: boolean;
}

const ReceiptDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<ReceiptData>>({});

  useEffect(() => {
    if (id) fetchReceipt();
  }, [id]);

  const fetchReceipt = async () => {
    try {
      const response = await api.get(`/v1/receipts/${id}`);
      if (!response.data) throw new Error("Receipt not found");

      const r = response.data;
      // Sanitize bad AI placeholder values
      if (!r.vendor || r.vendor.toLowerCase() === "string" || r.vendor.toLowerCase() === "n/a") {
        r.vendor = "Unknown Vendor";
      }
      if (!r.receipt_date || r.receipt_date.includes("YYYY") || r.receipt_date === "string") {
        r.receipt_date = r.created_at;
      }
      // Normalize items — backend returns items joined from app_receipt_items
      const items = Array.isArray(r.items) ? r.items : r.items?.items || [];
      r.items = items;

      setReceipt(r);
      setEditedData(r);
    } catch (error: any) {
      console.error("Error fetching receipt:", error);
      toast.error("Failed to load receipt");
      navigate("/receipts");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/v1/app_receipts/${id}`, editedData);
      setReceipt({ ...receipt!, ...editedData });
      setEditing(false);
      toast.success("Receipt updated successfully");
    } catch (error: any) {
      console.error("Error updating receipt:", error);
      toast.error("Failed to update receipt");
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: receipt?.currency || "USD",
    }).format(amount || 0);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString || dateString === "string" || dateString.includes("YYYY")) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const formatTime = (timeString: string | undefined | null) => {
    if (!timeString || timeString === "HH:MM:SS" || timeString === "string") return null;
    try {
      const [hours, minutes] = timeString.split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
      return null;
    }
  };

  const parseTags = (tags: string | string[] | undefined | null): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === "string") return tags.split(",").map((t) => t.trim()).filter(Boolean);
    return [];
  };

  // TanStack Table columns for items
  const itemColumns: ColumnDef<ReceiptItem>[] = useMemo(
    () => [
      {
        accessorKey: "index",
        header: "#",
        size: 50,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-gray-500 font-mono text-sm">{row.index + 1}</span>
        ),
      },
      {
        accessorKey: "name",
        header: "Item",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900">{row.original.name || "—"}</div>
            {row.original.description && (
              <div className="text-xs text-gray-500 mt-0.5">{row.original.description}</div>
            )}
            {row.original.sku && (
              <div className="text-xs text-gray-400 font-mono">SKU: {row.original.sku}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => {
          const cat = row.original.category;
          const sub = row.original.subcategory;
          if (!cat) return <span className="text-gray-400">—</span>;
          return (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal">
              {sub ? `${cat} > ${sub}` : cat}
            </Badge>
          );
        },
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        size: 70,
        cell: ({ row }) => (
          <span className="font-mono text-center block">{row.original.quantity || 1}</span>
        ),
      },
      {
        accessorKey: "unit_price",
        header: "Unit Price",
        size: 100,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{formatCurrency(row.original.unit_price)}</span>
        ),
      },
      {
        accessorKey: "discount",
        header: "Discount",
        size: 90,
        cell: ({ row }) => {
          const disc = row.original.discount;
          if (!disc) return <span className="text-gray-400">—</span>;
          return <span className="text-green-600 font-mono text-sm">-{formatCurrency(disc)}</span>;
        },
      },
      {
        accessorKey: "total_price",
        header: "Total",
        size: 100,
        cell: ({ row }) => (
          <span className="font-semibold font-mono">
            {formatCurrency(row.original.total_price || row.original.unit_price * (row.original.quantity || 1))}
          </span>
        ),
      },
      {
        accessorKey: "is_taxable",
        header: "Tax",
        size: 60,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.is_taxable ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
    ],
    [receipt?.currency]
  );

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading receipt...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (!receipt) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">Receipt not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/receipts")}>
              Back to Receipts
            </Button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  const items = receipt.items || [];
  const tags = parseTags(receipt.tags);
  const itemsSubtotal = items.reduce((sum, item) => sum + (item.total_price || item.unit_price * (item.quantity || 1) || 0), 0);
  const time = formatTime(receipt.receipt_time);

  const hasAddress = receipt.store_address || receipt.city || receipt.state;
  const hasPaymentInfo = receipt.payment_method || receipt.card_last_digits;
  const hasFinancialBreakdown = (receipt.subtotal && receipt.subtotal !== receipt.total_amount) || receipt.tax_amount || receipt.discount_amount;

  return (
    <SidebarLayout>
      <div className="space-y-6 p-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/receipts")}
              className="border-green-200 hover:bg-green-50"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                {editing ? (
                  <Input
                    value={editedData.vendor || ""}
                    onChange={(e) => setEditedData({ ...editedData, vendor: e.target.value })}
                    className="text-xl font-bold h-9 w-64"
                  />
                ) : (
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                    {receipt.vendor}
                  </h1>
                )}
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(receipt.receipt_date || receipt.created_at)}
                  </span>
                  {time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {time}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditing(false); setEditedData(receipt); }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
            label="Total"
            value={
              editing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={editedData.total_amount || 0}
                  onChange={(e) => setEditedData({ ...editedData, total_amount: parseFloat(e.target.value) || 0 })}
                  className="h-7 text-sm w-24"
                />
              ) : (
                formatCurrency(receipt.total_amount)
              )
            }
            highlight
          />
          <SummaryCard
            icon={<Package className="h-5 w-5 text-blue-600" />}
            label="Items"
            value={`${items.length} items`}
          />
          <SummaryCard
            icon={<Receipt className="h-5 w-5 text-purple-600" />}
            label="Subtotal"
            value={formatCurrency(receipt.subtotal || receipt.total_amount)}
          />
          <SummaryCard
            icon={<Percent className="h-5 w-5 text-orange-600" />}
            label="Tax"
            value={formatCurrency(receipt.tax_amount)}
          />
          <SummaryCard
            icon={<Tag className="h-5 w-5 text-pink-600" />}
            label="Discount"
            value={receipt.discount_amount ? `-${formatCurrency(receipt.discount_amount)}` : formatCurrency(0)}
          />
          <SummaryCard
            icon={<CreditCard className="h-5 w-5 text-indigo-600" />}
            label="Payment"
            value={receipt.payment_method || "N/A"}
          />
        </div>

        {/* Items Table */}
        <Card className="border-green-200/50 shadow-sm">
          <CardHeader className="border-b border-green-100/50 bg-gradient-to-r from-green-50/50 to-white pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-green-700">
              <ShoppingCart className="h-5 w-5" />
              Purchased Items ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={itemColumns}
              data={items}
              footer={
                items.length > 0 ? (
                  <tr className="bg-green-50/80 border-t-2 border-green-200">
                    <td className="px-4 py-3" colSpan={4}>
                      <span className="font-semibold text-gray-700">Total ({items.length} items)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-600">
                        {formatCurrency(items.reduce((s, i) => s + (i.unit_price || 0), 0))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-green-600">
                        {items.some(i => i.discount) ? `-${formatCurrency(items.reduce((s, i) => s + (i.discount || 0), 0))}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold font-mono text-green-700">
                        {formatCurrency(itemsSubtotal)}
                      </span>
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                ) : undefined
              }
            />
          </CardContent>
        </Card>

        {/* Receipt Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receipt Info */}
          <Card className="border-green-200/50 shadow-sm">
            <CardHeader className="border-b border-green-100/50 bg-gradient-to-r from-green-50/50 to-white pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-green-700">
                <Receipt className="h-5 w-5" />
                Receipt Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <InfoRow label="Vendor" value={receipt.vendor} />
                <InfoRow label="Date" value={formatDate(receipt.receipt_date || receipt.created_at)} />
                {time && <InfoRow label="Time" value={time} />}
                {receipt.purchase_channel && (
                  <InfoRow
                    label="Category"
                    value={<Badge variant="secondary">{receipt.purchase_channel}</Badge>}
                  />
                )}
                {receipt.receipt_id && <InfoRow label="Receipt #" value={receipt.receipt_id} mono />}
                {receipt.transaction_id && <InfoRow label="Transaction ID" value={receipt.transaction_id} mono />}
                {receipt.currency && receipt.currency !== "USD" && (
                  <InfoRow label="Currency" value={receipt.currency} />
                )}
                {receipt.notes && <InfoRow label="Notes" value={receipt.notes} />}
                {tags.length > 0 && (
                  <InfoRow
                    label="Tags"
                    value={
                      <div className="flex gap-1.5 flex-wrap">
                        {tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    }
                  />
                )}
                <Separator className="my-2" />
                <InfoRow label="Created" value={formatDate(receipt.created_at)} />
                {receipt.updated_at && receipt.updated_at !== receipt.created_at && (
                  <InfoRow label="Updated" value={formatDate(receipt.updated_at)} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Store & Payment */}
          <div className="space-y-6">
            {/* Payment Details */}
            <Card className="border-green-200/50 shadow-sm">
              <CardHeader className="border-b border-green-100/50 bg-gradient-to-r from-green-50/50 to-white pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-green-700">
                  <CreditCard className="h-5 w-5" />
                  Payment & Financial
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <InfoRow label="Total Amount" value={<span className="font-bold text-green-600 text-lg">{formatCurrency(receipt.total_amount)}</span>} />
                  {hasFinancialBreakdown && (
                    <>
                      <InfoRow label="Subtotal" value={formatCurrency(receipt.subtotal)} />
                      {receipt.tax_amount !== undefined && receipt.tax_amount !== null && (
                        <InfoRow label="Tax" value={formatCurrency(receipt.tax_amount)} />
                      )}
                      {receipt.discount_amount !== undefined && receipt.discount_amount !== null && receipt.discount_amount > 0 && (
                        <InfoRow label="Discount" value={<span className="text-green-600">-{formatCurrency(receipt.discount_amount)}</span>} />
                      )}
                    </>
                  )}
                  <Separator className="my-2" />
                  {receipt.payment_method && (
                    <InfoRow
                      label="Method"
                      value={
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          {receipt.payment_method}
                        </Badge>
                      }
                    />
                  )}
                  {receipt.card_last_digits && (
                    <InfoRow label="Card" value={<span className="font-mono">**** **** **** {receipt.card_last_digits}</span>} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Store Info */}
            {hasAddress && (
              <Card className="border-green-200/50 shadow-sm">
                <CardHeader className="border-b border-green-100/50 bg-gradient-to-r from-green-50/50 to-white pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-green-700">
                    <Store className="h-5 w-5" />
                    Store Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <InfoRow label="Store" value={receipt.vendor} />
                    {receipt.store_address && <InfoRow label="Address" value={receipt.store_address} />}
                    {(receipt.city || receipt.state || receipt.postal_code) && (
                      <InfoRow
                        label="Location"
                        value={[receipt.city, receipt.state, receipt.postal_code].filter(Boolean).join(", ")}
                      />
                    )}
                    {receipt.country && <InfoRow label="Country" value={receipt.country} />}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Receipt Image */}
            {receipt.image_url && (
              <Card className="border-green-200/50 shadow-sm">
                <CardHeader className="border-b border-green-100/50 bg-gradient-to-r from-green-50/50 to-white pb-4">
                  <CardTitle className="text-lg text-green-700">Receipt Image</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <img
                    src={receipt.image_url}
                    alt="Receipt"
                    className="w-full rounded-lg shadow-sm border"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

// Summary card component
function SummaryCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={`border-green-200/50 shadow-sm ${highlight ? "bg-gradient-to-br from-green-50 to-white ring-1 ring-green-200" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        </div>
        <div className={`text-lg font-bold ${highlight ? "text-green-700" : "text-gray-900"}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// Info row component
function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm font-medium text-gray-500 min-w-[100px] flex-shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 text-right ${mono ? "font-mono bg-gray-100 px-2 py-0.5 rounded text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default ReceiptDetails;
