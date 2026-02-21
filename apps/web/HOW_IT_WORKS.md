# ReCycle Web – How It Works

This document describes how the ReCycle frontend works and how it fits into the project.

## Overview

The **ReCycle** web app is a React (Vite) single-page application for listing and discovering educational materials (books, notes) by category—school, college, and competitive exams. Users can register, create listings, browse/search, and view listing details.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** for build and dev server
- **React Router** for routes
- **Zustand** for client state (auth, UI preferences)
- **TanStack Query** for server state (optional, for caching API responses)
- **Axios** for API calls via `@/lib/api/client` and `@/lib/api/endpoints`
- **i18next** for translations (multiple Indian languages)
- **Tailwind CSS** + **shadcn-style** UI components
- **Framer Motion** for animations
- Shared types and constants from **`@recycle/shared`**

## Project Structure

```
apps/web/src/
├── App.tsx                 # Routes and layout wrapper
├── main.tsx
├── components/
│   ├── layout/             # AppLayout, Navbar, Sidebar
│   ├── ui/                 # Button, Input, Card, Label, Sheet, etc.
│   ├── ErrorBoundary.tsx
│   ├── PageLoader.tsx
│   └── theme-provider.tsx
├── lib/
│   ├── api/                # client.ts, endpoints.ts
│   ├── validation.ts       # Phone (digits-only), non-negative number helpers
│   ├── listing-categories.ts  # All listing categories for dropdowns
│   ├── react-query.ts
│   └── utils.ts
├── pages/
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Browse.tsx
│   ├── CreateListing.tsx
│   ├── ListingDetail.tsx
│   └── Profile.tsx
├── store/
│   ├── auth-store.ts       # User, tokens, isAuthenticated
│   └── ui-store.ts         # Language, theme, sidebar open state
└── i18n/
    ├── config.ts
    └── locales/            # en, hi, mr, gu, bn, etc.
```

## Authentication Flow

1. **Register** (`/register`): User submits name, email, password, optional phone. Phone is validated to allow only numbers (optional leading `+`). On success, `auth-store` gets user + tokens; user is redirected to `/`.
2. **Login** (`/login`): Email + password; same store update and redirect.
3. **Persistence**: Tokens are stored (e.g. in `localStorage`). On load, `App.tsx` can call `authApi.me()` to restore session.
4. **Protected routes**: `/create` and `/profile` render only when `isAuthenticated`; otherwise redirect to `/login`.
5. **Logout**: Clears store and tokens; user goes to home or login.

API calls use the shared Axios client that attaches the access token and can refresh using the refresh token.

## Listing Flow

- **Create listing** (`/create`): User must be logged in. Form includes title, description, **category** (dropdown of all categories from `listing-categories.ts`), type (sell/rent/free), condition, **price** (validated so it is never less than 0), and later images/location. Data is sent via `listingApi.create()`.
- **Browse** (`/browse`): Search and filters (category, price range, etc.). Numeric filters (min price, max price, radius) should be validated so they are never less than 0.
- **Listing detail** (`/listing/:id`): Fetches one listing with owner info; contact owner action can use owner phone/email.

Categories are defined in `@recycle/shared` as `ListingCategory` and mirrored in `src/lib/listing-categories.ts` with i18n label keys so the create form shows a single dropdown of all categories.

## Validation Rules

- **Phone (registration)**: If provided, only digits are allowed (optional leading `+`). Implemented in `lib/validation.ts` and used in `Register.tsx`.
- **Numeric fields**: Any field that must be a number (price, min price, max price, radius, quantity, etc.) is validated so the value is never less than 0. Helpers: `ensureNonNegative`, `isNonNegative` in `lib/validation.ts`. Used in CreateListing for price and should be used wherever such inputs exist (e.g. browse filters).

## API Integration

- Base URL and interceptors are in `lib/api/client.ts`.
- All endpoints are in `lib/api/endpoints.ts`: auth, user, listing, location, institution. They return `ApiResponse<T>` and use types from `@recycle/shared`.

## Internationalisation (i18n)

- Language is stored in `ui-store` and applied via `i18n.changeLanguage()` in `App.tsx`.
- Translation keys live in `i18n/locales/*.json`. Listing category labels use `listing.categories.<key>`.

## Running the App

- Install: `pnpm install` (from repo root or `apps/web`).
- Dev: `pnpm dev` (from repo root: `pnpm --filter @recycle/web dev`).
- Build: `pnpm build` (or filter `@recycle/web build`).

The API must be running (e.g. `apps/api`) and CORS/base URL configured so the web app can call it.
