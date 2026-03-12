import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, userApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { unwrapApiResponse } from '@/lib/react-query';
import { useAuthStore } from '@/store/auth-store';
import type { AuthResponse, LoginCredentials, RegisterData, UserProfile } from '@recycle/shared';

/** Fetch current user; enabled only when token exists. Use for app bootstrap and auth state sync. */
export function useAuthMe(options?: { enabled?: boolean }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const res = await authApi.me();
      return unwrapApiResponse(res);
    },
    enabled: (options?.enabled ?? true) && !!token,
    staleTime: 5 * 60 * 1000, // 5 min – auth profile changes rarely
    retry: false, // 401 should not retry
    refetchOnWindowFocus: true,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const res = await authApi.login(credentials);
      return unwrapApiResponse(res);
    },
    onSuccess: (data) => {
      const { user, accessToken, refreshToken } = data;
      setAuth(user, accessToken, refreshToken);
      queryClient.setQueryData(queryKeys.auth.me(), user);
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation<AuthResponse, Error, RegisterData>({
    mutationFn: async (data) => {
      const res = await authApi.register(data);
      return unwrapApiResponse(res);
    },
    onSuccess: (data) => {
      const { user, accessToken, refreshToken } = data;
      setAuth(user, accessToken, refreshToken);
      queryClient.setQueryData(queryKeys.auth.me(), user);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      const res = await authApi.logout();
      unwrapApiResponse(res);
    },
    onSuccess: () => {
      logout();
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      queryClient.removeQueries({ queryKey: queryKeys.listings.all });
    },
  });
}

/** Update current user profile; updates auth cache and store on success */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const res = await userApi.updateProfile(data);
      return unwrapApiResponse(res) as UserProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.me(), data);
      setUser(data);
    },
  });
}
