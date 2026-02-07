import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { optimizedApi } from '@/lib/api/optimized-client';
import { useCallback, useEffect, useRef } from 'react';

interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  page: number;
  pageSize: number;
  error: Error | null;
}

/**
 * Optimized hook for paginated data fetching
 */
export function usePaginatedQuery<T = any>(
  key: string,
  table: string,
  options?: {
    filters?: any[];
    orderBy?: { column: string; ascending: boolean };
    pageSize?: number;
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const currentPage = useRef(0);

  const fetchPage = useCallback(async (page: number) => {
    return optimizedApi.fetchPaginated<T>(table, {
      page,
      pageSize: options?.pageSize || 20,
      filters: options?.filters,
      orderBy: options?.orderBy,
    });
  }, [table, options]);

  const query = useQuery<PaginatedResult<T>>({
    queryKey: [key, table, currentPage.current, options],
    queryFn: () => fetchPage(currentPage.current),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  const loadNextPage = useCallback(async () => {
    if (!query.data?.hasMore) return;

    currentPage.current += 1;
    const nextPageData = await fetchPage(currentPage.current);

    queryClient.setQueryData(
      [key, table, currentPage.current - 1, options],
      (oldData: any) => ({
        ...nextPageData,
        data: [...(oldData?.data || []), ...nextPageData.data],
      })
    );
  }, [query.data, fetchPage, queryClient, key, table, options]);

  const loadPreviousPage = useCallback(async () => {
    if (currentPage.current === 0) return;

    currentPage.current -= 1;
    await query.refetch();
  }, [query]);

  const reset = useCallback(() => {
    currentPage.current = 0;
    queryClient.invalidateQueries({ queryKey: [key, table] });
  }, [queryClient, key, table]);

  return {
    ...query,
    loadNextPage,
    loadPreviousPage,
    reset,
    currentPage: currentPage.current,
  };
}

/**
 * Optimized hook for mutations with optimistic updates
 */
export function useOptimisticMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables> & {
    optimisticUpdate?: (variables: TVariables) => void;
    invalidateQueries?: string[];
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing queries
      if (options?.invalidateQueries) {
        await Promise.all(
          options.invalidateQueries.map(key =>
            queryClient.cancelQueries({ queryKey: [key] })
          )
        );
      }

      // Optimistically update
      options?.optimisticUpdate?.(variables);

      // Call original onMutate if provided
      return options?.onMutate?.(variables);
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(key =>
          queryClient.invalidateQueries({ queryKey: [key] })
        );
      }

      // Call original onError if provided
      options?.onError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(key =>
          queryClient.invalidateQueries({ queryKey: [key] })
        );
      }

      // Call original onSuccess if provided
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Hook for prefetching data that will likely be needed
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchQuery = useCallback(
    async (
      key: string,
      fetcher: () => Promise<any>,
      options?: UseQueryOptions
    ) => {
      await queryClient.prefetchQuery({
        queryKey: [key],
        queryFn: fetcher,
        staleTime: options?.staleTime || 5 * 60 * 1000,
        ...options,
      });
    },
    [queryClient]
  );

  const prefetchTable = useCallback(
    (table: string, filters?: any[]) => {
      optimizedApi.prefetch(table, { filters });
    },
    []
  );

  return {
    prefetchQuery,
    prefetchTable,
  };
}

/**
 * Hook for managing cache
 */
export function useCacheManager() {
  const queryClient = useQueryClient();

  const clearCache = useCallback(
    (keys?: string[]) => {
      if (keys) {
        keys.forEach(key => {
          queryClient.removeQueries({ queryKey: [key] });
        });
      } else {
        queryClient.clear();
      }
    },
    [queryClient]
  );

  const getCacheSize = useCallback(() => {
    const cache = queryClient.getQueryCache();
    return cache.getAll().length;
  }, [queryClient]);

  const optimizeCache = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    // Remove stale queries
    queries.forEach(query => {
      if (query.state.dataUpdateCount === 0 && query.state.fetchStatus === 'idle') {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  }, [queryClient]);

  return {
    clearCache,
    getCacheSize,
    optimizeCache,
  };
}

/**
 * Hook for monitoring performance
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const renderStartTime = useRef<number>();

  useEffect(() => {
    renderCount.current += 1;
    const renderEndTime = performance.now();

    if (renderStartTime.current) {
      const renderTime = renderEndTime - renderStartTime.current;

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `⚡ [${componentName}] Render #${renderCount.current}: ${renderTime.toFixed(2)}ms`
        );
      }

      // Report to analytics if render time is too high
      if (renderTime > 16.67) { // More than one frame (60fps)
        console.warn(
          `⚠️ [${componentName}] Slow render detected: ${renderTime.toFixed(2)}ms`
        );
      }
    }

    renderStartTime.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
  };
}