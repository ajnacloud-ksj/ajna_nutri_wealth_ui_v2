import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, UserCheck, UserX, Shield, ShieldOff, Search,
  ChevronLeft, ChevronRight, Edit2, Power, UserCog
} from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";
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
  full_name: string;
  role: 'admin' | 'participant' | 'caretaker';
  user_type: string;
  is_subscribed: boolean;
  is_active?: boolean;
  created_at: string;
  last_usage_date?: string;
}

const EnhancedUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const usersPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await backendApi
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const updateUserRole = async (userId: string, role: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/v1/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ role })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }

      toast.success(`User role updated to ${role}`);
      await fetchUsers();
      setShowRoleDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user role');
    } finally {
      setUpdating(false);
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/v1/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ is_active: isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success(`User ${isActive ? 'enabled' : 'disabled'}`);
      await fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'admin': return 'bg-red-500';
      case 'caretaker': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
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
                <div className="text-2xl font-bold">
                  {users.filter(u => u.is_subscribed).length}
                </div>
                <div className="text-sm text-muted-foreground">Subscribed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {users.filter(u => u.is_active !== false).length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
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
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name || 'No name'}</div>
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
                        {user.is_subscribed ? (
                          <Badge variant="outline" className="text-green-600">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Subscribed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            <UserX className="h-3 w-3 mr-1" />
                            Free
                          </Badge>
                        )}
                        {user.is_active === false && (
                          <Badge variant="destructive">
                            <ShieldOff className="h-3 w-3 mr-1" />
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>{formatDate(user.last_usage_date || '')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role);
                            setShowRoleDialog(true);
                          }}
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={user.is_active === false ? "default" : "outline"}
                          onClick={() => toggleUserStatus(user.id, user.is_active === false)}
                        >
                          <Power className={`h-4 w-4 ${user.is_active === false ? '' : 'text-red-500'}`} />
                        </Button>
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
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update role for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="participant">Participant</SelectItem>
                <SelectItem value="caretaker">Caretaker</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUser && updateUserRole(selectedUser.id, newRole)}
              disabled={updating || newRole === selectedUser?.role}
            >
              {updating ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedUserManagement;