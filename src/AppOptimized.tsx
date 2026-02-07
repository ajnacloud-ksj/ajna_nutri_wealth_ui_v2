import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { initializeLocalAuth } from "@/config/local";
import { OptimizedProviders, PerformanceMonitor } from "@/contexts/OptimizedProviders";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import PublicRoute from "./components/routes/PublicRoute";
import PrivateRoute from "./components/routes/PrivateRoute";

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="nw-loading-spinner h-12 w-12 mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

// Lazy load PWA components
const PWAUpdateManager = lazy(() => import("@/components/pwa/PWAUpdateManager"));
const EnhancedPWAInstallPrompt = lazy(() => import("@/components/pwa/EnhancedPWAInstallPrompt"));
const NotificationPanel = lazy(() => import("@/components/notifications/NotificationPanel"));

// Lazy load all route components for code splitting
// Critical pages (auth, dashboard) loaded with higher priority
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SimplifiedIndex = lazy(() => import("./pages/SimplifiedIndex"));

// Main app pages - loaded on demand
const Food = lazy(() =>
  import("./pages/FoodOptimized").catch(() => import("./pages/Food"))
);
const FoodDetails = lazy(() => import("./pages/FoodDetails"));
const Workouts = lazy(() => import("./pages/Workouts"));
const WorkoutDetails = lazy(() => import("./pages/WorkoutDetails"));
const Receipts = lazy(() => import("./pages/Receipts"));
const ReceiptDetails = lazy(() => import("./pages/ReceiptDetails"));
const Capture = lazy(() => import("./pages/Capture"));
const Queue = lazy(() => import("./pages/Queue"));
const Insights = lazy(() => import("./pages/Insights"));

// Less frequently used pages
const Pricing = lazy(() => import("./pages/Pricing"));
const Billing = lazy(() => import("./pages/Billing"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

function AppOptimized() {
  // Initialize local auth on app start
  useEffect(() => {
    initializeLocalAuth();

    // Preload critical routes
    const preloadCriticalRoutes = () => {
      import("./pages/Dashboard");
      import("./pages/Auth");
    };

    // Start preloading after initial render
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadCriticalRoutes);
    } else {
      setTimeout(preloadCriticalRoutes, 1);
    }
  }, []);

  return (
    <PerformanceMonitor>
      <OptimizedProviders>
        <Router>
          <div className="min-h-screen bg-background w-full">
            <Suspense fallback={null}>
              <PWAUpdateManager />
              <EnhancedPWAInstallPrompt />

              {/* Notification Panel - positioned globally */}
              <div className="fixed top-4 right-4 z-50">
                <NotificationPanel />
              </div>
            </Suspense>

                    <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </div>
          <Toaster />
          <ShadcnToaster />
        </Router>
      </OptimizedProviders>
    </PerformanceMonitor>
  );
}

export default AppOptimized;