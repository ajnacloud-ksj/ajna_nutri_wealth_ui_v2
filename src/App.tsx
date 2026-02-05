import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { initializeLocalAuth } from "@/config/local";
import { UserDataProvider } from "@/contexts/UserDataContext";
import { UserTypeProvider } from "@/contexts/UserTypeContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { CaretakerDataProvider } from "@/contexts/CaretakerDataContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import PWAUpdateManager from "@/components/pwa/PWAUpdateManager";
import EnhancedPWAInstallPrompt from "@/components/pwa/EnhancedPWAInstallPrompt";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";

// Pages
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import SimplifiedIndex from "./pages/SimplifiedIndex";
import Food from "./pages/Food";
import FoodDetails from "./pages/FoodDetails";
import Workouts from "./pages/Workouts";
import WorkoutDetails from "./pages/WorkoutDetails";
import Receipts from "./pages/Receipts";
import ReceiptDetails from "./pages/ReceiptDetails";
import Pricing from "./pages/Pricing";
import Capture from "./pages/Capture";
import Queue from "./pages/Queue";
import Admin from "./pages/Admin";
import Insights from "./pages/Insights";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";

// Route components
import PublicRoute from "./components/routes/PublicRoute";
import PrivateRoute from "./components/routes/PrivateRoute";

const queryClient = new QueryClient();

function App() {
  // Initialize local auth on app start
  useEffect(() => {
    initializeLocalAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserDataProvider>
          <UserTypeProvider>
            <RoleProvider>
              <CaretakerDataProvider>
                <NotificationProvider>
                <Router>
                  <div className="min-h-screen bg-background w-full">
                    <PWAUpdateManager />
                    <EnhancedPWAInstallPrompt />

                    {/* Notification Panel - positioned globally */}
                    <div className="fixed top-4 right-4 z-50">
                      <NotificationPanel />
                    </div>

                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<PublicRoute><SimplifiedIndex /></PublicRoute>} />
                      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
                      <Route path="/pricing" element={<Pricing />} />

                      {/* Protected Routes - Core Features */}
                      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                      <Route path="/capture" element={<PrivateRoute><Capture /></PrivateRoute>} />
                      <Route path="/queue" element={<PrivateRoute><Queue /></PrivateRoute>} />

                      {/* Food Analysis */}
                      <Route path="/food" element={<PrivateRoute><Food /></PrivateRoute>} />
                      <Route path="/food/:id" element={<PrivateRoute><FoodDetails /></PrivateRoute>} />

                      {/* Workout Tracking */}
                      <Route path="/workouts" element={<PrivateRoute><Workouts /></PrivateRoute>} />
                      <Route path="/workouts/:id" element={<PrivateRoute><WorkoutDetails /></PrivateRoute>} />

                      {/* Receipt Scanning */}
                      <Route path="/receipts" element={<PrivateRoute><Receipts /></PrivateRoute>} />
                      <Route path="/receipts/:id" element={<PrivateRoute><ReceiptDetails /></PrivateRoute>} />

                      {/* Analytics & Settings */}
                      <Route path="/insights" element={<PrivateRoute><Insights /></PrivateRoute>} />
                      <Route path="/billing" element={<PrivateRoute><Billing /></PrivateRoute>} />

                      {/* Admin */}
                      <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />

                      {/* 404 Catch-all route */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                  <Toaster />
                  <ShadcnToaster />
                </Router>
              </NotificationProvider>
            </CaretakerDataProvider>
          </RoleProvider>
        </UserTypeProvider>
        </UserDataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;