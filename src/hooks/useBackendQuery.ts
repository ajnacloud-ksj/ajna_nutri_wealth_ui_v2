import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { backendApi } from "@/lib/api/client";

interface BackendQueryOptions<T> {
  table: string;
  filters?: Record<string, string>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Thin wrapper around useQuery + backendApi.from() for common table queries.
 * Provides caching, deduplication, and loading/error states out of the box.
 */
export function useBackendQuery<T = any>(
  queryKey: string[],
  options: BackendQueryOptions<T>
) {
  return useQuery<T[], Error>({
    queryKey,
    queryFn: async () => {
      let query = backendApi.from(options.table).select("*");

      if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          query = query.eq(key, value);
        }
      }

      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as T[];
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime,
  });
}
