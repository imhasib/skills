# Module: deployment

Defines the tri-env Docker Compose layout (`prod/`, `staging/`, `dev/`), shared nginx pattern, env-file conventions, and per-cloud-provider operations. Always loaded.

**At bootstrap, only `dev/` and `staging/` are fully wired. `prod/` is stamped with `<FILL_IN>` placeholders — populated later by `/configure-prod`.**

## Inputs

- `cloud_provider` — `vps` (default) | `gcp`
- `staging_domain` — public DNS name for staging (e.g. `dev.<project>.karigor.org`)
- VPS-specific: `staging_ssh_host`, `staging_ssh_user`, `staging_ssh_key_path`
- GCP-specific: `staging_vm_name`, `gcp_project`, `gcp_zone`
- `image_registry` — `dockerhub` (default) | `gcp-ar` (if `cloud=gcp`) | `ghcr` | `other`
- `image_prefix` — actual prefix used in compose, e.g. `imhasib`, `ghcr.io/<owner>`, `europe-west2-docker.pkg.dev/<gcp-project>/<repo>`
- `db` — `mongodb` | `postgres` | `mysql` (drives the dev bundled DB container choice)
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
├── staging/                    # LIVE at bootstrap
│   ├── docker-compose.yml
│   ├── nginx/nginx.conf        # CORS for {{STAGING_DOMAIN}}
│   ├── env/                    # gitignored — staging env files
│   └── REBUILD.md              # from-zero VM runbook (per-cloud variant)
├── dev/                        # local dev with bundled DB
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
3. Loopback binding (staging+prod bind `127.0.0.1:3030:80`; dev binds `3030:80` direct)
4. Optional security headers (e.g. HSTS — prod only)

Routes (header-versioned, `/api` base, NOT `/api/v1`):
- `{{API_BASE}}/auth`, `{{API_BASE}}/users`, `{{API_BASE}}/email`, `{{API_BASE}}/assets` → `user-service`
- `{{API_BASE}}/*` (catch-all) → `{{PROJECT}}-core`
- `/api-docs/*` → `swagger-ui`
- `/health` → `200 OK`

## External network

`prod/` and `staging/` declare the network as **external**:

```yaml
networks:
  {{PROJECT}}-network:
    external: true
    name: {{PROJECT}}-network
```

Created once per VM, out-of-band: `sudo docker network create {{PROJECT}}-network`. This lets the app compose file and the logging compose file share a network without one knowing about the other.

`dev/` uses a self-contained `{{PROJECT}}-dev-network` (managed by compose) so local dev requires zero out-of-band setup.

## Image registry pattern

Image refs use `${IMAGE_PREFIX}/<service>:${TAG}` where prefix is whatever the user chose:

| Registry | `IMAGE_PREFIX` example |
|---|---|
| DockerHub | `imhasib` |
| GHCR | `ghcr.io/<owner>` |
| GCP Artifact Registry | `<region>-docker.pkg.dev/<gcp-project>/<repo>` |

Tags are **passed inline at deploy time** via env vars (`USER_SERVICE_TAG`, `CORE_TAG`, etc.), format `sha-<short-git-sha>`:

```bash
sudo -E CORE_TAG=sha-abc1234 docker compose -f staging/docker-compose.yml up -d
```

`sudo -E` is load-bearing — without it, sudo strips the exported env vars and compose falls back to `:latest`. The deploy.yml GHA workflow embeds the right `-E VAR=value` invocation.

## Env file convention

Per-service env files live under `<env>/env/`. Never committed (matched by `**/env/*.env` in `.gitignore`).

| Env | Files |
|---|---|
| dev | `dev/env/{{PROJECT}}-core.env`, `dev/env/user-service.env`. Start from `dev/env.example` (committed combined schema — cp it twice). |
| staging | `staging/env/{{PROJECT}}-core.env`, `staging/env/user-service.env`. Templates: `staging/env/.env.core.example`, `staging/env/.env.user-service.example`. |
| prod | `prod/env/{{PROJECT}}-core.env`, `prod/env/user-service.env`, `prod/.env` (ports + grafana). All gitignored. Templates carry `<FILL_IN_*>` placeholders at bootstrap; `/configure-prod` populates them. |

LF line endings are mandatory on env files (CRLF breaks `source` and embeds `\r` into values). `.gitattributes` enforces this for tracked files.

## Per-env service set

