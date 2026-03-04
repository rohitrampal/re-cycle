/**
 * Centralized query key factory for React Query.
 * Enables type-safe cache invalidation and consistent key structure.
 */
export const queryKeys = {
  all: ['recycle'] as const,

  auth: {
    all: ['recycle', 'auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  listings: {
    all: ['recycle', 'listings'] as const,
    lists: () => [...queryKeys.listings.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.listings.lists(), filters] as const,
    details: () => [...queryKeys.listings.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.listings.details(), id] as const,
    myListings: (page?: number) => [...queryKeys.listings.all, 'me', page] as const,
  },

  users: {
    all: ['recycle', 'users'] as const,
    profile: (userId: string) => [...queryKeys.users.all, 'profile', userId] as const,
  },

  institutions: {
    all: ['recycle', 'institutions'] as const,
    search: (query: string) => [...queryKeys.institutions.all, 'search', query] as const,
  },

  location: {
    all: ['recycle', 'location'] as const,
    nearby: (radius: number, limit?: number) =>
      [...queryKeys.location.all, 'nearby', radius, limit] as const,
  },
} as const;
