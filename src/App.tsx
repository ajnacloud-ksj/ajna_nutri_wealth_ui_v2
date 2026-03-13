import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { initializeLocalAuth } from "@/config/local";
import { UserDataProvider } from "@/contexts/UserDataContext";
import { UserTypeProvider } from "@/contexts/UserTypeContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { CaretakerDataProvider } from "@/contexts/CaretakerDataContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import PWAUpdateManager from "@/components/pwa/PWAUpdateManager";
import EnhancedPWAInstallPrompt from "@/components/pwa/EnhancedPWAInstallPrompt";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

// Eager-loaded pages (primary navigation)
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import SimplifiedIndex from "./pages/SimplifiedIndex";
import Food from "./pages/Food";
import Workouts from "./pages/Workouts";
import Receipts from "./pages/Receipts";
import Capture from "./pages/Capture";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages (detail views, heavy charts, admin)
const FoodDetails = lazy(() => import("./pages/FoodDetails"));
const WorkoutDetails = lazy(() => import("./pages/WorkoutDetails"));
const ReceiptDetails = lazy(() => import("./pages/ReceiptDetails"));
const Insights = lazy(() => import("./pages/Insights"));
const Admin = lazy(() => import("./pages/Admin"));
const Billing = lazy(() => import("./pages/Billing"));
const Reconciliation = lazy(() => import("./pages/Reconciliation"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Queue = lazy(() => import("./pages/Queue"));

// Route components
import PublicRoute from "./components/routes/PublicRoute";
import PrivateRoute from "./components/routes/PrivateRoute";

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
                  <ErrorBoundary>
                  <div className="min-h-screen bg-background w-full">
                    <PWAUpdateManager />
                    <EnhancedPWAInstallPrompt />

                    {/* Notification Panel - positioned globally */}
                    <div className="fixed top-4 right-4 z-50">
                      <NotificationPanel />
                    </div>

                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
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
                      <Route path="/reconciliation" element={<PrivateRoute><Reconciliation /></PrivateRoute>} />

                      {/* Admin */}
                      <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />

                      {/* 404 Catch-all route */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    </Suspense>
                  </div>
                  <Toaster />
                  <ShadcnToaster />
                  </ErrorBoundary>
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