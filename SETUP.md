# EduCycle Setup Guide

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose (recommended) OR PostgreSQL >= 14.0 with PostGIS extension
- Redis (optional, for caching)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

#### Option A: Using Docker (Recommended)

Start PostgreSQL and Redis using Docker Compose:

```bash
# Start database and Redis services
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs if needed
docker-compose logs postgres
docker-compose logs redis
```

The Docker setup includes:
- PostgreSQL 15 with PostGIS 3.4 extension
- Redis 7
- Automatic database creation (`educycle`)
- Data persistence via Docker volumes

**Default credentials** (update in `docker-compose.yml` for production):
- Database: `educycle`
- User: `postgres`
- Password: `postgres`
- Port: `5432`

**Update your `.env` file** (`apps/api/.env`):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=educycle
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

REDIS_HOST=localhost
REDIS_PORT=6379
```

**Stop services**:
```bash
docker-compose down
```

**Stop and remove volumes** (⚠️ deletes all data):
```bash
docker-compose down -v
```

#### Option B: Manual PostgreSQL Setup

Install PostGIS Extension:

```sql
-- Connect to PostgreSQL and run:
CREATE EXTENSION IF NOT EXISTS postgis;
```

Create Database:

```sql
CREATE DATABASE educycle;
\c educycle
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 3. Run Migrations

```bash
cd apps/api
npm run db:migrate
```

Or manually run the SQL files in `apps/api/src/database/migrations/` in order.

**Note**: If using Docker, the PostGIS extension is automatically enabled. The migration script will handle creating the extension if it doesn't exist.

### 4. Environment Configuration

#### Backend (.env)

Copy `apps/api/.env.example` to `apps/api/.env` and update:

```bash
cp apps/api/.env.example apps/api/.env
```

Update the following:
- `DB_PASSWORD`: Your PostgreSQL password
- `JWT_SECRET`: Generate a secure random string
- `COOKIE_SECRET`: Generate a secure random string

#### Frontend (.env)

Copy `apps/web/.env.example` to `apps/web/.env`:

```bash
cp apps/web/.env.example apps/web/.env
```

### 5. Generate JWT Secrets

```bash
# Generate secure random strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use this output for `JWT_SECRET` and `COOKIE_SECRET` in your `.env` file.

### 6. Google Location Services (Optional)

For geocoding addresses and place search functionality, configure Google Maps API:

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Geocoding API** and **Places API**
3. Add to `apps/api/.env`:
   ```env
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

**Note**: Google Location services are optional. The application works without them, but geocoding features will be disabled.

See `apps/api/GOOGLE_LOCATION_SETUP.md` for detailed setup instructions and API documentation.

## Development

### Run Both Frontend and Backend

```bash
npm run dev
```

### Run Individually

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

### Build for Production

```bash
npm run build
```

## Project Structure

```
ReCycle/
├── apps/
│   ├── web/              # React + Vite Frontend
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── pages/        # Page components
│   │   │   ├── lib/          # Utilities, API client
│   │   │   ├── store/        # Zustand stores
│   │   │   └── i18n/         # Internationalization
│   │   └── package.json
│   └── api/              # Fastify Backend
│       ├── src/
│       │   ├── routes/       # API routes
│       │   ├── database/     # DB connection & migrations
│       │   ├── utils/        # Utility functions
│       │   └── config.ts      # Configuration
│       └── package.json
├── packages/
│   └── shared/           # Shared types & utilities
└── package.json          # Monorepo root
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/refresh` - Refresh access token

### Users
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/me` - Update own profile (protected)

### Listings
- `POST /api/listings` - Create listing (protected)
- `GET /api/listings/:id` - Get listing details
- `GET /api/listings/search` - Search listings
- `GET /api/listings/me` - Get my listings (protected)

### Location
- `POST /api/location` - Update user location (protected)
- `GET /api/location/nearby` - Get nearby listings (protected)

### Institutions
- `GET /api/institutions/search` - Search institutions

## Database Schema

Key tables:
- `users` - User accounts with PostGIS location
- `listings` - Book/note listings with PostGIS location
- `institutions` - Schools/colleges with PostGIS location
- `categories` - Listing categories
- `refresh_tokens` - JWT refresh token management
- `contact_logs` - Track listing views/contacts

## Security Features

- Helmet.js for security headers
- Rate limiting (100 requests/minute)
- JWT authentication with refresh tokens
- HTTP-only cookies for refresh tokens
- Password hashing with bcrypt
- CORS configuration
- Input validation with Zod
- SQL injection prevention (parameterized queries)

## Performance Optimizations

- PostGIS spatial indexes for location queries
- Database connection pooling
- React Query for client-side caching
- Code splitting in Vite build
- Image optimization (Sharp for backend)
- Redis caching (optional)

## Multi-language Support

12 languages supported:
- English (en)
- Hindi (hi)
- Marathi (mr)
- Gujarati (gu)
- Punjabi (pa)
- Urdu (ur)
- Bengali (bn)
- Telugu (te)
- Tamil (ta)
- Kannada (kn)
- Odia (or)
- Malayalam (ml)

Language files are in `apps/web/src/i18n/locales/`.

## Troubleshooting

### Database Connection Issues

**Using Docker:**
1. Ensure Docker containers are running: `docker-compose ps`
2. Check container logs: `docker-compose logs postgres`
3. Verify database credentials in `.env` match `docker-compose.yml`
4. Try restarting containers: `docker-compose restart postgres`

**Using Manual PostgreSQL:**
1. Ensure PostgreSQL is running
2. Check PostGIS extension is installed
3. Verify database credentials in `.env`
4. Check if database exists: `psql -l | grep educycle`

### Port Already in Use

Change ports in:
- Backend: `apps/api/.env` → `PORT`
- Frontend: `apps/web/vite.config.ts` → `server.port`

### PostGIS Errors

Ensure PostGIS extension is enabled:
```sql
\c educycle
CREATE EXTENSION IF NOT EXISTS postgis;
SELECT PostGIS_version();
```

## Next Steps

1. Implement full listing creation form
2. Add image upload functionality
3. Implement search with PostGIS spatial queries
4. Add user profile pages
5. Implement contact functionality
6. Add map integration (Leaflet)
7. Add email/SMS notifications
8. Implement rating & review system
