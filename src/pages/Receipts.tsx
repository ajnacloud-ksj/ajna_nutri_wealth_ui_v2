
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Plus, LayoutGrid, List, RefreshCw } from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FloatingCaptureButton } from "@/components/capture/FloatingCaptureButton";
import { CompactReceiptStatsGrid } from "@/components/receipts/CompactReceiptStatsGrid";
import { ModernReceiptCard } from "@/components/receipts/ModernReceiptCard";
import { ReceiptTable } from "@/components/receipts/ReceiptTable";
import { ModernFilterBar } from "@/components/common/ModernFilterBar";
import { getUniqueVendors } from "@/utils/receiptUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReceiptEntry } from "@/types/receipt";

const Receipts = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [receipts, setReceipts] = useState<ReceiptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const sortOptions = [
    { value: 'date-desc', label: 'Date (newest first)' },
    { value: 'date-asc', label: 'Date (oldest first)' },
    { value: 'amount-desc', label: 'Amount (high to low)' },
    { value: 'amount-asc', label: 'Amount (low to high)' },
    { value: 'vendor-asc', label: 'Vendor (A-Z)' },
    { value: 'vendor-desc', label: 'Vendor (Z-A)' },
  ];

  const { user } = useAuth();

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await backendApi.get('/v1/receipts');
      const userReceipts = (response.data?.receipts || []).map((r: any) => ({
        ...r,
        vendor: (!r.vendor || r.vendor.toLowerCase() === 'string' || r.vendor.toLowerCase() === 'n/a') ? 'Unknown Vendor' : r.vendor,
        receipt_date: (!r.receipt_date || r.receipt_date.includes('YYYY') || r.receipt_date === 'string') ? r.created_at : r.receipt_date,
      }));
      userReceipts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setReceipts(userReceipts);
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      toast.error("Failed to load receipts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReceipts();
    toast.success("Receipts refreshed");
  };

  const deleteReceipt = async (id: string) => {
    try {
      await backendApi.delete(`/v1/app_receipts/${id}`);
      toast.success("Receipt deleted successfully");
      fetchReceipts();
    } catch (error: any) {
      console.error('Error deleting receipt:', error);
      toast.error("Failed to delete receipt");
    }
  };

  const handleRowClick = (receiptId: string, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('button')) return;
    navigate(`/receipts/${receiptId}`);
  };

  const processedReceipts = useMemo(() => {
    let filtered = receipts;

    if (searchTerm) {
      filtered = filtered.filter(receipt =>
        receipt.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedVendor && selectedVendor !== 'all') {
      filtered = filtered.filter(receipt => receipt.vendor === selectedVendor);
    }

    if (minAmount || maxAmount) {
      filtered = filtered.filter(receipt => {
        const amount = receipt.total_amount || 0;
        const min = minAmount ? parseFloat(minAmount) : 0;
        const max = maxAmount ? parseFloat(maxAmount) : Infinity;
        return amount >= min && amount <= max;
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount-desc': return (b.total_amount || 0) - (a.total_amount || 0);
        case 'amount-asc': return (a.total_amount || 0) - (b.total_amount || 0);
        case 'vendor-asc': return (a.vendor || '').localeCompare(b.vendor || '');
        case 'vendor-desc': return (b.vendor || '').localeCompare(a.vendor || '');
        default: return 0;
      }
    });

    return filtered;
  }, [receipts, searchTerm, sortBy, selectedVendor, minAmount, maxAmount]);

  const uniqueVendors = useMemo(() => getUniqueVendors(receipts), [receipts]);

  const hasActiveFilters = selectedVendor !== 'all' || minAmount !== '' || maxAmount !== '';

  const handleClearFilters = () => {
    setSelectedVendor('all');
    setMinAmount('');
    setMaxAmount('');
  };

  const ReceiptAdvancedFilters = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Vendor</Label>
        <Select value={selectedVendor} onValueChange={setSelectedVendor}>
          <SelectTrigger className="border-gray-200 focus:border-green-400">
            <SelectValue placeholder="Select vendor..." />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 shadow-lg">
            <SelectItem value="all">All Vendors</SelectItem>
            {uniqueVendors.map((vendor) => (
              <SelectItem key={vendor} value={vendor} className="hover:bg-green-50">
                {vendor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Amount Range</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="border-gray-200 focus:border-green-400"
          />
          <Input
            type="number"
            placeholder="Max"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="border-gray-200 focus:border-green-400"
          />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="nw-loading-spinner h-12 w-12 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading receipts...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Header - matches Food page pattern */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-md">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Receipt Management</h1>
              <p className="text-sm text-gray-600">Track expenses and analyze spending patterns</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-200 rounded-lg p-1 bg-white shadow-sm">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-8 px-3 ${viewMode === 'grid' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-gray-50'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`h-8 px-3 ${viewMode === 'table' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-gray-50'}`}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {!isMobile && "Refresh"}
            </Button>
            <Button
              onClick={() => navigate("/capture")}
              size="sm"
              className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {!isMobile && "Add Receipt"}
            </Button>
          </div>
        </div>

        {/* Stats - 4 cards in a row like Food */}
        <CompactReceiptStatsGrid receipts={receipts} />

        {/* Filter Bar */}
        <ModernFilterBar
          searchPlaceholder="Search receipts..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          sortOptions={sortOptions}
          sortValue={sortBy}
          onSortChange={setSortBy}
          advancedFilters={<ReceiptAdvancedFilters />}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
          totalCount={receipts.length}
          filteredCount={processedReceipts.length}
        />

        {/* Receipts Display - directly, no wrapping Card */}
        {processedReceipts.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Receipt className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {receipts.length === 0 ? "No receipts yet" : "No receipts match your filters"}
              </h3>
              <p className="text-gray-600 text-center mb-6 max-w-md">
                {receipts.length === 0
                  ? "Start tracking your expenses by adding your first receipt with smart AI analysis"
                  : "Try adjusting your filters to find what you're looking for"
                }
              </p>
              {receipts.length === 0 && (
                <Button
                  onClick={() => navigate("/capture")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Receipt
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="space-y-1.5">
                {processedReceipts.map((receipt) => (
                  <ModernReceiptCard
                    key={receipt.id}
                    receipt={receipt}
                    onView={(id) => navigate(`/receipts/${id}`)}
                    onDelete={deleteReceipt}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardContent className="p-0">
                  <ReceiptTable
                    receipts={processedReceipts}
                    onView={(id) => navigate(`/receipts/${id}`)}
                    onDelete={deleteReceipt}
                    onRowClick={handleRowClick}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      <FloatingCaptureButton />
    </SidebarLayout>
  );
};

export default Receipts;
