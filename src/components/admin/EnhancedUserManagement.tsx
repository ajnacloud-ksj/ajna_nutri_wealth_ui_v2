import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Shield, ShieldOff, Search,
  ChevronLeft, ChevronRight, Power, UserCog, Crown, Archive
} from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'participant' | 'caretaker';
  subscription_tier: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
}

const EnhancedUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<string>("");
  const [newSubscription, setNewSubscription] = useState<string>("free");
  const [updating, setUpdating] = useState(false);

  const usersPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch users and activity data in parallel
      const [usersResponse, activityResponse] = await Promise.allSettled([
        backendApi.get('/v1/admin/users?include_deleted=true&limit=100'),
        backendApi.from('app_api_costs').select('user_id, created_at')
      ]);

      // Build last-activity map from api_costs (most recent created_at per user)
      const lastActivityMap = new Map<string, string>();
      if (activityResponse.status === 'fulfilled' && activityResponse.value.data) {
        for (const entry of activityResponse.value.data) {
          const existing = lastActivityMap.get(entry.user_id);
          if (!existing || entry.created_at > existing) {
            lastActivityMap.set(entry.user_id, entry.created_at);
          }
        }
      }

      let userList: User[] = [];

      if (usersResponse.status === 'fulfilled' && !usersResponse.value.error) {
        const data = usersResponse.value.data;
        userList = (data?.users || []).map((u: any) => ({
          id: u.id,
          email: u.email || '',
          name: u.name || '',
          role: u.role || 'participant',
          subscription_tier: u.subscription_tier || 'free',
          is_archived: u.is_archived || false,
          created_at: u.created_at || '',
          updated_at: u.updated_at || '',
          last_active_at: lastActivityMap.get(u.id) || null,
        }));
      } else {
        // Fallback to generic data API
        const { data } = await backendApi
          .from('app_users_v4')
          .select('*')
          .order('created_at', { ascending: false });

        userList = (data || []).map((u: any) => ({
          id: u.id,
          email: u.email || '',
          name: u.name || '',
          role: u.role || 'participant',
          subscription_tier: u.subscription_tier || 'free',
          is_archived: u._deleted || false,
          created_at: u.created_at || '',
          updated_at: u.updated_at || '',
          last_active_at: lastActivityMap.get(u.id) || null,
        }));
      }

      // Deduplicate by email - keep the most recent
      const seen = new Map<string, User>();
      for (const user of userList) {
        const key = user.email || user.id;
        if (!seen.has(key)) {
          seen.set(key, user);
        }
      }

      setUsers(Array.from(seen.values()));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(term) ||
        user.name?.toLowerCase().includes(term)
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter === "active") {
      filtered = filtered.filter(user => !user.is_archived);
    } else if (statusFilter === "archived") {
      filtered = filtered.filter(user => user.is_archived);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const updateUser = async (userId: string, role: string, subscription: string) => {
    setUpdating(true);
    try {
      // Update role and subscription via generic data PUT endpoint
      // PUT /v1/app_users_v4/{id} — the backend's generic update handler
      const { error } = await backendApi.put(`/v1/app_users_v4/${userId}`, {
        role,
        subscription_tier: subscription
      });
      if (error) throw error;

      toast.success(`User updated: role=${role}, tier=${subscription}`);
      await fetchUsers();
      setShowRoleDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const activeUsers = users.filter(u => !u.is_archived);
  const archivedUsers = users.filter(u => u.is_archived);

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'admin': return 'bg-red-500';
      case 'caretaker': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getDisplayName = (user: User) => {
    if (user.name) return user.name;
    return user.email?.split('@')[0] || 'Unknown User';
  };

  const formatLastActive = (dateString: string) => {
    if (!dateString) return 'Never';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="participant">Participants</SelectItem>
                <SelectItem value="caretaker">Caretakers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin').length}
                </div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {activeUsers.length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-500">
                  {archivedUsers.length}
                </div>
                <div className="text-sm text-muted-foreground">Archived</div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map((user) => (
                  <TableRow key={user.id} className={user.is_archived ? 'opacity-60' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{getDisplayName(user)}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.is_archived ? (
                          <Badge variant="outline" className="text-orange-500 border-orange-300">
                            <Archive className="h-3 w-3 mr-1" />
                            Archived
                          </Badge>
                        ) : user.subscription_tier === 'pro' ? (
                          <Badge variant="outline" className="text-green-600">
                            <Crown className="h-3 w-3 mr-1" />
                            Pro
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Free
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      <span title={user.last_active_at || user.updated_at || ''}>
                        {formatLastActive(user.last_active_at || user.updated_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!user.is_archived && (
                          <Button
                            size="sm"
                            variant="outline"
                            title="Manage user"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role);
                              setNewSubscription(user.subscription_tier || 'free');
                              setShowRoleDialog(true);
                            }}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User</DialogTitle>
            <DialogDescription>
              Update role and subscription for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (unlimited access)</SelectItem>
                  <SelectItem value="participant">Participant</SelectItem>
                  <SelectItem value="caretaker">Caretaker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subscription Tier</label>
              <Select value={newSubscription} onValueChange={setNewSubscription}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (daily limit applies)</SelectItem>
                  <SelectItem value="pro">Pro (unlimited analyses)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUser && updateUser(selectedUser.id, newRole, newSubscription)}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedUserManagement;
