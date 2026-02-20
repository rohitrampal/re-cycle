# Backend Review (Senior Engineer Perspective)

Review against docs: `IMPROVEMENTS_IMPLEMENTED.md`, `SECURITY_REVIEW.md`, `SETUP.md`, `docs/API.md`, `S3_SETUP.md`, `.env.example`.

---

## What’s in good shape

- **Security**: Parameterized queries, refresh token storage + blacklist, brute-force protection (login attempts), rate limiting (auth/search/general), Helmet, CORS, JWT + HTTP-only cookie, error reporter hook for Sentry.
- **Resilience**: DB circuit breaker, connection retry, query timeouts, graceful shutdown, health + metrics.
- **Observability**: Request logging with correlation ID, slow-request warning, `/health`, `/metrics` (pool, circuit breaker, cache backend, request/error counts).
- **Data layer**: PostGIS for location/nearby and search; cursor-based search pagination; optional Redis cache with in-memory fallback; listing get/delete/update invalidate cache.
- **API surface**: Auth (register/login/refresh/logout/me), users (get, patch me), listings (create/get/search/me/update/delete), location (update, nearby), institutions (search), upload (S3 listing images + avatar, delete by key). Validation (Zod), shared `authenticate`/`authorize` middleware.
- **Listings**: Create uses `listingService.create`; GET /me uses DB with page/limit/isActive and pagination; PATCH uses dynamic parameterized UPDATE and cache invalidation; DELETE implemented.

---

## What’s left according to the docs

### 1. From IMPROVEMENTS_IMPLEMENTED.md

- **Optional / future (not required for MVP)**  
  - Sentry: wire `registerErrorReporter()` in `server.ts` with `@sentry/node`.  
  - Per-route EXPLAIN in dev: e.g. `LOG_SQL_EXPLAIN=1` and a helper to log `EXPLAIN ANALYZE` for selected queries.

### 2. From SECURITY_REVIEW.md

- **CSRF**: Not implemented. Acceptable for API-only + same-origin or trusted SPA; add CSRF (e.g. double-submit cookie or SameSite + origin check) if you add cookie-based or form-based flows from other origins.
- **Cookie SameSite**: Currently `lax`. Doc suggested `strict` in production; consider `strict` for refresh cookie in production if all clients are same-site.
- **Body size limit**: Multipart is 10MB/5 files; Fastify’s default JSON body limit applies. Consider setting an explicit `bodyLimit` (e.g. 1MB) in Fastify options for JSON to avoid large payloads.
- **Security headers**: Helmet is registered; tune CSP/imgSrc if you need more domains.

### 3. From SETUP.md “Next Steps”

- Backend-relevant items are largely done (search with PostGIS, image upload via S3).  
- Remaining are product/UX: full listing form (FE), profile pages (FE), contact flow, map (FE), email/SMS, ratings. Backend can add later: contact logging endpoint, notifications pipeline, ratings schema + endpoints.

### 4. From API.md / OpenAPI

- **Search response**: Docs show `page` and `total`; implementation uses cursor pagination (`nextCursor`, `hasMore`, no `total`). Either update the docs to describe cursor-based search or add an optional `total` count (expensive at scale).
- **Upload endpoints**: Not described in `API.md`. Add a short “Upload” section for `POST /api/upload/listings/multiple`, `POST /api/upload/avatar`, `DELETE /api/upload/:key` (and document S3 usage per `S3_SETUP.md`).
- **GET /listings/:id**: Doc shows nested `user`; current implementation returns flat listing (no user join). Either document current shape or add optional `?include=user` and join when requested.

### 5. From S3_SETUP.md

- S3 is required; server validates config at startup. No backend gaps; ensure `.env` matches `.env.example` and S3_SETUP steps are followed.

---

## Doc vs implementation (short)

| Area              | Doc says                         | Implementation                          | Action |
|-------------------|-----------------------------------|-----------------------------------------|--------|
| Search pagination | Cursor + optional total          | Cursor + `includeTotal` for total        | Done |
| GET listing by ID | Includes `user`                  | `?include=user` returns nested user     | Done |
| Upload            | —                                | Routes exist                            | Documented in API.md + OpenAPI |
| Listings create   | Full body → 201 + listing         | Implemented via listingService         | Done |
| Listings /me      | Pagination + data                | Implemented with page/limit/total       | Done |
| Listings PATCH    | Partial body → 200 + listing     | Implemented, cache invalidation        | Done |

---

## Recommended next steps (priority)

1. **Docs** — **Done**  
   - API.md and OpenAPI updated for cursor-based search (`cursorId`, `cursorCreatedAt`, `includeTotal`), upload endpoints (POST listings, listings/multiple, avatar, DELETE `:key`), GET listing (`include=user` for nested user).

2. **Hardening** — **Done**  
   - Fastify `bodyLimit: 1MB` set.  
   - Refresh cookie `sameSite: 'strict'` in production, `'lax'` in development.

3. **Product features (when needed)**  
   - Contact: persist contact logs (table exists), expose endpoint if needed.  
   - Notifications: email/SMS pipeline (e.g. queue + worker).  
   - Ratings: migration + endpoints for listing/user ratings.

4. **Optional**  
   - Sentry (or similar) via `registerErrorReporter()`.  
   - Dev-only EXPLAIN logging for heavy/spatial queries.

---

## Summary

Backend is in good shape for an MVP: auth, listings CRUD, search (with cursor), location/nearby, institutions, S3 uploads, security and resilience measures in place. What’s left per docs is mainly: align documentation with behavior (search pagination, listing by ID, uploads), a few security tweaks (body limit, cookie SameSite), and optional/future work (Sentry, EXPLAIN, CSRF if needed). Product roadmap items (contact, notifications, ratings) are the next layer once docs and hardening are done.
