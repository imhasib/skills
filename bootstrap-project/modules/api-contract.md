# Module: api-contract

Locks the wire format every client and server speaks. Always loaded.

## Inputs

- `api_base` — default `/api`
- `api_version_header` — default `API-Version`
- `api_version_default` — default `v1`
- `pagination` — `cursor` (default) | `offset`
- `idempotency_keys` — `y` (default) | `n`

## Versioning policy

- URL has **no version segment**. Base is always `{{API_BASE}}` (default `/api`).
- Server reads `{{API_VERSION_HEADER}}` (default `API-Version`) on every request.
- Missing header → assume `{{API_VERSION_DEFAULT}}` (default `v1`). Strict mode (configurable) rejects with `400 MISSING_API_VERSION`.
- Unsupported version → `400 UNSUPPORTED_API_VERSION` with `supportedVersions` list in error details.
- Server routes versioned handlers internally (e.g. `routes/v1/users.ts`, `routes/v2/users.ts`).
- Swagger documents the header as a **required parameter** on every operation.

## Response shape

**No envelope.** HTTP status is the source of truth for success vs error. Success bodies carry the resource directly; error bodies are a flat object with `code` + `message` at the top level.

### Success — single resource

```json
// GET /api/users/u_01 → 200
{ "id": "u_01", "email": "a@b.com", "role": "user" }

// POST /api/users → 201
{ "id": "u_02", "email": "new@b.com", "role": "user" }

// DELETE /api/users/u_01 → 204 (no body)
```

Field names mirror the domain model. Map Mongo `_id` → `id` before serialization — never leak `_id` to clients.

### Success — list

```json
// GET /api/items?limit=20 → 200
{
  "items": [
    { "id": "i_01", ... },
    { "id": "i_02", ... }
  ],
  "nextCursor": "eyJpZCI6Imk...",
  "hasMore": true,
  "limit": 20
}
```

The array's key matches the resource (`items`, `users`, `transactions`, etc.) so the body self-documents what it contains. Pagination siblings (`nextCursor`, `hasMore`, `limit`) live at the same level — they are metadata about the collection, not envelope decoration.

### Error

```json
// 404
{ "code": "USER_NOT_FOUND", "message": "No user with that id" }

// 400 — Joi validation
{
  "code": "VALIDATION_FAILED",
  "message": "Request body failed validation",
  "details": { "email": "must be a valid email", "password": "min 8 chars" }
}

// 500 — never leak internals
{ "code": "INTERNAL_ERROR", "message": "Something went wrong", "requestId": "req_01H..." }
```

`details` and `requestId` are optional. The error body is **always flat** — no `{ error: { ... } }` wrapper. Clients discriminate success vs error from the HTTP status code; they discriminate between specific errors from the `code` field.

### HTTP status mapping

| Status | When |
|---|---|
| 200 | Successful GET/PUT/PATCH/DELETE |
| 201 | Successful POST that created a resource |
| 204 | Successful DELETE with no body |
| 400 | Validation failure or malformed request |
| 401 | Missing/invalid auth token |
| 403 | Authenticated but not permitted |
| 404 | Resource does not exist |
| 409 | Conflict (duplicate, version mismatch) |
| 422 | Semantic validation failure (well-formed but rejected) |
| 429 | Rate limit exceeded — include `Retry-After` header |
| 500 | Unhandled server error — never leak internals; log requestId |
| 503 | Dependency down (DB, cache, downstream service) |

## Error code taxonomy

Use **domain-specific strings**, not HTTP-status-derived codes. Format: `SCREAMING_SNAKE_CASE`, namespace-prefixed if multi-domain.

Examples:
- `USER_NOT_FOUND`, `USER_EMAIL_TAKEN`, `USER_PASSWORD_WEAK`
- `AUTH_TOKEN_EXPIRED`, `AUTH_TOKEN_INVALID`
- `PAYMENT_DECLINED`, `PAYMENT_INSUFFICIENT_FUNDS`
- `RATE_LIMITED`
- `MISSING_API_VERSION`, `UNSUPPORTED_API_VERSION`