| Service | dev | staging | prod |
|---|---|---|---|
| `user-service` | ✓ | ✓ | ✓ |
| `{{PROJECT}}-core` | ✓ | ✓ | ✓ |
| `swagger-ui` | — (502 acceptable) | ✓ | ✓ |
| `{{PROJECT}}-web-admin` | — | ✓ | ✓ |
| `{{PROJECT}}-web` | — | — | ✓ |
| `nginx` | ✓ (port 3030) | ✓ (loopback 3030) | ✓ (loopback 3030) |
| bundled `{{DB}}` | ✓ | — (uses hosted DB) | — (uses hosted DB) |
| `mongo-express` etc. | opt-in via `--profile tools` | — | — |
| `grafana` + `loki` + `promtail` | — | — | ✓ (separate compose file) |

## Per-cloud staging operations

### VPS (default)

- SSH: `ssh -i <staging_ssh_key_path> <staging_ssh_user>@<staging_ssh_host>`
- Deploy dir: `/opt/{{PROJECT}}-deployment/` (clone the repo there)
- Env upload: `scp -i <key> staging/env/*.env <user>@<host>:/opt/{{PROJECT}}-deployment/staging/env/`
- TLS termination: host-level Caddy proxies `{{STAGING_DOMAIN}}` → `127.0.0.1:3030`
- GHA secrets: `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `SSH_PRIVATE_KEY`

### GCP (opt-in)

- SSH: `gcloud compute ssh <vm-name> --zone=<zone> --tunnel-through-iap`
- Deploy dir: `/opt/{{PROJECT}}-deployment/`
- Env upload via `gcloud compute scp --tunnel-through-iap`
- TLS termination: host-level Caddy (same pattern as VPS)
- GHA secrets: `GCP_SA_KEY` (service account JSON with IAP Tunnel User + image registry pull/push), `STAGING_VM_NAME`
- If using GCP Artifact Registry: SA also needs Artifact Registry Reader/Writer; `docker login` uses `gcloud auth configure-docker`

## staging/REBUILD.md — from-zero runbook

Stamped per cloud. Documents: docker install, network creation, repo clone, env file upload, Caddy config, first `docker compose up`, smoke check.

## prod-deferred semantics

At bootstrap, prod files are stamped but contain `<FILL_IN_*>` placeholders:

- `prod/nginx/nginx.conf` — `server_name <FILL_IN_PROD_DOMAIN>`, CORS map has `<FILL_IN_PROD_DOMAIN>` entries
- `prod/.env.example` — `GRAFANA_ADMIN_PASSWORD=<FILL_IN_BEFORE_FIRST_DEPLOY>`
- `prod/env/.env.*.example` — DB URIs, JWT secrets, OAuth creds, asset bucket all `<FILL_IN_*>`
- No `prod/REBUILD.md` at bootstrap (stamped by `/configure-prod`)

The `deployment-specialist` agent's prompt instructs Claude **not to populate these by hand** — always defer to `/configure-prod` so `BOOTSTRAP.json` and GHA workflow conditionals update consistently.

## What this module renders

- `<project>-deployment/{prod,staging,dev}/docker-compose.yml`
- `<project>-deployment/{prod,staging,dev}/nginx/nginx.conf`
- `<project>-deployment/dev/env.example` (committed)
- `<project>-deployment/{staging,prod}/env/.env.<service>.example` (committed templates)
- `<project>-deployment/prod/.env.example` (committed template)
- `<project>-deployment/prod/docker-compose.logging.yml`
- `<project>-deployment/shared/nginx/{locations,cors,proxy-params,proxy-params-minimal}.conf`
- `<project>-deployment/staging/REBUILD.md` (per-cloud)
- `<project>-deployment/{grafana,loki,promtail}/*` (logging configs)
- `<project>-deployment/{.gitignore, .gitattributes, CLAUDE.md, README.md}`
- Section in `<root>/CLAUDE.md` summarizing the tri-env layout + cloud-specific staging access

## Hard rules

- Never commit `.env` files — only `*.example` / `env.example`
- Never put routing rules in per-env `nginx.conf` — they go in `shared/nginx/locations.conf` (one place, all envs)
- Never expose internal service ports to the host — only nginx (loopback on staging/prod, direct on dev)
- Never run `docker compose down --volumes` against staging or prod without explicit human ACK
- Never populate prod `<FILL_IN_*>` placeholders manually — run `/configure-prod` so the change is consistent across `BOOTSTRAP.json` + workflows + CLAUDE.md
- Always run `docker compose config -f <env>/docker-compose.yml` before applying changes
- The external `{{PROJECT}}-network` must exist before `prod/` or `staging/` stacks come up — first-deploy step is `sudo docker network create {{PROJECT}}-network`
