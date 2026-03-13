import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Utensils,
  Dumbbell,
  Receipt,
  CreditCard,
  BarChart3,
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertTriangle,
  MessageSquarePlus,
  StickyNote,
  User,
  Calendar,
  Flame,
  DollarSign,
  Clock,
} from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import SidebarLayout from "@/components/layout/SidebarLayout";

interface PermissionInfo {
  category: string;
  is_granted: boolean;
}

// Note: This FoodEntry interface is specific to CaretakerParticipantView and differs from @/types/food
// It uses different field names (food_name vs description, protein vs total_protein, etc.)
interface FoodEntry {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: string;
  created_at: string;
  image_url?: string;
}

interface Workout {
  id: string;
  exercise_type: string;
  duration_minutes: number;
  calories_burned: number;
  intensity: string;
  created_at: string;
}

// NOTE: Local ReceiptEntry definition kept due to different field structure (store_name, items_count)
// This is specific to the caretaker view API response format
interface ReceiptEntry {
  id: string;
  store_name: string;
  total_amount: number;
  date: string;
  category: string;
  items_count: number;
  created_at: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  merchant: string;
}

interface DashboardStats {
  total_food_entries: number;
  avg_daily_calories: number;
  total_workouts: number;
  total_spending: number;
  recent_activity: string;
}

interface ParticipantInfo {
  id: string;
  full_name: string;
  email: string;
}

