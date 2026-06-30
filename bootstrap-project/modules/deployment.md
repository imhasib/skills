# Module: deployment

Defines the tri-env Docker Compose layout (`prod/`, `dev/`, `dev-local/`), shared nginx pattern, env-file conventions, and per-cloud-provider operations. Always loaded.

**At bootstrap, only `dev-local/` and `dev/` are fully wired. `prod/` is stamped with `<FILL_IN>` placeholders — populated later by `/configure-prod`.**

## Inputs

- `cloud_provider` — `vps` (default) | `gcp`
- `dev_domain` — public DNS name for the remote dev env (e.g. `dev.<project>.karigor.org`)
- VPS-specific: `dev_ssh_host`, `dev_ssh_user`, `dev_ssh_key_path`
- GCP-specific: `dev_vm_name`, `gcp_project`, `gcp_zone`
- `image_registry` — `dockerhub` (default) | `gcp-ar` (if `cloud=gcp`) | `ghcr` | `other`
- `image_prefix` — actual prefix used in compose, e.g. `imhasib`, `ghcr.io/<owner>`, `europe-west2-docker.pkg.dev/<gcp-project>/<repo>`
- `db` — `mongodb` | `postgres` | `mysql` (drives the dev-local bundled DB container choice)
- `db_hosting` — `atlas` (default for mongo) | `self-hosted` | provider-managed
- `prod_ready` — `false` at bootstrap (default); `/configure-prod` flips this to `true`

## Tri-env layout

```
<project>-deployment/
├── prod/                       # DEFERRED at bootstrap
│   ├── docker-compose.yml
│   ├── docker-compose.logging.yml
│   ├── nginx/nginx.conf        # CORS for <FILL_IN_PROD_DOMAIN>
│   ├── env/                    # gitignored, populated by /configure-prod
│   └── .env                    # gitignored — host ports + grafana password
├── dev/                        # remote deployment stack — LIVE at bootstrap
│   ├── docker-compose.yml
│   ├── nginx/nginx.conf        # CORS for {{DEV_DOMAIN}}
│   ├── env/                    # gitignored — remote dev env files
│   └── REBUILD.md              # from-zero VM runbook (per-cloud variant)
├── dev-local/                  # local dev with bundled DB
│   ├── docker-compose.yml      # bundled {{DB}} container
│   ├── nginx/nginx.conf        # CORS for localhost
│   ├── env/                    # gitignored
│   └── env.example             # committed combined schema (cp to env/*.env)
├── shared/
│   └── nginx/                  # mounted by every env's compose via ../shared/nginx/
│       ├── locations.conf      # single source of truth for routing
│       ├── cors.conf
│       ├── proxy-params.conf
│       └── proxy-params-minimal.conf
├── grafana/, loki/, promtail/  # logging configs (referenced by prod/docker-compose.logging.yml)
├── .gitignore                  # **/env/*.env, prod/.env
└── .gitattributes              # LF on env + conf files
```

## Routing — single source of truth

`shared/nginx/locations.conf` is mounted by every env's nginx via `../shared/nginx/`. Change once, applies to all envs. Each env's `nginx.conf` only differs in:

1. CORS allowlist (`map $http_origin $cors_origin { ... }`)
2. `server_name` directive
3. Loopback binding (dev+prod bind `127.0.0.1:3030:80`; dev-local binds `3030:80` direct)
4. Optional security headers (e.g. HSTS — prod only)

Routes (header-versioned, `/api` base, NOT `/api/v1`):
- `{{API_BASE}}/auth`, `{{API_BASE}}/users`, `{{API_BASE}}/email`, `{{API_BASE}}/assets` → `user-service`
- `{{API_BASE}}/*` (catch-all) → `{{PROJECT}}-core`
- `/api-docs/*` → `swagger-ui`
- `/health` → `200 OK`

## External network

`prod/` and `dev/` declare the network as **external**:

```yaml
networks:
  {{PROJECT}}-network:
    external: true
    name: {{PROJECT}}-network
```

