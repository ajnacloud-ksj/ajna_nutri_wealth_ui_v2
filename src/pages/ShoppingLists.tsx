import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, ShoppingCart, Trash2, Check, Sparkles, ChevronRight,
  DollarSign, Loader2, Send, CheckCircle2, Circle,
  Store, TrendingDown, Heart, Pencil, Calendar, Clock
} from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import WhisperVoiceRecorder from "@/components/capture/WhisperVoiceRecorder";

interface ShoppingItem {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimated_price: number;
  actual_price: number;
  store_recommendation: string;
  is_purchased: boolean;
  priority: string;
  notes: string;
  added_via: string;
  created_at: string;
}

interface ShoppingList {
  id: string;
  name: string;
  status: string;
  item_count: number;
  estimated_total: number;
  notes: string;
  created_at: string;
  updated_at: string;
  items?: ShoppingItem[];
}

// New store-grouped purchase plan types
interface StoreStopItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimated_price: number;
  price_source: string;
  last_purchased: string;
  alternative: string;
  notes: string;
}

interface StoreStop {
  store_name: string;
  store_type: string;
  items: StoreStopItem[];
  store_subtotal: number;
  item_count: number;
  why_this_store: string;
}

interface PrepareResult {
  store_stops: StoreStop[];
  estimated_total: number;
  potential_savings: number;
  budget_tips: string[];
  nutrition_notes: string[];
  summary: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  produce: "bg-green-100 text-green-700",
  dairy: "bg-blue-100 text-blue-700",
  meat: "bg-red-100 text-red-700",
  seafood: "bg-cyan-100 text-cyan-700",
  bakery: "bg-amber-100 text-amber-700",
  frozen: "bg-indigo-100 text-indigo-700",
  canned: "bg-gray-100 text-gray-700",
  snacks: "bg-orange-100 text-orange-700",
  beverages: "bg-purple-100 text-purple-700",
  condiments: "bg-yellow-100 text-yellow-700",
  grains: "bg-stone-100 text-stone-700",
  household: "bg-slate-100 text-slate-700",
  other: "bg-neutral-100 text-neutral-700",
};

const STORE_TYPE_ICONS: Record<string, string> = {
  grocery: "bg-green-50 text-green-600 border-green-200",
  wholesale: "bg-blue-50 text-blue-600 border-blue-200",
  pharmacy: "bg-pink-50 text-pink-600 border-pink-200",
  specialty: "bg-purple-50 text-purple-600 border-purple-200",
  convenience: "bg-orange-50 text-orange-600 border-orange-200",
  online: "bg-cyan-50 text-cyan-600 border-cyan-200",
  other: "bg-gray-50 text-gray-600 border-gray-200",
};

/** IbexDB may return booleans as strings */
function toBool(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.toLowerCase() === "true";
  return Boolean(val);
}