A canonical list lives in `<project>-core/src/errors/codes.ts` (or equivalent for non-TS) and is referenced by Swagger.

## Pagination

Pagination metadata lives as **siblings of the items array** in the list response — not under a separate `meta` key.

### Cursor (default)

Request: `GET /api/items?limit=50&cursor=<opaque>`

Response:
```json
{
  "items": [...],
  "nextCursor": "<opaque>",
  "hasMore": true,
  "limit": 50
}
```

`nextCursor` is `null` (or omitted) on the final page.

### Offset (alternative)

Request: `GET /api/items?limit=50&offset=100`

Response:
```json
{
  "items": [...],
  "limit": 50,
  "offset": 100,
  "total": 543
}
```

Pick one and stick with it across all list endpoints.

## Auth

- Bearer token in `Authorization: Bearer <jwt>`
- JWT issued by shared `user-service`, validated statelessly by `{{PROJECT}}-core`
- JWT payload shape (HS256): `{ userId, name, email, role, iat, exp, iss, aud }`
- `iss` / `aud` are signed by user-service from `JWT_ISSUER` / `JWT_AUDIENCE` (defaults `karigor` / `karigor-users`). `{{PROJECT}}-core` must set the same three env vars and verify both claims on every request, or signature-valid tokens from a different domain would be silently accepted.
- The user id claim is `userId`, NOT the JWT standard `sub` — user-service does not emit `sub`. New middleware must read `payload.userId`.
- Premium / subscription / per-tenant state is **not** in the JWT — `{{PROJECT}}-core` owns it locally and resolves per request

## Idempotency (if `idempotency_keys = y`)

- Client sends `Idempotency-Key: <uuid-v4>` on POST endpoints that create resources
- Server stores `(idempotency_key, request_hash, response)` for 24h in Redis
- Replay with same key + same body → return cached response
- Replay with same key + different body → `409 IDEMPOTENCY_KEY_CONFLICT`

## Rate limiting

- All endpoints rate-limited per IP + per user (when authed)
- Default: 100 req/min per user, 30 req/min unauthed by IP
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Exhaustion → `429 RATE_LIMITED` with `Retry-After` (seconds)

## Swagger

- Location: `/api-docs` (proxied through nginx to `swagger-ui` container)
- Source of truth: JSDoc on route files (`@openapi`), compiled at startup via `swagger-jsdoc`
- `openapi.ts` sets `servers: [{ url: '/' }]` so paths in route annotations are absolute (`{{API_BASE}}/...`, `/health`) — never use `config.api.base` here or Swagger UI doubles the prefix on try-it-out
- `openapi.ts` defines a shared component library that every route operation reuses; route annotations stay short by `$ref`-ing into it

### What `openapi.ts` ships with

