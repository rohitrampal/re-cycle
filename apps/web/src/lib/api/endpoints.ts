import apiClient from './client';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  UserProfile,
  Listing,
  ListingWithUser,
  SearchFilters,
  SearchResult,
  PaginatedResponse,
  ApiResponse
} from '@recycle/shared';

// Auth endpoints (unwrap axios response so return type is ApiResponse<T>)
export const authApi = {
  login: (credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> =>
    apiClient.post('/auth/login', credentials).then((r) => r.data),

  register: (data: RegisterData): Promise<ApiResponse<AuthResponse>> =>
    apiClient.post('/auth/register', data).then((r) => r.data),

  logout: (): Promise<ApiResponse<void>> =>
    apiClient.post('/auth/logout').then((r) => r.data),

  refresh: (refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> =>
    apiClient.post('/auth/refresh', { refreshToken }).then((r) => r.data),

  me: (): Promise<ApiResponse<UserProfile>> =>
    apiClient.get('/auth/me').then((r) => r.data),
};

// User endpoints (unwrap axios .data so callers get ApiResponse<T>)
export const userApi = {
  getProfile: (userId: string): Promise<ApiResponse<UserProfile>> =>
    apiClient.get(`/users/${userId}`).then((r) => r.data),

  updateProfile: (data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> =>
    apiClient.patch('/users/me', data).then((r) => r.data),

  uploadAvatar: (file: File): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post('/users/me/avatar', formData).then((r) => r.data);
  },
};

// Create listing body shape expected by the API (categoryCode, optional lat/lng)
export interface CreateListingBody {
  title: string;
  description?: string;
  categoryCode: string;
  type: 'sell' | 'rent' | 'free';
  condition?: string;
  price?: number;
  images: string[];
  latitude?: number;
  longitude?: number;
  institutionId?: string;
}

// Update listing body (partial + clearLocation to remove location)
export type UpdateListingBody = Partial<Listing> & { clearLocation?: boolean };

// Listing endpoints (unwrap axios .data so callers get ApiResponse<T>)
export const listingApi = {
  create: (data: CreateListingBody): Promise<ApiResponse<Listing>> =>
    apiClient.post('/listings', data).then((r) => r.data),

  update: (id: string, data: UpdateListingBody): Promise<ApiResponse<Listing>> =>
    apiClient.patch(`/listings/${id}`, data).then((r) => r.data),

  delete: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete(`/listings/${id}`).then((r) => r.data),

  getById: (id: string, options?: { include?: 'user' }): Promise<ApiResponse<ListingWithUser>> =>
    apiClient.get(`/listings/${id}`, { params: { include: options?.include ?? 'user' } }).then((r) => r.data),

  getMyListings: (page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Listing>>> =>
    apiClient.get('/listings/me', { params: { page, limit } }).then((r) => r.data),

  search: (
    filters: SearchFilters & {
      page?: number;
      limit?: number;
      categoryCode?: string;
      cursorId?: string;
      cursorCreatedAt?: string;
      includeTotal?: boolean;
      radius?: number;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<ApiResponse<SearchResult>> =>
    apiClient.get('/listings/search', { params: filters }).then((r) => r.data),

  uploadListingImages: (files: File[]): Promise<ApiResponse<{ urls: Array<{ url: string; thumbnailUrl?: string }> }>> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('file', file));
    return apiClient.post('/upload/listings/multiple', formData).then((r) => r.data);
  },

  uploadAvatar: (file: File): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/upload/avatar', formData).then((r) => r.data);
  },
};

// Location endpoints
export const locationApi = {
  updateLocation: (latitude: number, longitude: number): Promise<ApiResponse<void>> =>
    apiClient.post('/location', { latitude, longitude }).then((r) => r.data),

  getNearbyListings: (radius: number, limit = 20): Promise<ApiResponse<ListingWithUser[]>> =>
    apiClient.get('/location/nearby', { params: { radius, limit } }).then((r) => r.data),
};

// Institution endpoints
export const institutionApi = {
  search: (query: string): Promise<ApiResponse<Array<{ id: string; name: string; type: string }>>> =>
    apiClient.get('/institutions/search', { params: { q: query } }).then((r) => r.data),
};
