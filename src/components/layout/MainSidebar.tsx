import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Camera,
  FileText,
  Utensils,
  Dumbbell,
  BarChart3,
  CreditCard,
  LogOut,
  Home,
  Settings,
  Shield,
  GitCompare,
  Users,
  UserPlus,
  ShoppingCart,
} from "lucide-react";
import { backendApi } from "@/lib/api/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import PWAUpdateIcon from "@/components/pwa/PWAUpdateIcon";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

export const MainSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) return;

      try {
        // Query the users table directly with proper auth token
        const { data: userData } = await backendApi
          .from('users')
          .select('role, is_subscribed')
          .eq('id', user.id)
          .single();

        // Check if user exists and has admin role
        if (userData) {
          setIsAdmin(userData.role === 'admin');
          setIsSubscribed(userData.is_subscribed || false);
          console.log('User role:', userData.role, 'for user:', user.email);
        } else {
          // If user not found, check by email
          const { data: userByEmail } = await backendApi
            .from('users')
            .select('role, is_subscribed')
            .eq('email', user.email)
            .single();

          if (userByEmail) {
            setIsAdmin(userByEmail.role === 'admin');
            setIsSubscribed(userByEmail.is_subscribed || false);
            console.log('User role (by email):', userByEmail.role, 'for user:', user.email);
          }
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        // For debugging
        console.log('Current user:', user);
      }
    };

    checkUserStatus();
  }, [user]);

  const handleSignOut = async () => {
    try {
      // Use signOut from AuthContext which properly handles both Cognito and local auth
      await signOut();
      // Force a full page refresh to clear all state and redirect to home
      window.location.href = "/";
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  const mainNavigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Capture", href: "/capture", icon: Camera },
    { name: "Food", href: "/food", icon: Utensils },
    { name: "Receipts", href: "/receipts", icon: FileText },
    { name: "Shopping", href: "/shopping", icon: ShoppingCart },
    { name: "Workouts", href: "/workouts", icon: Dumbbell },
    { name: "Finance", href: "/insights", icon: BarChart3 },
    { name: "Reconciliation", href: "/reconciliation", icon: GitCompare },
  ];

  // Only show billing if user is not subscribed or needs to manage subscription
  const accountItems = [
    ...((!isSubscribed || isAdmin) ? [{ name: "Billing", href: "/billing", icon: CreditCard }] : []),
  ];

  const adminItems = [
    { name: "Settings", href: "/admin", icon: Settings },
  ];

  return (
    <>
      <SidebarHeader className="border-b border-green-200/50 bg-gradient-to-r from-green-600 to-green-700 p-3 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-white group-data-[collapsible=icon]:justify-center">
            <Brain className="h-6 w-6 flex-shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">NutriWealth</span>
          </Link>
          <PWAUpdateIcon />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavigationItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                  >
                    <Link to={item.href} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Caretaker Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Caretaker
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/caretaker-settings"}
                >
                  <Link to="/caretaker-settings" className="flex items-center gap-3">
                    <Shield className="h-4 w-4" />
                    <span>Caretaker Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/caretaker" || location.pathname.startsWith("/caretaker/")}
                >
                  <Link to="/caretaker" className="flex items-center gap-3">
                    <Users className="h-4 w-4" />
                    <span>Care Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/join-caretaker"}
                >
                  <Link to="/join-caretaker" className="flex items-center gap-3">
                    <UserPlus className="h-4 w-4" />
                    <span>Join as Caretaker</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account & Admin Section */}
        {(accountItems.length > 0 || adminItems.length > 0) && (
          /* Always show - Settings is visible for all users */
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Account
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accountItems.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.href}
                    >
                      <Link to={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.href}
                      onClick={() => navigate(item.href)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                      {isAdmin && <Badge variant="destructive" className="ml-auto text-xs">Admin</Badge>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold group-data-[collapsible=icon]:mx-auto">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email || 'User'}
              </p>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Badge variant="destructive" className="text-xs">Admin</Badge>
                )}
                {isSubscribed && (
                  <Badge variant="default" className="text-xs">Pro</Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-200"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
};