- **`tags`** (top-level) — one entry per domain. Drives Swagger UI grouping. Empty `tags` ⇒ everything lands under a single "default" bucket, which is the most common annotation bug.
- **`components.parameters`** — `ApiVersion`{{#IDEMPOTENCY_KEY}}, `IdempotencyKey`{{/IDEMPOTENCY_KEY}}, `PathId`, `Cursor`, `Limit`, `From`, `To`. Operations `$ref` these instead of re-declaring inline.
- **`components.schemas`** — `Error`, `ObjectIdHex`, `Money` (decimal string), `ListMeta` (the `nextCursor`/`hasMore`/`limit` siblings). Domain schemas (`User`, `UserCreate`, `UserPatch`, `UserListResponse`) are added per feature.
- **`components.responses`** — `BadRequest` (400), `Unauthorized` (401), `Forbidden` (403), `NotFound` (404), `Conflict` (409), `NoContent` (204). Every operation references these via `$ref` so error shapes stay consistent and no operation gets a half-empty response block.

### Required fields on every operation

A route operation without these is a bug — it renders as an un-grouped, parameter-less, schema-less stub in Swagger UI:

1. **`tags: [DomainName]`** — must match a `tags[].name` entry registered in `openapi.ts`
2. **`summary`** — one-line imperative ("Create an expense")
3. **`description`** — auth/role requirements + non-obvious rules (immutable fields, side effects, idempotency)
4. **`parameters`** — every path/query/header param, including `$ref: '#/components/parameters/ApiVersion'`{{#IDEMPOTENCY_KEY}} (and `IdempotencyKey` on creating POSTs){{/IDEMPOTENCY_KEY}}
5. **`requestBody`** (POST/PATCH/PUT only) — `$ref` to a `*Create` or `*Patch` schema, with at least one `example`
6. **`responses`** — success status + content schema, plus all expected error codes via `$ref: '#/components/responses/...'`. Lists return the per-resource `*ListResponse` schema (which `allOf`-merges items + `ListMeta`).

### Canonical pattern

```ts
/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a user
 *     description: Owner-only. Email must be unique (409 USER_EMAIL_TAKEN).
 *     parameters:
 *       - $ref: '#/components/parameters/ApiVersion'
{{#IDEMPOTENCY_KEY}} *       - $ref: '#/components/parameters/IdempotencyKey'
{{/IDEMPOTENCY_KEY}} *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserCreate' }
 *           example: { name: Alice, email: a@b.com, role: user }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
```

### Public (unauthenticated) operations

Override the global security with `security: []` on the operation (e.g. `/health`, `/health/ready`). Without this, Swagger UI shows a lock icon and refuses try-it-out without a bearer token.

### Smoke test before considering Swagger work done

Load the spec and confirm: every path tagged, every write op has a `requestBody`, every op has a non-empty `responses`. A 20-line script in CI catches the typical "stubs only" regression:

```ts
const ops = Object.values(spec.paths).flatMap(p => Object.values(p));
const missing = ops.filter(op => !op.tags?.length || !Object.keys(op.responses ?? {}).length);
if (missing.length) throw new Error('un-annotated operations in spec');
```

## What this module renders

- `<project>-core/src/middleware/api-version.ts` — header parser; rejects with `400 MISSING_API_VERSION` if absent (strict mode) or fills the default
- `<project>-core/src/middleware/error-handler.ts` — converts thrown `ApiError(code, message, statusCode, details?)` into a flat error JSON; converts unknown errors into `500 INTERNAL_ERROR` with `requestId`
- `<project>-core/src/errors/api-error.ts` — base `ApiError` class
- `<project>-core/src/errors/codes.ts` — `SCREAMING_SNAKE_CASE` code taxonomy (single source of truth)
- `<project>-core/src/middleware/serialize.ts` — Mongo `_id` → `id` mapping helper used by repositories
- `<project>-core/swagger.json` (or annotation pattern) — header doc on every op; documents flat success and flat error shapes
- `<project>-core/docs/API_CONTRACT.md` — copy of this module rendered with chosen values
- `CLAUDE.md` "API Contract" section — short version with base + header + bare-shape examples
- Specialist agent prompts — inherit the bare-shape rules so generated controllers return resources directly

## Hard rules

- Never embed a version in the URL path (no `/api/v1`)
- Never wrap successful responses — the body IS the resource (or `{ items, nextCursor, hasMore }` for lists)
- Never wrap errors in an `error` field — error bodies are flat: `{ code, message, details?, requestId? }` at the top level
- Never include a `success` boolean — HTTP status is the source of truth (`2xx` = success, `4xx`/`5xx` = error)
- Never expose stack traces or internal field names in error `message`
- Never serialize Mongo `_id` directly — map to `id` before responding
- Error `code` is the **machine** discriminator; `message` is for humans and may change between versions