Created once per VM, out-of-band: `sudo docker network create {{PROJECT}}-network`. This lets the app compose file and the logging compose file share a network without one knowing about the other.

`dev-local/` uses a self-contained `{{PROJECT}}-dev-network` (managed by compose) so local dev requires zero out-of-band setup.

## Image registry pattern

Image refs use `${IMAGE_PREFIX}/<service>:${TAG}` where prefix is whatever the user chose:

| Registry | `IMAGE_PREFIX` example |
|---|---|
| DockerHub | `imhasib` |
| GHCR | `ghcr.io/<owner>` |
| GCP Artifact Registry | `<region>-docker.pkg.dev/<gcp-project>/<repo>` |

Tags are **passed inline at deploy time** via env vars (`USER_SERVICE_TAG`, `CORE_TAG`, etc.), format `sha-<short-git-sha>`:

```bash
sudo -E CORE_TAG=sha-abc1234 docker compose -f dev/docker-compose.yml up -d
```

`sudo -E` is load-bearing — without it, sudo strips the exported env vars and compose falls back to `:latest`. The deploy.yml GHA workflow embeds the right `-E VAR=value` invocation.

## Env file convention

Per-service env files live under `<env>/env/`. Never committed (matched by `**/env/*.env` in `.gitignore`).

| Env | Files |
|---|---|
| dev-local | `dev-local/env/{{PROJECT}}-core.env`, `dev-local/env/user-service.env`. Start from `dev-local/env.example` (committed combined schema — cp it twice). |
| dev (remote) | `dev/env/{{PROJECT}}-core.env`, `dev/env/user-service.env`. Templates: `dev/env/.env.core.example`, `dev/env/.env.user-service.example`. |
| prod | `prod/env/{{PROJECT}}-core.env`, `prod/env/user-service.env`, `prod/.env` (ports + grafana). All gitignored. Templates carry `<FILL_IN_*>` placeholders at bootstrap; `/configure-prod` populates them. |

LF line endings are mandatory on env files (CRLF breaks `source` and embeds `\r` into values). `.gitattributes` enforces this for tracked files.

## Per-env service set

| Service | dev-local | dev (remote) | prod |
|---|---|---|---|
| `user-service` | ✓ | ✓ | ✓ |
| `{{PROJECT}}-core` | ✓ | ✓ | ✓ |
| `swagger-ui` | — (502 acceptable) | ✓ | ✓ |
| `{{PROJECT}}-web-admin` | ✓ (port 3081, if `web_admin=y`) | ✓ | ✓ |
| `{{PROJECT}}-web` | ✓ (port 3080, if `web ≠ none`) | ✓ | ✓ |
| `nginx` | ✓ (port `{{DEV_NGINX_PORT}}`) | ✓ (loopback 3030) | ✓ (loopback 3030) |
| bundled `{{DB}}` | ✓ | — (uses hosted DB) | — (uses hosted DB) |
| `mongo-express` etc. | opt-in via `--profile tools` | — | — |
| `grafana` + `loki` + `promtail` | — | — | ✓ (separate compose file) |

## Web services in the dev-local compose

When `web ≠ none` and/or `web_admin = y`, `dev-local/docker-compose.yml` stamps the corresponding Next.js apps as first-class services so a single `docker compose up` brings up the whole stack. Working reference: `E:/org-karigor/toeic/toeic-deployment/dev-local/docker-compose.yml` (services `toeic-web-app` and `toeic-web-admin`).

Stamp the following per opted-in web service:

