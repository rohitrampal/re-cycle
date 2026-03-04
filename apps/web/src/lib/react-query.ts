import { QueryClient } from '@tanstack/react-query';

/** Unwrap API response or throw for React Query */
export function unwrapApiResponse<T>(res: { success?: boolean; data?: T; error?: { message?: string } }): T {
  if (!res?.success || res.data === undefined) {
    throw new Error(res?.error?.message ?? 'Request failed');
  }
  return res.data;
}

/**
 * Default query behaviour:
 * - Success: Data is cached. Refetches only when stale (after staleTime), or on window focus / reconnect / mount
 *   if the query opts in. So if the API succeeded but the UI glitches, we do NOT refetch for that reason;
 *   we may refetch later due to refetchOnWindowFocus/refetchOnMount once data is stale.
 * - Error: Retries up to 2 times (3 attempts total) unless error is 401/403/404 (then no retry).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 min
      gcTime: 10 * 60 * 1000, // 10 min
      retry: (failureCount, error) => {
        const msg = error instanceof Error ? error.message : '';
        if (msg.includes('401') || msg.includes('403') || msg.includes('404')) return false;
        return failureCount < 2; // 1 initial + 2 retries = 3 attempts max
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: false,
    },
  },
});
