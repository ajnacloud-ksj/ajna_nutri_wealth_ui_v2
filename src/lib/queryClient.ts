import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes before refetch
      gcTime: 10 * 60 * 1000, // 10 minutes before GC
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Cache keys for consistent naming
export const QUERY_KEYS = {
  // Food entries
  foodEntries: (userId: string) => ['foodEntries', userId] as const,
  foodEntry: (id: string) => ['foodEntry', id] as const,
  foodStats: (userId: string) => ['foodStats', userId] as const,

  // Analysis queue
  analysisQueue: (userId: string) => ['analysisQueue', userId] as const,

  // User data
  user: (userId: string) => ['user', userId] as const,
  userSettings: (userId: string) => ['userSettings', userId] as const,

  // Receipts
  receipts: (userId: string) => ['receipts', userId] as const,
  receipt: (id: string) => ['receipt', id] as const,
} as const;