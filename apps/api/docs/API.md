# EduCycle API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)
6. [Endpoints](#endpoints)
   - [Authentication](#authentication-endpoints)
   - [Users](#user-endpoints)
   - [Listings](#listing-endpoints)
   - [Location](#location-endpoints)
   - [Institutions](#institution-endpoints)
7. [Data Models](#data-models)
8. [Examples](#examples)

## Overview

EduCycle API is a RESTful API for exchanging academic resources (books, notes) between students. The API uses JSON for request/response payloads and JWT for authentication.

### Key Features

- **Location-based Discovery**: Find resources near you using PostGIS
- **Institution-based Filtering**: Filter by school/college
- **Secure Authentication**: JWT with refresh tokens
- **Multi-language Support**: 12 languages supported
- **Comprehensive Search**: Full-text and spatial search

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. There are two types of tokens:

1. **Access Token**: Short-lived (15 minutes), used for API requests
2. **Refresh Token**: Long-lived (7 days), used to get new access tokens

### Getting Started

1. **Register** a new account: `POST /api/auth/register`
2. **Login** to get tokens: `POST /api/auth/login`
3. **Use access token** in Authorization header for protected endpoints
4. **Refresh token** when access token expires: `POST /api/auth/refresh`

### Authorization Header

Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Refresh Token

Refresh tokens are stored as HTTP-only cookies (set automatically on login). You can also send it in the request body:

```json
{
  "refreshToken": "your_refresh_token"
}
```

## Base URL

- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.educycle.com/api`

## Rate Limiting

Rate limits are applied per IP address:

- **General endpoints**: 100 requests per minute
- **Auth endpoints**: 5 requests per 15 minutes (brute force protection)
- **Search endpoints**: 30 requests per minute

When rate limit is exceeded, you'll receive a `429 Too Many Requests` response.

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error details (development only)
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `TOKEN_INVALID` | 401 | Invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_EXISTS` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Endpoints

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "phone": "+1234567890" // Optional
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@example.com",
      "name": "John Doe",
      "phone": "+1234567890"
    },
    "accessToken": "jwt_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@example.com",
      "name": "John Doe",
      "phone": "+1234567890"
    },
    "accessToken": "jwt_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

**Note:** Refresh token is also set as HTTP-only cookie.

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "student@example.com",
    "name": "John Doe",
    "phone": "+1234567890"
  }
}
```

#### Refresh Token

```http
POST /api/auth/refresh
```

**Request Body (optional):**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

If not provided, cookie will be used.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token"
  }
}
```

#### Logout

```http
POST /api/auth/logout
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

### User Endpoints

#### Get User Profile

```http
GET /api/users/{id}
```

**Parameters:**
- `id` (path, required): User UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "student@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Update Own Profile

```http
PATCH /api/users/me
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "John Updated", // Optional
  "phone": "+9876543210", // Optional
  "bio": "Student bio", // Optional
  "institutionId": "uuid" // Optional
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "student@example.com",
    "name": "John Updated",
    "phone": "+9876543210",
    "bio": "Student bio",
    "institutionId": "uuid",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Listing Endpoints

#### Create Listing

```http
POST /api/listings
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Class 10 Mathematics Book",
  "description": "NCERT Mathematics textbook in good condition",
  "categoryCode": "school_9_10",
  "type": "sell",
  "condition": "good",
  "price": 200,
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "latitude": 28.6139,
  "longitude": 77.2090,
  "institutionId": "uuid" // Optional
}
```

**Category Codes:**
- School: `school_1_5`, `school_6_8`, `school_9_10`, `school_11_12_science`, `school_11_12_commerce`, `school_11_12_arts`
- College: `college_ba`, `college_bsc`, `college_bcom`, `college_bba`, `college_bca`, `college_btech`, `college_mba`, `college_law`, `college_medical`, `college_pharmacy`
- Competitive: `competitive_upsc`, `competitive_ssc`, `competitive_banking`, `competitive_railways`, `competitive_defence`, `competitive_state`

**Listing Types:**
- `sell`: For sale
- `rent`: For rent
- `free`: Free giveaway

**Conditions:**
- `new`: Brand new
- `like_new`: Like new condition
- `good`: Good condition
- `fair`: Fair condition
- `poor`: Poor condition

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Class 10 Mathematics Book",
    // ... other fields
  }
}
```

#### Get Listing by ID

```http
GET /api/listings/{id}
```

**Parameters:**
- `id` (path, required): Listing UUID
- `include` (query, optional): Set to `user` to include the listing owner (id, name, email, phone, verified) in the response. Without it, the response is a flat listing (no `user` object).

**Response:** `200 OK` — Without `include=user`, the response is the listing row (e.g. id, user_id, title, description, category_code, type, condition, price, images, institution_id, is_active, views, created_at, updated_at). With `include=user`, the same fields plus a nested `user` object.

#### Search Listings

Search uses **cursor-based pagination** for stable performance on large datasets.

```http
GET /api/listings/search
```

**Query Parameters:**
- `categoryCode` (optional): Filter by category
- `type` (optional): `sell`, `rent`, or `free`
- `condition` (optional): `new`, `like_new`, `good`, `fair`, `poor`
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price
- `freeOnly` (optional): `true` to show only free listings
- `radius` (optional): Radius in kilometers (requires `latitude` and `longitude`)
- `latitude` (optional): Latitude for location-based search
- `longitude` (optional): Longitude for location-based search
- `institutionId` (optional): Filter by institution
- `query` (optional): Full-text search query
- `limit` (optional): Results per page (default: 20, max: 100)
- `cursorId` (optional): Listing UUID for cursor (use with `cursorCreatedAt` for next page)
- `cursorCreatedAt` (optional): ISO timestamp of last item for next page
- `includeTotal` (optional): `true` to include total matching count (extra query; use sparingly)

**Example (first page):**
```http
GET /api/listings/search?categoryCode=school_9_10&type=sell&radius=10&latitude=28.6139&longitude=77.2090&limit=20
```

**Example (next page):** Use `nextCursor.cursorId` and `nextCursor.cursorCreatedAt` from the previous response.
```http
GET /api/listings/search?limit=20&cursorId={uuid}&cursorCreatedAt={iso-timestamp}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "listings": [ /* listing objects */ ],
    "limit": 20,
    "hasMore": true,
    "nextCursor": { "cursorId": "uuid", "cursorCreatedAt": "2024-01-01T00:00:00.000Z" },
    "total": 50
  }
}
```
`total` is only present when `includeTotal=true`. Omit it for large result sets to avoid an expensive count.

#### Get My Listings

```http
GET /api/listings/me
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)
- `isActive` (optional): Filter by active status

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "title": "My Listing",
        // ... listing fields
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

