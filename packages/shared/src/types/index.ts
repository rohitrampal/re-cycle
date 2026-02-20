// User Types
export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  institutionId?: string;
  institutionName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  bio?: string;
  avatar?: string;
  verified: boolean;
  totalListings: number;
  rating?: number;
}

// Listing Types
export type ListingType = 'sell' | 'rent' | 'free';
export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
export type ListingCategory = 
  | 'school_1_5'
  | 'school_6_8'
  | 'school_9_10'
  | 'school_11_12_science'
  | 'school_11_12_commerce'
  | 'school_11_12_arts'
  | 'college_ba'
  | 'college_bsc'
  | 'college_bcom'
  | 'college_bba'
  | 'college_bca'
  | 'college_btech'
  | 'college_mba'
  | 'college_law'
  | 'college_medical'
  | 'college_pharmacy'
  | 'competitive_upsc'
  | 'competitive_ssc'
  | 'competitive_banking'
  | 'competitive_railways'
  | 'competitive_defence'
  | 'competitive_state';

export interface Listing {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: ListingCategory;
  type: ListingType;
  condition: ListingCondition;
  price?: number;
  images: string[];
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  institutionId?: string;
  isActive: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListingWithUser extends Listing {
  user: {
    id: string;
    name: string;
    phone?: string;
    email: string;
    verified: boolean;
  };
}

// Institution Types
export interface Institution {
  id: string;
  name: string;
  type: 'school' | 'college' | 'university';
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  verified: boolean;
}

// Search & Filter Types
export interface SearchFilters {
  category?: ListingCategory;
  type?: ListingType;
  condition?: ListingCondition;
  minPrice?: number;
  maxPrice?: number;
  freeOnly?: boolean;
  radius?: number; // in kilometers
  institutionId?: string;
  query?: string;
}

export interface SearchResult {
  listings: ListingWithUser[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

// Language Types
export type SupportedLanguage = 
  | 'en'
  | 'hi'
  | 'mr'
  | 'gu'
  | 'pa'
  | 'ur'
  | 'bn'
  | 'te'
  | 'ta'
  | 'kn'
  | 'or'
  | 'ml';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'en',
  'hi',
  'mr',
  'gu',
  'pa',
  'ur',
  'bn',
  'te',
  'ta',
  'kn',
  'or',
  'ml'
];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  gu: 'Gujarati',
  pa: 'Punjabi',
  ur: 'Urdu',
  bn: 'Bengali',
  te: 'Telugu',
  ta: 'Tamil',
  kn: 'Kannada',
  or: 'Odia',
  ml: 'Malayalam'
};
