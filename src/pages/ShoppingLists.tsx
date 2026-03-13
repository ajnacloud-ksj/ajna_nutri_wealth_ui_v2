import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, ShoppingCart, Trash2, Check, Sparkles, ChevronRight,
  Package, DollarSign, Loader2, Send, X, CheckCircle2, Circle
} from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";

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

interface PrepareResult {
  optimized_items: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
    estimated_price: number;
    store_recommendation: string;
    price_note: string;
    alternative: string;
    nutrition_note: string;
  }[];
  estimated_total: number;
  budget_tips: string[];
  nutrition_summary: string;
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

  useEffect(() => {
    fetchLists();
  }, []);

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
        fetchLists();
        fetchListDetail(data.id);
      }
    } catch (e: any) {
      toast.error("Failed to create list");
    } finally {
      setCreating(false);
    }
  };

  const deleteList = async (id: string) => {
    try {
      await backendApi.delete(`/v1/shopping-lists/${id}`);
      toast.success("List deleted");
      if (selectedList?.id === id) setSelectedList(null);
      fetchLists();
    } catch (e: any) {
      toast.error("Failed to delete list");
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
        fetchListDetail(selectedList.id);
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
    try {
      await backendApi.put(
        `/v1/shopping-lists/${selectedList.id}/items/${item.id}`,
        { is_purchased: !item.is_purchased }
      );
      fetchListDetail(selectedList.id);
    } catch (e: any) {
      toast.error("Failed to update item");
    }
  };

  const deleteItem = async (item: ShoppingItem) => {
    if (!selectedList) return;
    try {
      await backendApi.delete(`/v1/shopping-lists/${selectedList.id}/items/${item.id}`);
      fetchListDetail(selectedList.id);
      fetchLists();
    } catch (e: any) {
      toast.error("Failed to delete item");
    }
  };

  const prepareList = async () => {
    if (!selectedList) return;
    setPreparing(true);
    setPrepareResult(null);
    try {
      const { data } = await backendApi.post(`/v1/shopping-lists/${selectedList.id}/prepare`);
      if (data?.preparation) {
        setPrepareResult(data.preparation);
        toast.success("AI optimization complete");
        fetchLists();
      }
    } catch (e: any) {
      toast.error("Failed to optimize list");
    } finally {
      setPreparing(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });

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
  const groupedItems = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <SidebarLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left Panel: Lists */}
        <div className="w-80 border-r bg-background flex flex-col shrink-0">
          <div className="p-4 border-b">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Lists
            </h1>
          </div>

          {/* Create new list */}
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

          {/* List items */}
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
                        <span className="font-medium text-sm truncate">{list.name}</span>
                        {list.status === "completed" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{list.item_count} items</span>
                        <span>{formatCurrency(list.estimated_total)}</span>
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
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedList.name}</h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span>{items.length} items</span>
                    <span>{formatCurrency(selectedList.estimated_total)}</span>
                    {items.length > 0 && (
                      <span>{purchasedCount}/{items.length} purchased</span>
                    )}
                  </div>
                </div>
                <Button
                  onClick={prepareList}
                  disabled={preparing || items.length === 0}
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
                    <Button
                      onClick={addItems}
                      disabled={addingItems || !addItemText.trim()}
                      className="self-end h-10 px-4"
                    >
                      {addingItems ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    AI will parse your text into structured items with prices and categories.
                  </p>
                </CardContent>
              </Card>

              {/* Items by category */}
              {Object.keys(groupedItems).length > 0 && (
                <div className="space-y-4">
                  {Object.entries(groupedItems).map(([category, catItems]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-xs font-medium capitalize ${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}`}>
                          {category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{catItems.length}</span>
                      </div>
                      <div className="space-y-1">
                        {catItems.map((item) => (
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
                              <span className={`text-sm ${item.is_purchased ? "line-through text-muted-foreground" : ""}`}>
                                {item.name}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {item.quantity} {item.unit}
                              </span>
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
                  ))}
                </div>
              )}

              {/* AI Optimization Results */}
              {prepareResult && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      AI Recommendations
                    </h3>

                    {/* Budget tips */}
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

                    {/* Nutrition summary */}
                    {prepareResult.nutrition_summary && (
                      <div className="p-4 rounded-lg bg-blue-50 text-sm text-blue-800">
                        <span className="font-medium">Nutrition: </span>
                        {prepareResult.nutrition_summary}
                      </div>
                    )}

                    {/* Optimized items */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Optimized Items
                          </span>
                          <span className="text-emerald-600 font-bold">
                            {formatCurrency(prepareResult.estimated_total)}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {prepareResult.optimized_items.map((item, i) => (
                            <div key={i} className="p-3 rounded-lg border space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{item.name}</span>
                                <span className="text-sm tabular-nums font-medium">
                                  {formatCurrency(item.estimated_price * item.quantity)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{item.quantity} {item.unit}</span>
                                {item.store_recommendation && (
                                  <>
                                    <span>at</span>
                                    <Badge variant="outline" className="text-[10px] h-4">
                                      {item.store_recommendation}
                                    </Badge>
                                  </>
                                )}
                              </div>
                              {item.price_note && (
                                <p className="text-xs text-muted-foreground">{item.price_note}</p>
                              )}
                              {item.alternative && (
                                <p className="text-xs text-blue-600">Alternative: {item.alternative}</p>
                              )}
                              {item.nutrition_note && (
                                <p className="text-xs text-emerald-600">{item.nutrition_note}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
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
