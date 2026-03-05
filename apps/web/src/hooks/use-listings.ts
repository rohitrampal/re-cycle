import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { listingApi, type CreateListingBody, type UpdateListingBody } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { unwrapApiResponse } from '@/lib/react-query';
import type { ListingWithUser } from '@recycle/shared';

/** Search response shape from API (cursor-based) */
export interface SearchResponse {
  listings: Array<{
    id: string;
    title: string;
    description?: string;
    category_code: string;
    type: string;
    condition: string;
    price?: number;
    images: string[];
    created_at: string;
    user_id?: string;
  }>;
  limit: number;
  hasMore: boolean;
  nextCursor?: { cursorId: string; cursorCreatedAt: string } | null;
  total?: number;
}

export type ListingSearchParams = {
  query?: string;
  categoryCode?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  freeOnly?: boolean;
  limit?: number;
  includeTotal?: boolean;
  cursorId?: string;
  cursorCreatedAt?: string;
  /** Radius in km; requires latitude + longitude (e.g. from "Use my location") */
  radius?: number;
  latitude?: number;
  longitude?: number;
};

const DEFAULT_PAGE_SIZE = 20;

/** Build a stable key object (no undefined) so query key identity is consistent */
function stableSearchKey(params: ListingSearchParams & { limit: number }) {
  const key: Record<string, string | number | boolean | undefined> = { limit: params.limit };
  if (params.query != null && params.query !== '') key.query = params.query;
  if (params.categoryCode != null && params.categoryCode !== '') key.categoryCode = params.categoryCode;
  if (params.type != null && params.type !== '') key.type = params.type;
  if (params.minPrice != null) key.minPrice = params.minPrice;
  if (params.maxPrice != null) key.maxPrice = params.maxPrice;
  if (params.freeOnly === true) key.freeOnly = true;
  if (params.radius != null && params.latitude != null && params.longitude != null) {
    key.radius = params.radius;
    key.latitude = params.latitude;
    key.longitude = params.longitude;
  }
  return key;
}

/** Infinite query for listing search with cursor pagination */
export function useListingSearch(params: ListingSearchParams) {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const listKey = stableSearchKey({ ...params, limit });

  return useInfiniteQuery({
    queryKey: queryKeys.listings.list(listKey),
    queryFn: async ({ pageParam }) => {
      const searchParams = {
        ...params,
        limit,
        includeTotal: pageParam == null,
        ...(pageParam && typeof pageParam === 'object' && 'cursorId' in pageParam
          ? {
              cursorId: (pageParam as { cursorId: string }).cursorId,
              cursorCreatedAt: (pageParam as { cursorCreatedAt: string }).cursorCreatedAt,
            }
          : {}),
      };
      const res = await listingApi.search(
        searchParams as Parameters<typeof listingApi.search>[0]
      );
      const data = unwrapApiResponse(res) as unknown as SearchResponse;
      return data;
    },
    initialPageParam: null as { cursorId: string; cursorCreatedAt: string } | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    staleTime: 90 * 1000, // 1.5 min – avoid refetch when success and user just switches tabs
    refetchOnWindowFocus: false, // listing search: don't refetch on tab focus when data is already there
  });
}

/** Single listing by ID */
export function useListing(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.listings.detail(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('No listing id');
      const res = await listingApi.getById(id);
      return unwrapApiResponse(res) as ListingWithUser;
    },
    enabled: (options?.enabled ?? true) && !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/** Current user's listings (paginated) */
export function useMyListings(page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.listings.myListings(page),
    queryFn: async () => {
      const res = await listingApi.getMyListings(page, limit);
      return unwrapApiResponse(res);
    },
    staleTime: 60 * 1000,
  });
}

/** Create listing mutation – invalidates list and myListings */
export function useCreateListingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateListingBody) => {
      const res = await listingApi.create(data);
      return unwrapApiResponse(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
    },
  });
}

/** Upload listing images (e.g. before create) */
export function useUploadListingImagesMutation() {
  return useMutation({
    mutationFn: async (files: File[]) => {
      const res = await listingApi.uploadListingImages(files);
      return unwrapApiResponse(res);
    },
  });
}

/** Update listing */
export function useUpdateListingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateListingBody }) => {
      const res = await listingApi.update(id, data);
      return unwrapApiResponse(res);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
    },
  });
}

/** Delete listing */
export function useDeleteListingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await listingApi.delete(id);
      unwrapApiResponse(res);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.listings.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.lists() });
      // Invalidate "My Listings" so Profile (and any other consumer) refetches and removes the deleted item
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
    },
  });
}