const CaretakerParticipantView = () => {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
  const [permissions, setPermissions] = useState<PermissionInfo[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptEntry[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Notes/Comments dialog
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentEntryId, setCommentEntryId] = useState<string | null>(null);
  const [commentSaving, setCommentSaving] = useState(false);

  const basePath = `/v1/caretaker/participants/${participantId}`;

  // Fetch permissions and participant info
  const fetchPermissions = useCallback(async () => {
    if (!participantId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await backendApi.get(`${basePath}/permissions`);
      if (apiError) throw apiError;

      const perms: PermissionInfo[] = data?.permissions || data || [];
      setPermissions(perms);
      setParticipantInfo(data?.participant || { id: participantId, full_name: "", email: "" });

      // Set first granted tab as active
      const firstGranted = perms.find((p) => p.is_granted);
      if (firstGranted) {
        setActiveTab(firstGranted.category);
      }
    } catch (err: any) {
      setError("Failed to load participant data");
      console.error("Error fetching permissions:", err);
    } finally {
      setLoading(false);
    }
  }, [participantId, basePath]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Data fetchers
  const fetchFoodEntries = useCallback(async () => {
    setFoodLoading(true);
    try {
      const { data, error } = await backendApi.get(`${basePath}/food_entries`);
      if (error) throw error;
      setFoodEntries(data || []);
    } catch (err) {
      toast.error("Failed to load food entries");
    } finally {
      setFoodLoading(false);
    }
  }, [basePath]);

  const fetchWorkouts = useCallback(async () => {
    setWorkoutsLoading(true);
    try {
      const { data, error } = await backendApi.get(`${basePath}/workouts`);
      if (error) throw error;
      setWorkouts(data || []);
    } catch (err) {
      toast.error("Failed to load workouts");
    } finally {
      setWorkoutsLoading(false);
    }
  }, [basePath]);

  const fetchReceipts = useCallback(async () => {
    setReceiptsLoading(true);
    try {
      const { data, error } = await backendApi.get(`${basePath}/receipts`);
      if (error) throw error;
      setReceipts(data || []);
    } catch (err) {
      toast.error("Failed to load receipts");
    } finally {
      setReceiptsLoading(false);
    }
  }, [basePath]);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const { data, error } = await backendApi.get(`${basePath}/bank_transactions`);
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      toast.error("Failed to load transactions");
    } finally {
      setTransactionsLoading(false);
    }
  }, [basePath]);

  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const { data, error } = await backendApi.get(`${basePath}/analytics/dashboard`);
      if (error) throw error;
      setDashboardStats(data || null);
    } catch (err) {
      toast.error("Failed to load dashboard");
    } finally {
      setDashboardLoading(false);
    }
  }, [basePath]);

  // Fetch data when tab changes
  useEffect(() => {
    if (!activeTab) return;
    switch (activeTab) {
      case "food_entries":
        fetchFoodEntries();
        break;
      case "workouts":
        fetchWorkouts();
        break;
      case "receipts":
        fetchReceipts();
        break;
      case "bank_transactions":
        fetchTransactions();
        break;
      case "analytics":
        fetchDashboard();
        break;
    }
  }, [activeTab, fetchFoodEntries, fetchWorkouts, fetchReceipts, fetchTransactions, fetchDashboard]);

  // Save note
  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    try {
      const { error } = await backendApi.post(`${basePath}/notes`, { text: noteText });
      if (error) throw error;
      toast.success("Note added successfully");
      setNoteDialogOpen(false);
      setNoteText("");
    } catch (err) {
      toast.error("Failed to add note");
    } finally {
      setNoteSaving(false);
    }
  };

  // Save comment
  const handleSaveComment = async () => {
    if (!commentText.trim() || !commentEntryId) return;
    setCommentSaving(true);
    try {
      const { error } = await backendApi.post(`${basePath}/comments`, {
        entry_id: commentEntryId,
        text: commentText,
        category: activeTab,
      });
      if (error) throw error;
      toast.success("Comment added");
      setCommentDialogOpen(false);
      setCommentText("");
      setCommentEntryId(null);
    } catch (err) {
      toast.error("Failed to add comment");
    } finally {
      setCommentSaving(false);
    }
  };

  const openCommentDialog = (entryId: string) => {
    setCommentEntryId(entryId);
    setCommentText("");
    setCommentDialogOpen(true);
  };

  const hasPermission = (category: string) =>
    permissions.some((p) => p.category === category && p.is_granted);

  const grantedTabs = [
    { key: "food_entries", label: "Food", icon: Utensils },
    { key: "workouts", label: "Workouts", icon: Dumbbell },
    { key: "receipts", label: "Receipts", icon: Receipt },
    { key: "bank_transactions", label: "Finance", icon: CreditCard },
    { key: "analytics", label: "Dashboard", icon: BarChart3 },
  ].filter((tab) => hasPermission(tab.key));

  const renderDataLoading = () => (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
    </div>
  );

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-green-600 mx-auto" />
            <p className="text-gray-600 font-medium">Loading participant data...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (error) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <p className="text-gray-600 font-medium">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/caretaker")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button variant="outline" onClick={fetchPermissions}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Back button & Banner */}
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/caretaker")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>

          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                {(participantInfo?.full_name || participantInfo?.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold">
                  Viewing {participantInfo?.full_name || "Participant"}'s Data
                </h1>
                <p className="text-green-100 text-sm">{participantInfo?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={() => setNoteDialogOpen(true)}
              >
                <StickyNote className="h-4 w-4 mr-1" /> Add Note
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {grantedTabs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-3">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
              <p className="text-gray-600 font-medium">No data access permissions</p>
              <p className="text-gray-500 text-sm">
                The participant has not granted access to any data categories.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full`} style={{ gridTemplateColumns: `repeat(${grantedTabs.length}, 1fr)` }}>
              {grantedTabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="text-xs sm:text-sm">
                  <tab.icon className="h-4 w-4 mr-1 hidden sm:inline" /> {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Food Entries Tab */}
            <TabsContent value="food_entries">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Food Entries</CardTitle>
                    <CardDescription>Nutrition and meal tracking data</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchFoodEntries}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {foodLoading ? (
                    renderDataLoading()
                  ) : foodEntries.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No food entries found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Food</TableHead>
                          <TableHead>Meal</TableHead>
                          <TableHead className="text-right">Calories</TableHead>
                          <TableHead className="text-right">Protein</TableHead>
                          <TableHead className="text-right">Carbs</TableHead>
                          <TableHead className="text-right">Fat</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {foodEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.food_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {entry.meal_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {entry.calories}
                            </TableCell>
                            <TableCell className="text-right text-gray-500">
                              {entry.protein}g
                            </TableCell>
                            <TableCell className="text-right text-gray-500">
                              {entry.carbs}g
                            </TableCell>
                            <TableCell className="text-right text-gray-500">
                              {entry.fat}g
                            </TableCell>
                            <TableCell className="text-gray-500 text-sm">
                              {entry.created_at
                                ? format(new Date(entry.created_at), "MMM d")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCommentDialog(entry.id)}
                              >
                                <MessageSquarePlus className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Workouts Tab */}
            <TabsContent value="workouts">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Workouts</CardTitle>
                    <CardDescription>Exercise and fitness tracking</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchWorkouts}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {workoutsLoading ? (
                    renderDataLoading()
                  ) : workouts.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No workouts found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Exercise</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Intensity</TableHead>
                          <TableHead className="text-right">Calories Burned</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workouts.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell className="font-medium capitalize">{w.exercise_type}</TableCell>
                            <TableCell>{w.duration_minutes} min</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`capitalize ${
                                  w.intensity === "high"
                                    ? "border-red-200 text-red-700"
                                    : w.intensity === "medium"
                                    ? "border-amber-200 text-amber-700"
                                    : "border-green-200 text-green-700"
                                }`}
                              >
                                {w.intensity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {w.calories_burned}
                            </TableCell>
                            <TableCell className="text-gray-500 text-sm">
                              {w.created_at ? format(new Date(w.created_at), "MMM d") : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCommentDialog(w.id)}
                              >
                                <MessageSquarePlus className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Receipts Tab */}
            <TabsContent value="receipts">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Receipts</CardTitle>
                    <CardDescription>Scanned receipt data</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchReceipts}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {receiptsLoading ? (
                    renderDataLoading()
                  ) : receipts.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No receipts found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Store</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receipts.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.store_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {r.category}
                              </Badge>
                            </TableCell>
                            <TableCell>{r.items_count}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${r.total_amount?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-gray-500 text-sm">
                              {r.date ? format(new Date(r.date), "MMM d") : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCommentDialog(r.id)}
                              >
                                <MessageSquarePlus className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Finance Tab */}
            <TabsContent value="bank_transactions">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Bank Transactions</CardTitle>
                    <CardDescription>Financial transaction data</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchTransactions}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    renderDataLoading()
                  ) : transactions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No transactions found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Merchant</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.description}</TableCell>
                            <TableCell className="text-gray-500">{t.merchant}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {t.category}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                t.amount < 0 ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              ${Math.abs(t.amount).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-gray-500 text-sm">
                              {t.date ? format(new Date(t.date), "MMM d") : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Dashboard/Analytics Tab */}
            <TabsContent value="analytics">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Health & Finance Summary</h2>
                  <Button variant="outline" size="sm" onClick={fetchDashboard}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {dashboardLoading ? (
                  renderDataLoading()
                ) : !dashboardStats ? (
                  <p className="text-center text-gray-500 py-8">No analytics data available</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-green-100">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Utensils className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Food Entries</p>
                            <p className="text-2xl font-bold text-green-700">
                              {dashboardStats.total_food_entries}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-100">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Flame className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Avg Daily Calories</p>
                            <p className="text-2xl font-bold text-blue-700">
                              {dashboardStats.avg_daily_calories}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-purple-100">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Dumbbell className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Workouts</p>
                            <p className="text-2xl font-bold text-purple-700">
                              {dashboardStats.total_workouts}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-100">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Spending</p>
                            <p className="text-2xl font-bold text-amber-700">
                              ${dashboardStats.total_spending?.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Add Note Dialog */}
        <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>
                Add a private note about {participantInfo?.full_name || "this participant"}.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Write your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSaveNote}
                disabled={noteSaving || !noteText.trim()}
              >
                {noteSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  "Save Note"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Comment Dialog */}
        <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Comment</DialogTitle>
              <DialogDescription>
                Add a comment on this entry.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Write your comment here..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCommentDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSaveComment}
                disabled={commentSaving || !commentText.trim()}
              >
                {commentSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  "Save Comment"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  );
};

export default CaretakerParticipantView;
