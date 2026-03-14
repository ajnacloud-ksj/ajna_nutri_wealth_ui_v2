
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DollarSign, Users, Activity, Calendar, Filter } from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { formatDistanceToNow } from "date-fns";

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

interface CostEntry {
  id: string;
  user_id: string;
  function_name: string;
  model_used: string;
  total_tokens: number;
  cost_usd: number;
  category: string;
  created_at: string;
}

interface CostSummary {
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  avgCostPerCall: number;
}

const CostAnalytics = () => {
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [userMap, setUserMap] = useState<Map<string, UserInfo>>(new Map());
  const [filteredCosts, setFilteredCosts] = useState<CostEntry[]>([]);
  const [summary, setSummary] = useState<CostSummary>({
    totalCost: 0,
    totalTokens: 0,
    totalCalls: 0,
    avgCostPerCall: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [searchEmail, setSearchEmail] = useState<string>("");

  // Unique values for filters
  const [uniqueUsers, setUniqueUsers] = useState<UserInfo[]>([]);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [uniqueModels, setUniqueModels] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [costs, userMap, selectedUser, selectedCategory, selectedModel, dateRange, searchEmail]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch costs and users in parallel
      const [costsResult, usersResult] = await Promise.all([
        backendApi
          .from('app_api_costs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000),
        backendApi
          .from('app_users_v4')
          .select('id,email,name')
          .limit(500),
      ]);

      // Build user lookup map
      const uMap = new Map<string, UserInfo>();
      if (usersResult.data) {
        for (const u of usersResult.data) {
          uMap.set(u.id, {
            id: u.id,
            email: u.email || '',
            name: u.name || u.email?.split('@')[0] || '',
          });
        }
      }
      setUserMap(uMap);

      if (costsResult.data) {
        const validCosts: CostEntry[] = costsResult.data.map((cost: any) => ({
          id: cost.id,
          user_id: cost.user_id,
          function_name: cost.function_name,
          model_used: cost.model_used,
          total_tokens: cost.total_tokens || 0,
          cost_usd: cost.cost_usd || 0,
          category: cost.category || 'unknown',
          created_at: cost.created_at,
        }));

        setCosts(validCosts);

        // Extract unique filter values using user map for display
        const userIds = [...new Set(validCosts.map(c => c.user_id))];
        const users: UserInfo[] = userIds
          .map(id => uMap.get(id) || { id, email: id.slice(0, 8), name: id.slice(0, 8) })
          .sort((a, b) => a.name.localeCompare(b.name));

        setUniqueUsers(users);
        setUniqueCategories([...new Set(validCosts.map(c => c.category))]);
        setUniqueModels([...new Set(validCosts.map(c => c.model_used))]);
      }
    } catch (error) {
      console.error('Error fetching cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...costs];

    if (selectedUser !== "all") {
      filtered = filtered.filter(cost => cost.user_id === selectedUser);
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(cost => cost.category === selectedCategory);
    }

    if (selectedModel !== "all") {
      filtered = filtered.filter(cost => cost.model_used === selectedModel);
    }

    if (dateRange !== "all") {
      const now = new Date();
      let cutoffDate = new Date();

      switch (dateRange) {
        case "today":
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(cost =>
        new Date(cost.created_at) >= cutoffDate
      );
    }

    if (searchEmail) {
      const term = searchEmail.toLowerCase();
      filtered = filtered.filter(cost => {
        const user = userMap.get(cost.user_id);
        if (!user) return false;
        return user.email.toLowerCase().includes(term) ||
               user.name.toLowerCase().includes(term);
      });
    }

    setFilteredCosts(filtered);

    const totalCost = filtered.reduce((sum, cost) => sum + Number(cost.cost_usd), 0);
    const totalTokens = filtered.reduce((sum, cost) => sum + cost.total_tokens, 0);
    const totalCalls = filtered.length;
    const avgCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;

    setSummary({ totalCost, totalTokens, totalCalls, avgCostPerCall });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDisplayName = (userId: string) => {
    const user = userMap.get(userId);
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return userId.slice(0, 8);
  };

  const getDisplayEmail = (userId: string) => {
    const user = userMap.get(userId);
    return user?.email || userId;
  };

  const clearFilters = () => {
    setSelectedUser("all");
    setSelectedCategory("all");
    setSelectedModel("all");
    setDateRange("all");
    setSearchEmail("");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading cost analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost (Filtered)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCalls.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTokens.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Call</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.avgCostPerCall)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1 block">User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Model</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="All Models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {uniqueModels.map(model => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Search by Email/Name</label>
              <Input
                placeholder="Search users..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cost Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage Details</CardTitle>
          <CardDescription>
            Detailed breakdown of API costs and usage ({filteredCosts.length} entries)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCosts.slice(0, 100).map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{getDisplayName(cost.user_id)}</div>
                      <div className="text-sm text-gray-500">{getDisplayEmail(cost.user_id)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {cost.function_name}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{cost.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{cost.model_used}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{cost.total_tokens.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm font-medium">
                      {formatCurrency(Number(cost.cost_usd))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(cost.created_at)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(cost.created_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredCosts.length > 100 && (
            <div className="text-center py-4 text-sm text-gray-500">
              Showing first 100 of {filteredCosts.length} entries
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CostAnalytics;
