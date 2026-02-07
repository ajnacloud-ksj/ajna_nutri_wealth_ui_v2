import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserDataProvider } from "@/contexts/UserDataContext";
import { UserTypeProvider } from "@/contexts/UserTypeContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { CaretakerDataProvider } from "@/contexts/CaretakerDataContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

// Optimized Query Client with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

interface OptimizedProvidersProps {
  children: ReactNode;
}

/**
 * Combines all providers into a single component to reduce nesting
 * and optimize re-renders
 */
export const OptimizedProviders: React.FC<OptimizedProvidersProps> = ({ children }) => {
  // Use traditional nesting approach for reliability
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserDataProvider>
          <UserTypeProvider>
            <RoleProvider>
              <CaretakerDataProvider>
                <NotificationProvider>
                  {children}
                </NotificationProvider>
              </CaretakerDataProvider>
            </RoleProvider>
          </UserTypeProvider>
        </UserDataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

/**
 * Performance monitoring wrapper for development
 */
export const PerformanceMonitor: React.FC<{ children: ReactNode }> = ({ children }) => {
  if (process.env.NODE_ENV === 'development') {
    React.useEffect(() => {
      // Log render performance
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'measure') {
            console.log(`⚡ Performance [${entry.name}]: ${entry.duration.toFixed(2)}ms`);
          }
        });
      });

      observer.observe({ entryTypes: ['measure'] });

      return () => observer.disconnect();
    }, []);
  }

  return <>{children}</>;
};