const ShoppingLists = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [addItemText, setAddItemText] = useState("");
  const [addingItems, setAddingItems] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepareResult, setPrepareResult] = useState<PrepareResult | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  useEffect(() => {
    fetchLists();
  }, []);

  /** Normalize is_purchased from IbexDB (may be string "false") */
  const normalizeItems = (items: ShoppingItem[]): ShoppingItem[] =>
    items.map((i) => ({ ...i, is_purchased: toBool(i.is_purchased) }));

  const fetchLists = async () => {
    try {
      const { data } = await backendApi.get("/v1/shopping-lists");
      setLists(data?.lists || []);
    } catch (e: any) {
      toast.error("Failed to load shopping lists");
    } finally {
      setLoading(false);
    }
  };

  const fetchListDetail = async (listId: string) => {
    try {
      const { data } = await backendApi.get(`/v1/shopping-lists/${listId}`);
      if (data) {
        data.items = normalizeItems(data.items || []);
        setSelectedList(data);
        setPrepareResult(null);
      }
    } catch (e: any) {
      toast.error("Failed to load list details");
    }
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      const { data } = await backendApi.post("/v1/shopping-lists", { name: newListName.trim() });
      if (data) {
        toast.success("List created");
        setNewListName("");
        const newList = { ...data, items: [] };
        setLists((prev) => [newList, ...prev]);
        setSelectedList(newList);
        setPrepareResult(null);
      }
    } catch (e: any) {
      toast.error("Failed to create list");
    } finally {
      setCreating(false);
    }
  };

  const deleteList = async (id: string) => {
    // Optimistic removal from UI immediately
    const previousLists = lists;
    setLists((prev) => prev.filter((l) => l.id !== id));
    if (selectedList?.id === id) {
      setSelectedList(null);
      setPrepareResult(null);
    }
    try {
      await backendApi.delete(`/v1/shopping-lists/${id}`);
      toast.success("List deleted");
      // Force refresh to ensure consistency with backend
      await fetchLists();
    } catch (e: any) {
      // Revert on failure
      setLists(previousLists);
      toast.error("Failed to delete list");
    }
  };

  const renameList = async () => {
    if (!selectedList || !editNameValue.trim()) return;
    const newName = editNameValue.trim();
    if (newName === selectedList.name) {
      setEditingName(false);
      return;
    }
    // Optimistic update
    setSelectedList((prev) => prev ? { ...prev, name: newName } : prev);
    setLists((prev) => prev.map((l) => l.id === selectedList.id ? { ...l, name: newName } : l));
    setEditingName(false);
    try {
      await backendApi.put(`/v1/shopping-lists/${selectedList.id}`, { name: newName });
    } catch (e: any) {
      // Revert
      setSelectedList((prev) => prev ? { ...prev, name: selectedList.name } : prev);
      setLists((prev) => prev.map((l) => l.id === selectedList.id ? { ...l, name: selectedList.name } : l));
      toast.error("Failed to rename list");
    }
  };

  const addItems = async () => {
    if (!addItemText.trim() || !selectedList) return;
    setAddingItems(true);
    try {
      const { data } = await backendApi.post(
        `/v1/shopping-lists/${selectedList.id}/items`,
        { text: addItemText.trim() }
      );
      if (data) {
        toast.success(`Added ${data.items?.length || 0} items`);
        setAddItemText("");
        const newItems = normalizeItems(data.items || []);
        setSelectedList((prev) => prev ? {
          ...prev,
          items: [...(prev.items || []), ...newItems],
          item_count: (prev.item_count || 0) + newItems.length,
          estimated_total: (prev.estimated_total || 0) + newItems.reduce((s: number, i: any) => s + (i.estimated_price || 0) * (i.quantity || 1), 0)
        } : prev);
        fetchLists();
      }
    } catch (e: any) {
      toast.error("Failed to add items");
    } finally {
      setAddingItems(false);
    }
  };

  const togglePurchased = async (item: ShoppingItem) => {
    if (!selectedList) return;
    const newPurchased = !item.is_purchased;
    // Optimistic update
    setSelectedList((prev) => prev ? {
      ...prev,
      items: (prev.items || []).map((i) => i.id === item.id ? { ...i, is_purchased: newPurchased } : i)
    } : prev);
    try {
      await backendApi.put(
        `/v1/shopping-lists/${selectedList.id}/items/${item.id}`,
        { is_purchased: newPurchased }
      );
    } catch (e: any) {
      // Revert on failure
      setSelectedList((prev) => prev ? {
        ...prev,
        items: (prev.items || []).map((i) => i.id === item.id ? { ...i, is_purchased: !newPurchased } : i)
      } : prev);
      toast.error("Failed to update item");
    }
  };

  const deleteItem = async (item: ShoppingItem) => {
    if (!selectedList) return;
    setSelectedList((prev) => prev ? {
      ...prev,
      items: (prev.items || []).filter((i) => i.id !== item.id),
      item_count: Math.max(0, (prev.item_count || 0) - 1),
      estimated_total: Math.max(0, (prev.estimated_total || 0) - (item.estimated_price || 0) * (item.quantity || 1))
    } : prev);
    try {
      await backendApi.delete(`/v1/shopping-lists/${selectedList.id}/items/${item.id}`);
      fetchLists();
    } catch (e: any) {
      fetchListDetail(selectedList.id);
      toast.error("Failed to delete item");
    }
  };

  const optimizeAll = async () => {
    setPreparing(true);
    setPrepareResult(null);
    try {
      const { data } = await backendApi.post("/v1/shopping-lists/optimize");
      if (data?.list_id) {
        toast.success(
          `Created "${data.list_name}" with ${data.optimized_items} items from ${data.source_lists} lists`
        );
        // Refresh lists (with retry to ensure new list appears)
        await fetchLists();
        await fetchListDetail(data.list_id);
        if (data.preparation) {
          setPrepareResult(data.preparation);
        }
        // Re-fetch lists after detail load to ensure sidebar is up to date
        fetchLists();
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to optimize");
    } finally {
      setPreparing(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SidebarLayout>
    );
  }

  const items = selectedList?.items || [];
  const purchasedCount = items.filter((i) => i.is_purchased).length;
  const estimatedTotal = items.reduce((sum, i) => sum + (i.estimated_price || 0) * (i.quantity || 1), 0);

  // Detect if this is a store-optimized list (items have store_recommendation)
  const hasStoreInfo = items.some((i) => i.store_recommendation && i.store_recommendation.trim() !== "");

  // Group by store if optimized, otherwise by category
  const groupedItems = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const key = hasStoreInfo
      ? (item.store_recommendation?.trim() || "Other")
      : (item.category || "other");
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <SidebarLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left Panel: Lists */}
        <div className="w-80 border-r bg-background flex flex-col shrink-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Shopping Lists
              </h1>
              <Button
                variant="outline"
                size="sm"
                onClick={optimizeAll}
                disabled={preparing || lists.length === 0}
                className="gap-1 text-xs h-7"
                title="AI Optimize across all lists"
              >
                {preparing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Optimize
              </Button>
            </div>
          </div>

          <div className="p-3 border-b">
            <div className="flex gap-2">
              <Input
                placeholder="New list name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createList()}
                className="h-9 text-sm"
              />
              <Button size="sm" onClick={createList} disabled={creating || !newListName.trim()} className="h-9 px-3">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {lists.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No shopping lists yet.</p>
                <p className="text-xs mt-1">Create one to get started.</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => fetchListDetail(list.id)}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedList?.id === list.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {list.name?.startsWith("Optimized Plan") && (
                          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                        <span className="font-medium text-sm truncate">{list.name}</span>
                        {list.status === "completed" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{list.item_count} items</span>
                        <span>{formatCurrency(list.estimated_total)}</span>
                        {list.updated_at && (
                          <span className="text-[10px]">{formatDate(list.updated_at)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteList(list.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: List Detail */}
        <div className="flex-1 overflow-y-auto bg-muted/30">
          {!selectedList ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a list</p>
                <p className="text-sm">or create a new one to get started</p>
                {lists.length > 0 && (
                  <Button
                    onClick={optimizeAll}
                    disabled={preparing}
                    className="mt-4 gap-2"
                  >
                    {preparing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {preparing ? "Optimizing..." : "AI Optimize All Lists"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameList();
                          if (e.key === "Escape") setEditingName(false);
                        }}
                        onBlur={renameList}
                        autoFocus
                        className="h-8 text-lg font-semibold w-64"
                      />
                    </div>
                  ) : (
                    <h2
                      className="text-xl font-semibold flex items-center gap-2 cursor-pointer group/name"
                      onClick={() => { setEditNameValue(selectedList.name); setEditingName(true); }}
                    >
                      {selectedList.name}
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity" />
                    </h2>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span>{items.length} items</span>
                    <span className="font-medium text-foreground">{formatCurrency(estimatedTotal)}</span>
                    {items.length > 0 && (
                      <span>{purchasedCount}/{items.length} purchased</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {selectedList.created_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(selectedList.created_at)}
                      </span>
                    )}
                    {selectedList.updated_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Updated {formatDate(selectedList.updated_at)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  onClick={optimizeAll}
                  disabled={preparing}
                  className="gap-2"
                >
                  {preparing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {preparing ? "Optimizing..." : "AI Optimize"}
                </Button>
              </div>

              {/* Progress */}
              {items.length > 0 && (
                <Progress
                  value={(purchasedCount / items.length) * 100}
                  className="h-2"
                />
              )}

              {/* Add items input */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add items naturally... e.g. '2 gallons of milk, dozen eggs, 3 avocados, chicken breast 2 lbs'"
                      value={addItemText}
                      onChange={(e) => setAddItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addItems();
                        }
                      }}
                      className="min-h-[60px] text-sm resize-none"
                    />
                    <div className="flex flex-col gap-2 self-end">
                      <Button
                        onClick={addItems}
                        disabled={addingItems || !addItemText.trim()}
                        className="h-10 px-4"
                      >
                        {addingItems ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      Type or speak your items — AI parses them automatically.
                    </p>
                    <WhisperVoiceRecorder
                      onTranscription={(text) => setAddItemText((prev) => prev ? `${prev}, ${text}` : text)}
                      disabled={addingItems}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Items grouped by store (optimized) or category (regular) */}
              {Object.keys(groupedItems).length > 0 && (
                <div className="space-y-4">
                  {Object.entries(groupedItems).map(([groupKey, groupItems]) => {
                    const groupTotal = groupItems.reduce((s, i) => s + (i.estimated_price || 0) * (i.quantity || 1), 0);
                    return (
                      <div key={groupKey}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {hasStoreInfo ? (
                              <Badge className="text-xs font-medium bg-amber-50 text-amber-700 border-amber-200 gap-1">
                                <Store className="h-3 w-3" />
                                {groupKey}
                              </Badge>
                            ) : (
                              <Badge className={`text-xs font-medium capitalize ${CATEGORY_COLORS[groupKey] || CATEGORY_COLORS.other}`}>
                                {groupKey}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{groupItems.length}</span>
                          </div>
                          {hasStoreInfo && (
                            <span className="text-xs font-medium text-muted-foreground">
                              {formatCurrency(groupTotal)}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {groupItems.map((item) => (
                            <div
                              key={item.id}
                              className={`group flex items-center gap-3 p-2.5 rounded-lg bg-background border transition-colors ${
                                item.is_purchased ? "opacity-60" : ""
                              }`}
                            >
                              <button
                                onClick={() => togglePurchased(item)}
                                className="shrink-0"
                              >
                                {item.is_purchased ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground/40 hover:text-muted-foreground" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${item.is_purchased ? "line-through text-muted-foreground" : ""}`}>
                                    {item.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {item.quantity} {item.unit}
                                  </span>
                                  {!hasStoreInfo && item.store_recommendation && (
                                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                      {item.store_recommendation}
                                    </span>
                                  )}
                                </div>
                                {item.notes && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                              <span className="text-sm tabular-nums text-muted-foreground">
                                {formatCurrency(item.estimated_price * item.quantity)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
                                onClick={() => deleteItem(item)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* AI Optimization Results — Store-Grouped Purchase Plan */}
              {prepareResult && (
                <>
                  <Separator />
                  <div className="space-y-5">
                    {/* Plan Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Purchase Plan
                      </h3>
                      <div className="flex items-center gap-4">
                        {prepareResult.potential_savings > 0 && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Save {formatCurrency(prepareResult.potential_savings)}
                          </Badge>
                        )}
                        <span className="text-lg font-bold text-foreground">
                          {formatCurrency(prepareResult.estimated_total)}
                        </span>
                      </div>
                    </div>

                    {/* Summary */}
                    {prepareResult.summary && (
                      <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-900">
                        {prepareResult.summary}
                      </div>
                    )}

                    {/* Store Stops */}
                    <div className="space-y-4">
                      {prepareResult.store_stops.map((stop, idx) => {
                        const storeStyle = STORE_TYPE_ICONS[stop.store_type] || STORE_TYPE_ICONS.other;
                        return (
                          <Card key={idx} className={`border-l-4 ${storeStyle.split(" ")[2] || "border-gray-200"}`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${storeStyle}`}>
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                      <Store className="h-4 w-4" />
                                      {stop.store_name}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {stop.why_this_store}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold tabular-nums">
                                    {formatCurrency(stop.store_subtotal)}
                                  </span>
                                  <p className="text-xs text-muted-foreground">
                                    {stop.item_count} {stop.item_count === 1 ? "item" : "items"}
                                  </p>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-2">
                                {stop.items.map((sItem, sIdx) => (
                                  <div key={sIdx} className="flex items-start gap-3 py-2 border-t first:border-t-0 first:pt-0">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{sItem.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {sItem.quantity} {sItem.unit}
                                        </span>
                                      </div>
                                      {sItem.notes && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{sItem.notes}</p>
                                      )}
                                      {sItem.alternative && (
                                        <p className="text-xs text-blue-600 mt-0.5">
                                          Alternative: {sItem.alternative}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-sm font-medium tabular-nums">
                                        {formatCurrency(sItem.estimated_price * sItem.quantity)}
                                      </span>
                                      <p className="text-[10px] text-muted-foreground">
                                        {sItem.price_source === "receipt_history"
                                          ? `from receipts${sItem.last_purchased !== "never" ? ` (${sItem.last_purchased})` : ""}`
                                          : sItem.price_source === "similar_item"
                                          ? "similar item"
                                          : "estimated"}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Budget Tips */}
                    {prepareResult.budget_tips.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                            Budget Tips
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {prepareResult.budget_tips.map((tip, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Nutrition Notes */}
                    {prepareResult.nutrition_notes && prepareResult.nutrition_notes.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Heart className="h-4 w-4 text-pink-500" />
                            Nutrition Notes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {prepareResult.nutrition_notes.map((note, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <Check className="h-3.5 w-3.5 text-pink-500 mt-0.5 shrink-0" />
                                {note}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
};

export default ShoppingLists;