```yaml
{{PROJECT}}-web-app:
  build:
    context: ../../{{PROJECT}}-web
    dockerfile: Dockerfile.dev
  image: {{IMAGE_PREFIX}}/{{PROJECT}}-web:dev-local
  container_name: {{PROJECT}}-dev-web-app
  restart: unless-stopped
  env_file:
    - ./env/web-app.env
  ports:
    - "3080:3000"
  volumes:
    - ../../{{PROJECT}}-web:/app
    - /app/node_modules           # mask: keep container's node_modules
    - /app/.next                  # mask: keep container's .next cache
  depends_on:
    user-service:
      condition: service_healthy
  networks:
    - {{PROJECT}}-dev-network

{{PROJECT}}-web-admin:
  build:
    context: ../../{{PROJECT}}-web-admin
    dockerfile: Dockerfile.dev
  image: {{IMAGE_PREFIX}}/{{PROJECT}}-web-admin:dev-local
  container_name: {{PROJECT}}-dev-web-admin
  restart: unless-stopped
  env_file:
    - ./env/web-admin.env
  ports:
    - "3081:3000"
  volumes:
    - ../../{{PROJECT}}-web-admin:/app
    - /app/node_modules
    - /app/.next
  depends_on:
    user-service:
      condition: service_healthy
  networks:
    - {{PROJECT}}-dev-network
```

Notes:
- **Port allocation**: `3080` for the public web app, `3081` for the admin. Both containers internally listen on `:3000` (Next.js default in `Dockerfile.dev`); the host port differentiates them. Same number as each app's local-machine `npm run dev` port so the docs stay consistent whether the dev runs through compose or natively.
- **Bind-mount + anonymous volumes**: mounting `../../{{PROJECT}}-web:/app` gives hot-reload from the host source tree, and the two anonymous volumes (`/app/node_modules`, `/app/.next`) keep the container-owned `node_modules` (alpine `libc6-compat`-linked) and the build cache out of the host filesystem. Without these masks, the host's `node_modules` (often a Windows-installed copy) leaks into the container and breaks `next dev`.
- **`depends_on: user-service.service_healthy`**: the web apps don't strictly need user-service up at boot (the Google exchange only runs on login), but waiting avoids the first sign-in racing user-service's cold start.

## Per-service dev-local env files

When `web ≠ none` and/or `web_admin = y`, also stamp under `dev-local/env/`:

- `dev-local/env/web-app.env` (if `web ≠ none`)
- `dev-local/env/web-admin.env` (if `web_admin = y`)

Both files share the same shape (Google client ID + NextAuth secret + backend URL). Stamp them with:

```bash
NEXT_PUBLIC_ENVIRONMENT=dev

# Google OAuth client ID — public by design. The browser uses it to talk to
# Google Identity Services directly; the OAuth client *secret* lives only in
# user-service (which validates the resulting id_token).
# Authorized JavaScript origin to register in GCP Console:
#   web-app:   http://localhost:3080
#   web-admin: http://localhost:3081
AUTH_GOOGLE_ID=<FILL_IN_GOOGLE_OAUTH_CLIENT_ID>

# NextAuth session-signing secret. Generate with: openssl rand -base64 32
AUTH_SECRET=<FILL_IN_AUTH_SECRET>

# Backend URL — resolves to the in-cluster nginx (which fronts user-service +
# {{PROJECT}}-core). Same URL for both web apps.
{{PROJECT_UPPER}}_API_BASE_URL=http://nginx/api
```

