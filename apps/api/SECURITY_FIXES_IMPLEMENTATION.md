# Security Fixes Implementation Guide

## P0 Critical Fixes

### Fix 1: Refresh Token Rotation

**File:** `apps/api/src/routes/auth.ts`

**Current Code (Line 188-230):**
```typescript
fastify.post('/refresh', async (request, reply) => {
  const userId = await validateRefreshToken(token);
  const accessToken = fastify.jwt.sign({ id: userId }, { expiresIn: '15m' });
  return { success: true, data: { accessToken } };
  // ❌ Same refresh token reused
});
```

**Fixed Code:**
```typescript
fastify.post('/refresh', async (request, reply) => {
  const { refreshToken } = request.body as { refreshToken?: string };
  const token = refreshToken || request.cookies.refreshToken;

  if (!token) {
    return reply.code(401).send({
      success: false,
      error: { code: 'NO_TOKEN', message: 'Refresh token required' },
    });
  }

  const userId = await validateRefreshToken(token);
  if (!userId) {
    return reply.code(401).send({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or revoked refresh token' },
    });
  }

  try {
    const decoded = fastify.jwt.verify(token) as { id: string; exp: number };
    const expiresAt = new Date(decoded.exp * 1000);

    // ✅ Revoke old refresh token
    await revokeRefreshToken(token, userId, expiresAt);

    // ✅ Generate new access token
    const accessToken = fastify.jwt.sign(
      { id: userId },
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    // ✅ Generate NEW refresh token
    const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    const newRefreshToken = fastify.jwt.sign(
      { id: userId },
      { expiresIn: refreshExpiresIn }
    );

    // ✅ Store new refresh token
    await storeRefreshToken(userId, newRefreshToken, refreshExpiresIn);

    // ✅ Set new refresh token in cookie
    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // ✅ Always strict
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken, // ✅ Return new token
      },
    };
  } catch {
    return reply.code(401).send({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
    });
  }
});
```

---

### Fix 2: Proper CSRF Protection

**File:** `apps/api/src/plugins/csrf.ts`

**Current Code:**
```typescript
fastify.addHook('onRequest', async (request, reply) => {
  if (!STATE_CHANGING_METHODS.has(request.method)) return;
  const origin = getRequestOrigin(request);
  if (!origin) {
    return; // ❌ Allows same-origin bypass
  }
  // Only checks Origin header
});
```

**Fixed Code - Option A: Double Submit Cookie Pattern**

**Step 1:** Create CSRF token utility (`apps/api/src/utils/csrf.ts`):
```typescript
import crypto from 'crypto';

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCsrfToken(token: string, cookieToken: string): boolean {
  return token === cookieToken && token.length === 64;
}
```

**Step 2:** Update CSRF plugin (`apps/api/src/plugins/csrf.ts`):
```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateCsrfToken, validateCsrfToken } from '../utils/csrf';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

export default async function csrfPlugin(
  fastify: FastifyInstance,
  opts: { allowedOrigins: string[] }
): Promise<void> {
  const allowed = new Set(opts.allowedOrigins.map((o) => o.toLowerCase()));

  // Set CSRF token cookie on GET requests
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method === 'GET' && !request.cookies[CSRF_COOKIE_NAME]) {
      const token = generateCsrfToken();
      reply.setCookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
    }
  });

  // Validate CSRF token on state-changing requests
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!STATE_CHANGING_METHODS.has(request.method)) return;

    // Skip CSRF check for auth endpoints (they have their own protection)
    if (request.url.startsWith('/api/auth/')) return;

    const cookieToken = request.cookies[CSRF_COOKIE_NAME];
    const headerToken = request.headers[CSRF_HEADER_NAME.toLowerCase()] as string;

    // ✅ Require both cookie and header token
    if (!cookieToken || !headerToken) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token required',
        },
      });
    }

    // ✅ Validate tokens match
    if (!validateCsrfToken(headerToken, cookieToken)) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token',
        },
      });
    }

    // ✅ Also validate Origin header
    const origin = getRequestOrigin(request);
    if (origin && !allowed.has(origin.toLowerCase())) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'CSRF_INVALID_ORIGIN',
          message: 'Request origin not allowed',
        },
      });
    }
  });
}

function getRequestOrigin(req: FastifyRequest): string | null {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin) return origin;
  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
}
```

