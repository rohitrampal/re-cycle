# Frontend CSRF Token Integration Guide

## Quick Start

Your backend now requires CSRF tokens for all state-changing requests (POST, PUT, PATCH, DELETE).

## Implementation

### Step 1: Update API Client

Add CSRF token to your API client (e.g., `apps/web/src/lib/api/client.ts`):

```typescript
import axios from 'axios';

// Helper to get CSRF token from cookie
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null; // SSR check
  const cookies = document.cookie.split('; ');
  const csrfCookie = cookies.find(row => row.startsWith('XSRF-TOKEN='));
  return csrfCookie?.split('=')[1] || null;
}

// Add CSRF token to all state-changing requests
axios.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();
  
  // Only add CSRF token for state-changing methods
  if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
    const token = getCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  
  return config;
});
```

### Step 2: Handle Refresh Token Rotation

Update your refresh token logic to handle the new token:

```typescript
// In your auth store or API client
async function refreshAccessToken() {
  try {
    const response = await axios.post('/api/auth/refresh');
    
    const { accessToken, refreshToken } = response.data.data;
    
    // ✅ IMPORTANT: Update refresh token if new one is returned
    if (refreshToken) {
      // Update your token storage
      localStorage.setItem('refreshToken', refreshToken);
      // Or update your auth store
      // authStore.setRefreshToken(refreshToken);
    }
    
    return accessToken;
  } catch (error) {
    // Handle error
    throw error;
  }
}
```

## How It Works

1. **Backend sets CSRF cookie** on GET requests automatically
2. **Frontend reads cookie** and sends in header
3. **Backend validates** cookie matches header token
4. **Request proceeds** if validation passes

## Exempt Endpoints

These endpoints **don't require** CSRF tokens:
- `/api/auth/*` (login, register, refresh, logout)

All other endpoints **require** CSRF tokens.

## Testing

```typescript
// Test CSRF protection
// This should work (with CSRF token)
const response = await axios.post('/api/listings', {
  title: 'Test Listing',
  // ... other fields
});

// This will fail (no CSRF token)
const response = await axios.post('/api/listings', {
  title: 'Test Listing',
}, {
  headers: {
    'X-CSRF-Token': '' // Empty or missing token
  }
});
```

## Troubleshooting

**Error: "CSRF token required"**
- Make sure you're sending `X-CSRF-Token` header
- Check that `XSRF-TOKEN` cookie exists (make a GET request first)

**Error: "Invalid CSRF token"**
- Token in header must match token in cookie
- Make sure you're reading the cookie correctly

**Error: "Invalid refresh token"**
- Old refresh token was rotated
- Use the new refresh token from previous refresh response

## Browser Compatibility

- ✅ All modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Cookies are automatically sent with requests
- ✅ JavaScript can read cookies via `document.cookie`

## Security Notes

- CSRF tokens are **cryptographically secure** (32 random bytes)
- Tokens are **rotated** on each refresh
- Tokens expire after **24 hours**
- Tokens use **constant-time comparison** (prevents timing attacks)