#### Update Listing

```http
PATCH /api/listings/{id}
Authorization: Bearer <access_token>
```

**Parameters:**
- `id` (path, required): Listing UUID (must be owned by user)

**Request Body:** Same as create, but all fields optional

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    // ... updated listing fields
  }
}
```

#### Delete Listing

```http
DELETE /api/listings/{id}
Authorization: Bearer <access_token>
```

**Parameters:**
- `id` (path, required): Listing UUID (must be owned by user)

**Response:** `200 OK`
```json
{
  "success": true
}
```

### Location Endpoints

#### Update User Location

```http
POST /api/location
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

#### Get Nearby Listings

```http
GET /api/location/nearby
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `radius` (optional): Radius in kilometers (default: 10, max: 100)
- `limit` (optional): Results limit (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Nearby Listing",
      "distance": 2.5, // Distance in kilometers
      // ... other listing fields
    }
  ]
}
```

### Institution Endpoints

#### Search Institutions

```http
GET /api/institutions/search
```

**Query Parameters:**
- `q` (required): Search query (min 2 characters)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Delhi Public School",
      "type": "school"
    },
    {
      "id": "uuid",
      "name": "Delhi University",
      "type": "university"
    }
  ]
}
```

### Upload Endpoints

All uploads go to AWS S3. See `S3_SETUP.md` for bucket and env configuration. Requires `Authorization: Bearer <access_token>`.

#### Upload a single listing image

```http
POST /api/upload/listings
Content-Type: multipart/form-data
```

**Body:** One file (image). Max 10MB; JPEG/PNG/WebP. Server resizes and generates a thumbnail. Returns `url` and `thumbnailUrl` to use in listing `images` array.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "url": "https://...", "thumbnailUrl": "https://..." }
}
```

#### Upload multiple listing images

```http
POST /api/upload/listings/multiple
Content-Type: multipart/form-data
```

**Body:** Up to 5 image files. Same constraints as single upload. Returns an array of `{ url, thumbnailUrl }`.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "urls": [{ "url": "https://...", "thumbnailUrl": "https://..." }, ...] }
}
```

#### Upload user avatar

```http
POST /api/upload/avatar
Content-Type: multipart/form-data
```

**Body:** One image file. Returns `url` for the user's avatar.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "url": "https://..." }
}
```

#### Delete file by S3 key

```http
DELETE /api/upload/{key}
```

**Parameters:** `key` — S3 object key (e.g. from a previously returned URL path). Use when removing an image from a listing or changing avatar.

**Response:** `200 OK` — `{ "success": true }`

## Data Models

### User

```typescript
{
  id: string; // UUID
  email: string;
  name: string;
  phone?: string;
  bio?: string;
  institutionId?: string; // UUID
  verified: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### Listing

```typescript
{
  id: string; // UUID
  userId: string; // UUID
  title: string;
  description?: string;
  category: string; // Category code
  type: "sell" | "rent" | "free";
  condition?: "new" | "like_new" | "good" | "fair" | "poor";
  price?: number; // Required for sell/rent
  images: string[]; // Array of image URLs
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  institutionId?: string; // UUID
  isActive: boolean;
  views: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

## Examples

### Complete Flow Example

```javascript
// 1. Register
const registerResponse = await fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'student@example.com',
    password: 'SecurePass123',
    name: 'John Doe',
    phone: '+1234567890'
  })
});
const { data: { accessToken, refreshToken } } = await registerResponse.json();

// 2. Update location
await fetch('http://localhost:3001/api/location', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    latitude: 28.6139,
    longitude: 77.2090
  })
});

// 3. Create listing
const listingResponse = await fetch('http://localhost:3001/api/listings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    title: 'Class 10 Mathematics Book',
    description: 'NCERT Mathematics textbook',
    categoryCode: 'school_9_10',
    type: 'sell',
    condition: 'good',
    price: 200,
    images: ['https://example.com/image.jpg'],
    latitude: 28.6139,
    longitude: 77.2090
  })
});

// 4. Search listings
const searchResponse = await fetch(
  'http://localhost:3001/api/listings/search?categoryCode=school_9_10&radius=10&latitude=28.6139&longitude=77.2090',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);
const { data: { listings } } = await searchResponse.json();

// 5. Refresh token when expired
const refreshResponse = await fetch('http://localhost:3001/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});
const { data: { accessToken: newAccessToken } } = await refreshResponse.json();
```

## Support

For API support, contact: support@educycle.com

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Authentication endpoints
- User management
- Listing CRUD operations
- Location-based search
- Institution search
