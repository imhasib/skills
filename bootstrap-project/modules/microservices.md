# Module: microservices

Defines the service topology, repo split, shared-nginx routing, and shared-service wiring. Always loaded.

## Inputs

- `project` — project name (lowercase, no spaces)
- `web`, `web_admin`, `mobile`, `e2e_gate` — from tech-stack Q&A
- `use_shared_user_service` — `y` | `n` (default `y`)
- `db`, `cache` — from tech-stack
- `dev_domain` — from infra Q&A (prod_domain deferred until `/configure-prod`)
- `image_prefix` — registry prefix used in compose files

## Service topology (rendered into CLAUDE.md)

```
                 Internet
                    │
                    ▼
              host Caddy (TLS)       <-- dev (remote) + prod only
                    │
                    ▼
                  nginx  (loopback :3030 on dev/prod, :3030 direct on dev-local)
                    │
       ┌────────────┼────────────────────────┐
       │            │                        │
  /api/users   /api/*                  /api-docs
  /api/auth        │                        │
  /api/email       │                        │
  /api/assets      │                        │
       │            │                        │
       ▼            ▼                        ▼
 user-service   {{PROJECT}}-core         swagger-ui
   (shared)         │
                    ├── {{DB}} (Atlas / hosted on prod+dev, bundled container on dev-local)
                    {{#CACHE}}└── {{CACHE}} (managed on prod+dev, bundled on dev-local){{/CACHE}}
```

`{{PROJECT}}-web-admin` and `{{PROJECT}}-web` (if opted in) run as separate containers on their own ports — host Caddy fronts them on dedicated subdomains. They are NOT routed through the internal nginx.

## Repo split

| Repo | Created if | Contents |
|---|---|---|
| `{{PROJECT}}-core` | always | Backend API (the product-specific service) |
| `{{PROJECT}}-app` | mobile ≠ none | Mobile client |
| `{{PROJECT}}-web` | web ≠ none | Public web app (Next.js 15 + React 19). Skeleton stamps a working login + auth-gated dashboard: NextAuth v5 with Google provider, server-side Google `id_token` exchange against user-service, public `/` landing + `/login` + `/dashboard` (auth-gated, no role check), Tailwind UI, TanStack Query providers, typed `apiFetch` + `serverApiFetch` (Bearer-injecting), `Dockerfile.dev` for hot-reload dev compose, multi-stage `Dockerfile` for standalone prod build. Dev server runs on `:3080` (mapped to container `:3000`). |
| `{{PROJECT}}-web-admin` | web_admin = y | Admin portal |
| `{{PROJECT}}-deployment` | always | Tri-env Docker Compose + shared nginx |
| `{{PROJECT}}-app-tests` | e2e_gate = y AND mobile ≠ none | Appium E2E |

The workspace root is **not** a git repo. Each repo above is independent.

## Shared user-service wiring

If `use_shared_user_service = y` (default):

- **Code reference path** (read-only): `E:\workspace-nodejs\user-service` — linked in CLAUDE.md, do not modify
- **Docker image** (pulled by deployment): `{{IMAGE_PREFIX}}/user-service:<tag>`
- **Scope (current):** user mgmt + email + assets/images
- Stamped into every env's `docker-compose.yml` as a service named `user-service` listening on `:3000` (internal)
- Stamped into `shared/nginx/locations.conf`: `/api/auth`, `/api/users`, `/api/email`, `/api/assets` → `http://user-service`
- Stamped into `<env>/env/user-service.env(.example)` with the right keys per env (JWT secrets, OAuth creds, email/asset config — `<FILL_IN_*>` on prod, real on dev/dev)

### Planned future services

Append this section to the new `CLAUDE.md` verbatim (the user requested this be visible from day one):

```md
## Planned future services

The shared `user-service` currently handles user, email, and asset/image responsibilities. These will eventually split into independent services. Anticipate the split when designing endpoints — keep email and asset code paths cleanly separable.

| Future service | Will own | Currently handled by |
|---|---|---|
| `email-service` | transactional + marketing email | user-service |
| `asset-service` | image/file upload + CDN signing | user-service |
| `notification-service` | push + in-app notifications | (not yet implemented) |
```

## nginx routing (single source of truth)

All routing rules live in `<project>-deployment/shared/nginx/locations.conf` — mounted by every env's compose file via `../shared/nginx/`. Each env's own `nginx.conf` only sets CORS allowlist + `server_name` + upstream definitions.

Locations (header-versioned, `{{API_BASE}}`, NOT `/api/v1`):

```nginx
# user-service routes (auth_limit on /auth, api_limit on the rest)
location {{API_BASE}}/auth   { proxy_pass http://user-service; ... }
location {{API_BASE}}/users  { proxy_pass http://user-service; ... }
location {{API_BASE}}/email  { proxy_pass http://user-service; ... }
location {{API_BASE}}/assets { proxy_pass http://user-service; ... }

# catch-all → core
location {{API_BASE}}/       { proxy_pass http://{{PROJECT}}-core; ... }

# swagger-ui
location /api-docs           { proxy_pass http://swagger-ui; ... }

# health / root
location = /health           { return 200 'OK'; ... }
location = /                 { return 302 /api-docs; }
```

`shared/nginx/proxy-params.conf` includes `proxy_pass_header {{API_VERSION_HEADER}}` so the version header reaches services unchanged.

Adding a domain-specific user-service route later (e.g. `/api/account`): edit `shared/nginx/locations.conf` once — applies to all envs.

## Hard rules

- Never invent a custom user-service per project. Reuse the shared one.
- `{{API_BASE}}` base, never `/api/v1` (versioning is header-based per `api-contract.md`)
- nginx must forward the `{{API_VERSION_HEADER}}` header end-to-end (handled in `shared/nginx/proxy-params.conf`)
- Each repo gets its own git history. The workspace root is not a repo.
- Per-env `nginx.conf` files do NOT define routes — they only handle CORS + upstreams + server block. Routes live in `shared/nginx/locations.conf`.
