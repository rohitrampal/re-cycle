# EduCycle - Academic Resource Exchange Platform

A platform for students to exchange academic resources (books, notes) with location-based discovery.

## Tech Stack

### Frontend
- React 18+ with Vite
- TypeScript
- Zustand (State Management)
- React Query (Data Fetching)
- Axios (HTTP Client)
- Zod (Validation)
- Shadcn/ui (UI Components)
- React i18next (Internationalization)
- 12 Languages Supported

### Backend
- Fastify (Web Framework)
- TypeScript
- PostgreSQL + PostGIS (Spatial Database)
- JWT Authentication
- Rate Limiting
- Security Best Practices (OWASP)

## Project Structure

```
ReCycle/
├── apps/
│   ├── web/          # React + Vite Frontend
│   └── api/          # Fastify Backend
├── packages/
│   ├── shared/       # Shared types and utilities
│   └── database/     # Database schemas and migrations
└── package.json      # Monorepo root
```

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 14.0 with PostGIS extension
- npm >= 9.0.0

### Installation

```bash
npm install
```

### Development

```bash
# Run both frontend and backend
npm run dev

# Run individually
npm run dev:frontend
npm run dev:backend
```

## Environment Variables

See `.env.example` files in respective apps for required environment variables.

## Production & Deployment

- **[Production Security Checklist](docs/PRODUCTION_SECURITY.md)** – Hardening, secrets, and security checklist before going live.
- **[Deployment Options](docs/DEPLOYMENT.md)** – Ways to deploy from free tier (single VPS, PaaS) to cloud-native and Kubernetes.

## License

MIT