Each app must get its own `AUTH_SECRET` value (cookies don't cross apps anyway, but separate secrets prevent accidental cross-sign-in if both apps are ever served from the same parent domain). At bootstrap, leave both as `<FILL_IN_AUTH_SECRET>` so the operator generates a fresh one per app.

The Google OAuth client *secret* (`GOOGLE_CLIENT_SECRET`) is held only by user-service in its own env file — never duplicated into the web apps. The web apps use Google Identity Services in the browser, which doesn't require a secret. The id_token they obtain is forwarded to user-service for validation.

Both files are gitignored (`**/env/*.env`). Only `dev-local/env.example` is committed; document the shape there too so a new dev can `cp` the relevant pieces into `dev-local/env/web-app.env` and `dev-local/env/web-admin.env`.

## Per-cloud remote-dev operations

### VPS (default)

- SSH: `ssh -i <dev_ssh_key_path> <dev_ssh_user>@<dev_ssh_host>`
- Deploy dir: `/opt/{{PROJECT}}-deployment/` (clone the repo there)
- Env upload: `scp -i <key> dev/env/*.env <user>@<host>:/opt/{{PROJECT}}-deployment/dev/env/`
- TLS termination: host-level Caddy proxies `{{DEV_DOMAIN}}` → `127.0.0.1:3030`
- GHA secrets: `DEV_SSH_HOST`, `DEV_SSH_USER`, `SSH_PRIVATE_KEY`

### GCP (opt-in)

- SSH: `gcloud compute ssh <vm-name> --zone=<zone> --tunnel-through-iap`
- Deploy dir: `/opt/{{PROJECT}}-deployment/`
- Env upload via `gcloud compute scp --tunnel-through-iap`
- TLS termination: host-level Caddy (same pattern as VPS)
- GHA secrets: `GCP_SA_KEY` (service account JSON with IAP Tunnel User + image registry pull/push), `DEV_VM_NAME`
- If using GCP Artifact Registry: SA also needs Artifact Registry Reader/Writer; `docker login` uses `gcloud auth configure-docker`

## dev/REBUILD.md — from-zero runbook

Stamped per cloud. Documents: docker install, network creation, repo clone, env file upload, Caddy config, first `docker compose up`, smoke check.

## prod-deferred semantics

At bootstrap, prod files are stamped but contain `<FILL_IN_*>` placeholders:

- `prod/nginx/nginx.conf` — `server_name <FILL_IN_PROD_DOMAIN>`, CORS map has `<FILL_IN_PROD_DOMAIN>` entries
- `prod/.env.example` — `GRAFANA_ADMIN_PASSWORD=<FILL_IN_BEFORE_FIRST_DEPLOY>`
- `prod/env/.env.*.example` — DB URIs, JWT secrets, OAuth creds, asset bucket all `<FILL_IN_*>`
- No `prod/REBUILD.md` at bootstrap (stamped by `/configure-prod`)

The `deployment-specialist` agent's prompt instructs Claude **not to populate these by hand** — always defer to `/configure-prod` so `BOOTSTRAP.json` and GHA workflow conditionals update consistently.

## What this module renders

- `<project>-deployment/{prod,dev,dev-local}/docker-compose.yml`
- `<project>-deployment/{prod,dev,dev-local}/nginx/nginx.conf`
- `<project>-deployment/dev-local/env.example` (committed — combined schema covering `<project>-core`, `user-service`, and any opted-in web apps)
- `<project>-deployment/dev-local/env/web-app.env` template (only if `web ≠ none`) and `dev-local/env/web-admin.env` template (only if `web_admin = y`) — both gitignored at install time; the example shape lives in `dev-local/env.example`
- `<project>-deployment/{dev,prod}/env/.env.<service>.example` (committed templates)
- `<project>-deployment/prod/.env.example` (committed template)
- `<project>-deployment/prod/docker-compose.logging.yml`
- `<project>-deployment/shared/nginx/{locations,cors,proxy-params,proxy-params-minimal}.conf`
- `<project>-deployment/dev/REBUILD.md` (per-cloud)
- `<project>-deployment/{grafana,loki,promtail}/*` (logging configs)
- `<project>-deployment/{.gitignore, .gitattributes, CLAUDE.md, README.md}`
- Section in `<root>/CLAUDE.md` summarizing the tri-env layout + cloud-specific remote-dev access

## Hard rules

- Never commit `.env` files — only `*.example` / `env.example`
- Never put routing rules in per-env `nginx.conf` — they go in `shared/nginx/locations.conf` (one place, all envs)
- Never expose internal service ports to the host — only nginx (loopback on dev/prod, direct on dev-local)
- Never run `docker compose down --volumes` against the remote dev env or prod without explicit human ACK
- Never populate prod `<FILL_IN_*>` placeholders manually — run `/configure-prod` so the change is consistent across `BOOTSTRAP.json` + workflows + CLAUDE.md
- Always run `docker compose config -f <env>/docker-compose.yml` before applying changes
- The external `{{PROJECT}}-network` must exist before `prod/` or `dev/` stacks come up — first-deploy step is `sudo docker network create {{PROJECT}}-network`
