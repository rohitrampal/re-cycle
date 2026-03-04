import { useQuery } from '@tanstack/react-query';
import { institutionApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { unwrapApiResponse } from '@/lib/react-query';

export function useInstitutionSearch(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.institutions.search(query),
    queryFn: async () => {
      const res = await institutionApi.search(query);
      return unwrapApiResponse(res);
    },
    enabled: (options?.enabled ?? true) && query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
