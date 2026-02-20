# API Documentation

This directory contains the API documentation for EduCycle.

## Files

- **`openapi.yaml`**: OpenAPI 3.0 specification (Swagger)
- **`API.md`**: Comprehensive markdown API documentation

## Viewing Documentation

### Option 1: Swagger UI (Recommended)

1. Install Swagger UI:
   ```bash
   npm install -g swagger-ui-serve
   ```

2. Serve the OpenAPI spec:
   ```bash
   swagger-ui-serve apps/api/docs/openapi.yaml
   ```

3. Open browser to `http://localhost:3000`

### Option 2: Online Swagger Editor

1. Go to https://editor.swagger.io/
2. Copy contents of `openapi.yaml`
3. Paste into the editor

### Option 3: Markdown Documentation

Simply open `API.md` in any markdown viewer or GitHub.

## Integrating Swagger UI in Fastify

To add Swagger UI to your Fastify server:

```bash
npm install @fastify/swagger @fastify/swagger-ui
```

Then add to `server.ts`:

```typescript
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

// Register Swagger
server.register(swagger, {
  openapi: {
    info: {
      title: 'EduCycle API',
      version: '1.0.0',
    },
  },
});

server.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
});
```

Access Swagger UI at: `http://localhost:3001/docs`

## Updating Documentation

When adding new endpoints:

1. Update `openapi.yaml` with new endpoint definition
2. Update `API.md` with endpoint documentation
3. Ensure examples are accurate
4. Test endpoints match documentation

## Documentation Standards

- All endpoints must be documented
- Request/response examples must be provided
- Error responses must be documented
- Authentication requirements must be clear
- Rate limits must be specified
