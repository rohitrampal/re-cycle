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

// User endpoints
export const userApi = {
  getProfile: (userId: string): Promise<ApiResponse<UserProfile>> =>
    apiClient.get(`/users/${userId}`),

  updateProfile: (data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> =>
    apiClient.patch('/users/me', data),

  uploadAvatar: (file: File): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Create listing body shape expected by the API (categoryCode, flat lat/lng)
export interface CreateListingBody {
  title: string;
  description?: string;
  categoryCode: string;
  type: 'sell' | 'rent' | 'free';
  condition?: string;
  price?: number;
  images: string[];
  latitude: number;
  longitude: number;
  institutionId?: string;
}

// Listing endpoints
export const listingApi = {
  create: (data: CreateListingBody): Promise<ApiResponse<Listing>> =>
    apiClient.post('/listings', data),

  update: (id: string, data: Partial<Listing>): Promise<ApiResponse<Listing>> =>
    apiClient.patch(`/listings/${id}`, data),

  delete: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete(`/listings/${id}`),

  getById: (id: string): Promise<ApiResponse<ListingWithUser>> =>
    apiClient.get(`/listings/${id}`),

  getMyListings: (page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Listing>>> =>
    apiClient.get('/listings/me', { params: { page, limit } }),

  search: (filters: SearchFilters & { page?: number; limit?: number }): Promise<ApiResponse<SearchResult>> =>
    apiClient.get('/listings/search', { params: filters }),

  uploadListingImages: (files: File[]): Promise<ApiResponse<{ urls: Array<{ url: string; thumbnailUrl?: string }> }>> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('file', file));
    return apiClient.post('/upload/listings/multiple', formData);
  },

  uploadAvatar: (file: File): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/upload/avatar', formData);
  },
};

// Location endpoints
export const locationApi = {
  updateLocation: (latitude: number, longitude: number): Promise<ApiResponse<void>> =>
    apiClient.post('/location', { latitude, longitude }),

  getNearbyListings: (radius: number, limit = 20): Promise<ApiResponse<ListingWithUser[]>> =>
    apiClient.get('/location/nearby', { params: { radius, limit } }),
};

// Institution endpoints
export const institutionApi = {
  search: (query: string): Promise<ApiResponse<Array<{ id: string; name: string; type: string }>>> =>
    apiClient.get('/institutions/search', { params: { q: query } }),
};
