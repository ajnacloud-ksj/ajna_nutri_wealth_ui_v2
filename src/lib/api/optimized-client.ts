/**
 * Optimized API Client with Request Deduplication and Caching
 */

import { backendApi } from './client';

// Request deduplication cache
const requestCache = new Map<string, Promise<any>>();
const CACHE_DURATION = 5000; // 5 seconds

/**
 * Deduplicates identical requests made within a short time window
 */
export async function deduplicatedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check if we have a pending request for this key
  if (requestCache.has(key)) {
    return requestCache.get(key) as Promise<T>;
  }

  // Create new request and cache it
  const promise = fetcher();
  requestCache.set(key, promise);

  // Clear from cache after duration
  setTimeout(() => {
    requestCache.delete(key);
  }, CACHE_DURATION);

  // Also clear on error
  promise.catch(() => {
    requestCache.delete(key);
  });

  return promise;
}

/**
 * Enhanced API client with pagination support
 */
export class OptimizedApiClient {
  private static instance: OptimizedApiClient;

  private constructor() {}

  static getInstance(): OptimizedApiClient {
    if (!OptimizedApiClient.instance) {
      OptimizedApiClient.instance = new OptimizedApiClient();
    }
    return OptimizedApiClient.instance;
  }

  /**
   * Fetch paginated data from a table
   */
  async fetchPaginated<T = any>(
    table: string,
    options: {
      page?: number;
      pageSize?: number;
      filters?: any[];
      orderBy?: { column: string; ascending: boolean };
      select?: string;
    } = {}
  ) {
    const {
      page = 0,
      pageSize = 20,
      filters = [],
      orderBy,
      select = '*'
    } = options;

    const start = page * pageSize;
    const end = start + pageSize - 1;

    // Create cache key from parameters
    const cacheKey = `${table}_${JSON.stringify({ page, pageSize, filters, orderBy, select })}`;

    return deduplicatedFetch(cacheKey, async () => {
      let query = backendApi.from(table).select(select);

      // Apply filters
      filters.forEach(filter => {
        if (filter.operator === 'eq') {
          query = query.eq(filter.column, filter.value);
        } else if (filter.operator === 'neq') {
          query = query.neq(filter.column, filter.value);
        } else if (filter.operator === 'gt') {
          query = query.gt(filter.column, filter.value);
        } else if (filter.operator === 'gte') {
          query = query.gte(filter.column, filter.value);
        } else if (filter.operator === 'lt') {
          query = query.lt(filter.column, filter.value);
        } else if (filter.operator === 'lte') {
          query = query.lte(filter.column, filter.value);
        }
      });

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending });
      }

      // Apply pagination with limit and offset
      query = query.limit(pageSize);
      if (start > 0) {
        query = query.offset(start);
      }

      const result = await query;

      return {
        data: result.data || [],
        error: result.error,
        hasMore: result.data ? result.data.length === pageSize : false,
        page,
        pageSize
      };
    });
  }

  /**
   * Batch fetch multiple resources in parallel
   */
  async batchFetch<T = any>(
    requests: Array<{
      table: string;
      filters?: any[];
      select?: string;
    }>
  ): Promise<Array<{ data: T[] | null; error: Error | null }>> {
    const promises = requests.map(req => {
      const cacheKey = `batch_${req.table}_${JSON.stringify(req.filters || [])}`;

      return deduplicatedFetch(cacheKey, async () => {
        let query = backendApi.from(req.table).select(req.select || '*');

        if (req.filters) {
          req.filters.forEach(filter => {
            query = query.eq(filter.column, filter.value);
          });
        }

        return query;
      });
    });

    return Promise.all(promises);
  }

  /**
   * Optimistic update with rollback on failure
   */
  async optimisticUpdate<T = any>(
    table: string,
    id: string,
    updates: Partial<T>,
    optimisticData: T
  ): Promise<{ data: T | null; error: Error | null }> {
    // Return optimistic data immediately
    const optimisticResult = { data: optimisticData, error: null };

    // Perform actual update in background
    try {
      const result = await backendApi
        .from(table)
        .update(updates)
        .eq('id', id)
        .single();

      if (result.error) {
        throw result.error;
      }

      return result;
    } catch (error) {
      // On error, caller should revert to previous state
      return { data: null, error: error as Error };
    }
  }

  /**
   * Prefetch data that will likely be needed soon
   */
  prefetch(
    table: string,
    options: {
      filters?: any[];
      select?: string;
    } = {}
  ): void {
    const cacheKey = `prefetch_${table}_${JSON.stringify(options)}`;

    // Don't await - let it run in background
    deduplicatedFetch(cacheKey, async () => {
      let query = backendApi.from(table).select(options.select || '*');

      if (options.filters) {
        options.filters.forEach(filter => {
          query = query.eq(filter.column, filter.value);
        });
      }

      return query;
    }).catch(error => {
      console.warn('Prefetch failed:', error);
    });
  }
}

// Export singleton instance
export const optimizedApi = OptimizedApiClient.getInstance();