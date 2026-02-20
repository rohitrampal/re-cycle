# Production Readiness

## Required for production

1. **Environment**
   - Set `NODE_ENV=production`.
   - Set `JWT_SECRET` and `COOKIE_SECRET` to strong random values (not the default `change-me-in-production`). The server will refuse to start if they are default in production.
   - Configure `CORS_ORIGIN` to your frontend origin(s). Comma-separate multiple origins. These are also used for CSRF (Origin/Referer validation on state-changing requests).

2. **Database**
   - Run all migrations: `npm run db:migrate` (includes 005 for notifications and ratings).
   - Use a dedicated DB user with least privilege.

3. **CSRF**
   - State-changing requests (POST/PUT/PATCH/DELETE) are validated: when the client sends an `Origin` or `Referer` header, it must match one of the allowed origins from `CORS_ORIGIN`. Same-origin requests from your SPA are allowed.

4. **Logging**
   - Each request gets a correlation ID (`X-Correlation-Id`). Use structured logging (Pino); errors are serialized with message and stack.
   - In production, consider logging to a file or a log aggregator (e.g. JSON to stdout and ship with an agent).

5. **Metrics**
   - `/metrics` is available for health and basic stats. To protect it in production, set `METRICS_API_KEY` and call `/metrics?key=<METRICS_API_KEY>`.

## Features added for production

- **CSRF**: Origin/Referer check for non-GET requests.
- **Notifications**: When a listing is created, users who have a matching search alert (category/type, location within radius) receive an in-app notification. Endpoints: `GET/POST/DELETE /api/search-alerts`, `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`.
- **Rating**: `POST /api/listings/:id/rate` (score 1–5, optional comment), `GET /api/listings/:id/rating` (summary + list). One rating per user per listing.
- **Structured logging**: Request-scoped child logger with `requestId`; error serializer for stack traces.
- **Config validation**: Production startup requires non-default JWT and cookie secrets.
