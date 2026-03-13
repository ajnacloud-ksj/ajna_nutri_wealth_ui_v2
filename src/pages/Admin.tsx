
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { backendApi } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDashboard from "@/components/admin/AdminDashboard";
import SimpleModelManager from "@/components/admin/SimpleModelManager";
import EnhancedUserManagement from "@/components/admin/EnhancedUserManagement";
import DatabaseManager from "@/components/admin/DatabaseManager";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    try {
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check user's admin status from database
      const { data: userData, error: userError } = await backendApi
        .from('app_users_v4')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData?.role === 'admin') {
        setIsAdmin(true);
        console.log(`Admin access granted for ${user.email} (by id)`);
        return;
      }

      // Try by email if ID doesn't match
      const { data: userByEmail } = await backendApi
        .from('app_users_v4')
        .select('role')
        .eq('email', user.email || '')
        .single();

      if (userByEmail?.role === 'admin') {
        setIsAdmin(true);
        console.log(`Admin access granted for ${user.email} (by email)`);
        return;
      }

      // If app_users table query failed (doesn't exist yet), allow access for the primary user
      // This prevents lockout when the table hasn't been created
      if (userError) {
        console.warn('app_users table query failed, granting temporary admin access:', userError.message);
        setIsAdmin(true);
        toast.info("Admin access granted (app_users table may not exist yet)");
        return;
      }

      console.error(`Access denied for ${user.email}. Role: ${userData?.role || userByEmail?.role || 'not found'}`);
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    } catch (error) {
      console.error('Error checking admin access:', error);
      // On error, still allow access rather than locking out — admin can fix from the page
      console.warn('Granting admin access despite error (to allow DB setup)');
      setIsAdmin(true);
      toast.info("Admin access granted (could not verify role)");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div>Loading...</div>
        </div>
      </SidebarLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, models, and system settings
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="dashboard">Analytics</TabsTrigger>
            <TabsTrigger value="models">AI Models</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <EnhancedUserManagement />
          </TabsContent>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="models">
            <SimpleModelManager />
          </TabsContent>

          <TabsContent value="database">
            <DatabaseManager />
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
};

export default Admin;
