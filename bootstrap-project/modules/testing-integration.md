# Module: testing-integration

Integration tests against real DB + cache + HTTP stack. Always loaded.

## Why a separate tier

Unit tests catch logic errors; integration tests catch **wiring** errors — wrong indexes, wrong middleware order, schema drift, transaction boundaries, real connection pool behaviour. Mocking the DB is explicitly forbidden here (mocked tests passing while a migration breaks prod is a real failure mode).

## Inputs

- `db` — MongoDB / Postgres / MySQL (drives Testcontainers image choice)
- `cache` — Redis / none
- `backend_runtime` — Node-only for now

## What "integration" means here

- **Real DB, real cache, real HTTP** — spun up via Testcontainers or compose-test
- **One or more components composed end-to-end** within the backend repo (controller → service → DB → response)
- **No mocks for I/O** — only outbound external services (e.g. third-party payment) are stubbed
- **Test data is isolated** — each test (or each suite) uses a fresh DB or namespaced collections

## Backend setup (Node + Vitest + Testcontainers)

### Compose-test alternative

For lighter weight, `<project>-core/docker-compose.test.yml` can spin Mongo + Redis once for the whole suite. CI uses this; local dev uses either compose or Testcontainers.

### File layout

```
src/services/__integration__/user-service.int.test.ts
src/routes/__integration__/users.int.test.ts
src/__integration__/helpers/{db.ts, http.ts}
```

### Vitest integration config (`vitest.integration.config.ts`)

```ts
export default defineConfig({
  test: {
    include: ['src/**/__integration__/**/*.int.test.ts'],
    setupFiles: ['src/__integration__/helpers/setup.ts'],
    globalSetup: ['src/__integration__/helpers/global-setup.ts'],
    testTimeout: 30_000,
    pool: 'forks',                  // each test file gets isolated process
    poolOptions: { forks: { singleFork: true } },
  },
});
```

### Global setup pattern (Testcontainers)

```ts
// global-setup.ts
import { GenericContainer } from 'testcontainers';

export async function setup() {
  const mongo = await new GenericContainer('mongo:7').withExposedPorts(27017).start();
  process.env.MONGODB_URI = `mongodb://${mongo.getHost()}:${mongo.getMappedPort(27017)}/test`;

  const redis = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();
  process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;

  return async () => { await mongo.stop(); await redis.stop(); };
}
```

### Per-test isolation

- Each test imports a `seed()` helper that wipes + reseeds a known fixture
- Or each test runs in its own MongoDB database name (`db_${randomUUID()}`)
- Never share mutable state between tests — flakes WILL emerge as the suite grows

### HTTP helper

```ts
// helpers/http.ts
export const api = supertest(app);   // app is the Express instance — not the listening server

// Usage:
const res = await api.post('/api/users').set('API-Version', 'v1').send({ ... });
expect(res.status).toBe(201);
expect(res.body).toMatchObject({ id: expect.any(String) });
```

### Auth in integration tests

- Stub `user-service` JWT issuance — sign tokens with a known test key
- The backend's JWT verifier is configured to accept the test public key only when `NODE_ENV=test`
- Helper: `authedApi(role: 'admin' | 'user')` returns a `supertest` agent with the right `Authorization` header

## What CI runs

Stamp `<project>-core/.github/workflows/ci.yml` with two test jobs:

| Job | Command | Service containers | Trigger |
|---|---|---|---|
| `unit` | `npm run test` (vitest) | none | every PR + push |
| `integration` | `npm run test:int` | `mongo:7`, `redis:7-alpine` as GH Actions services | every PR + push |

CI uses GitHub Actions service containers instead of Testcontainers for speed (no Docker-in-Docker). Local dev uses Testcontainers because it's simpler.

## What this module renders

- `<project>-core/vitest.integration.config.ts`
- `<project>-core/src/__integration__/helpers/{global-setup.ts, setup.ts, db.ts, http.ts}`
- `<project>-core/package.json` — `"test:int": "vitest run --config vitest.integration.config.ts"`
- `<project>-core/docker-compose.test.yml`
- Sample integration test: `<project>-core/src/routes/__integration__/health.int.test.ts` — hits `/health`, asserts 200
- `<project>-core/.github/workflows/ci.yml` — adds the `integration` job with service containers
- Section in `<root>/docs/CODING_PRACTICES.md` clarifying the integration boundary

## Hard rules

- **Never mock the DB / cache in integration tests** — the entire point is to catch wiring + schema issues
- **Never share state between tests** — fresh fixture per test (or per file at minimum)
- **Never let an integration test exceed 5s** — if it does, something's wrong (likely a hang or polling)
- **Always set `API-Version` header** in HTTP helpers; the server treats missing header per `api-contract.md`'s strict policy
- Integration tests run in CI on every PR; failing them is a blocker (no merge)
