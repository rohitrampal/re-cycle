# EduCycle API Documentation

## Quick Links

- **OpenAPI Spec**: [`apps/api/docs/openapi.yaml`](apps/api/docs/openapi.yaml)
- **Markdown Docs**: [`apps/api/docs/API.md`](apps/api/docs/API.md)
- **Swagger UI**: Run `npm run docs:serve` in `apps/api` directory

## Overview

The EduCycle API provides endpoints for:

- ✅ User authentication and management
- ✅ Creating and managing listings (books, notes)
- ✅ Location-based search using PostGIS
- ✅ Institution-based filtering
- ✅ Full-text search
- ✅ Multi-language support

## Quick Start

### 1. View Documentation

**Option A: Swagger UI (Interactive)**
```bash
cd apps/api
npm run docs:serve
# Open http://localhost:3000
```

**Option B: Markdown**
```bash
# Open apps/api/docs/API.md
```

**Option C: Online**
- Copy `apps/api/docs/openapi.yaml` to https://editor.swagger.io/

### 2. Test API

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'

# Get listings (with token)
curl http://localhost:3001/api/listings/search \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users/{id}` - Get user profile
- `PATCH /api/users/me` - Update own profile

### Listings
- `POST /api/listings` - Create listing
- `GET /api/listings/{id}` - Get listing details
- `PATCH /api/listings/{id}` - Update listing (owner only)
- `DELETE /api/listings/{id}` - Delete listing (owner only)
- `GET /api/listings/search` - Search listings
- `GET /api/listings/me` - Get my listings

### Location
- `POST /api/location` - Update user location
- `GET /api/location/nearby` - Get nearby listings

### Institutions
- `GET /api/institutions/search` - Search institutions

## Authentication Flow

```
1. Register → Get accessToken + refreshToken
2. Use accessToken in Authorization header
3. When accessToken expires → Use refreshToken to get new accessToken
4. RefreshToken expires after 7 days → User must login again
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

## Rate Limits

- **General**: 100 requests/minute
- **Auth**: 5 requests/15 minutes
- **Search**: 30 requests/minute

## Data Models

See [`apps/api/docs/API.md`](apps/api/docs/API.md) for complete data models and examples.

## Integration Examples

### JavaScript/TypeScript

```typescript
const API_BASE = 'http://localhost:3001/api';

// Register
const register = async () => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'SecurePass123',
      name: 'John Doe'
    })
  });
  return res.json();
};

// Login
const login = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const { data } = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  return data;
};

// Authenticated request
const getListings = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_BASE}/listings/search`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return res.json();
};
```

### Python

```python
import requests

API_BASE = "http://localhost:3001/api"

# Register
def register(email, password, name):
    response = requests.post(
        f"{API_BASE}/auth/register",
        json={"email": email, "password": password, "name": name}
    )
    return response.json()

# Login
def login(email, password):
    response = requests.post(
        f"{API_BASE}/auth/login",
        json={"email": email, "password": password}
    )
    data = response.json()["data"]
    return data["accessToken"]

# Authenticated request
def get_listings(access_token):
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(f"{API_BASE}/listings/search", headers=headers)
    return response.json()
```

## Support

- **Documentation**: See `apps/api/docs/` directory
- **Issues**: Report API issues in project repository
- **Email**: support@educycle.com

## Version

Current API Version: **v1.0.0**