**Step 3:** Frontend must send CSRF token in header:
```typescript
// In your API client
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('XSRF-TOKEN='))
  ?.split('=')[1];

axios.defaults.headers.common['X-CSRF-Token'] = csrfToken;
```

---

### Fix 3: Error Message Sanitization

**File:** `apps/api/src/plugins/error-handler.ts`

**Current Code:**
```typescript
if (error.validation) {
  reply.code(400).send({
    error: {
      details: error.validation, // ❌ Exposes full details
    },
  });
}
```

**Fixed Code:**
```typescript
if (error.validation) {
  reply.code(400).send({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      // ✅ Only expose details in development
      details: config.isProduction ? undefined : error.validation,
    },
  });
  return;
}
```

---

### Fix 4: Cookie SameSite Always Strict

**File:** `apps/api/src/routes/auth.ts`

**Current Code:**
```typescript
sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
```

**Fixed Code:**
```typescript
sameSite: 'strict', // ✅ Always strict for refresh tokens
```

Apply this fix in:
- Line 70 (register endpoint)
- Line 159 (login endpoint)
- CSRF cookie (if implemented)

---

## P1 High Priority Fixes

### Fix 5: Revoke Old Tokens on New Login

**File:** `apps/api/src/routes/auth.ts`

**Add after line 153:**
```typescript
// ✅ Revoke all existing refresh tokens (optional - user choice)
// Uncomment if you want single-device login:
// await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);

// Or implement device tracking for multi-device support
```

---

### Fix 6: Comprehensive Input Length Limits

**File:** `apps/api/src/schemas/*.ts`

**Example for user schema:**
```typescript
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(255), // ✅ Add max length
    password: z.string().min(8).max(128), // ✅ Add max length
    name: z.string().min(2).max(255), // ✅ Add max length
    phone: z.string().max(20).optional(), // ✅ Add max length
  }),
});
```

Apply to all schemas.

---

## P2 Medium Priority Fixes

### Fix 7: Request ID Tracking

**File:** `apps/api/src/plugins/request-logger.ts`

**Add:**
```typescript
import crypto from 'crypto';

fastify.addHook('onRequest', async (request, reply) => {
  request.id = crypto.randomUUID();
  reply.header('X-Request-ID', request.id);
  fastify.log.info({ requestId: request.id, method: request.method, url: request.url });
});
```

---

### Fix 8: IP-Based Rate Limiting

**File:** `apps/api/src/utils/route-rate-limit.ts` (create new)

```typescript
import { FastifyRequest } from 'fastify';
import { checkRouteRateLimit } from './route-rate-limit';

export function getClientIp(request: FastifyRequest): string {
  return (
    (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (request.headers['x-real-ip'] as string) ||
    request.socket.remoteAddress ||
    'unknown'
  );
}

export async function checkIpRateLimit(
  request: FastifyRequest,
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const ip = getClientIp(request);
  return checkRouteRateLimit(`${key}:ip:${ip}`, max, windowMs);
}
```

---

## Testing Checklist

After implementing fixes:

- [ ] Test refresh token rotation (old token should be invalid after refresh)
- [ ] Test CSRF protection (requests without token should fail)
- [ ] Test error messages (production should hide details)
- [ ] Test cookie security (SameSite=strict)
- [ ] Run security scan (OWASP ZAP)
- [ ] Test rate limiting (IP-based)
- [ ] Verify request IDs in logs

---

## Deployment Notes

1. **Breaking Change:** CSRF protection requires frontend changes
2. **Migration:** Existing refresh tokens will work until expired (7 days)
3. **Monitoring:** Watch for increased 403 errors after CSRF implementation
4. **Rollback Plan:** Keep old code commented for quick rollback if needed
