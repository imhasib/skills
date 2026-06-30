---
name: bootstrap-project
description: Scaffold a new multi-repo product workspace from a PRD using the SIRR / Speaking-Club architectural pattern — microservices (core + shared user-service), MongoDB + Redis + nginx, Docker Compose deployment, Grafana/Loki monitoring, Claude sub-agent team, and an issue-to-PR workflow. Invoke when starting a new product project that should follow the karigor house style.
---

# bootstrap-project

You are scaffolding a new product workspace at the user's current working directory. The user has dropped a `PRD.md` in this directory (or will, if missing). Your job is to read the PRD, run an interactive Q&A to lock in all configurable choices, dispatch the relevant modules, and stamp out a complete workspace ready for development.

**Reference repos** the conventions are distilled from:
- `E:\org-karigor\sirr\sirr-repos`
- `E:\org-karigor\speaking-club\sc-repos`

Do not read these mid-run unless a module instructs you to. The modules already encode their patterns.

---

## When to use

The user invoked `/bootstrap-project` from a new empty (or near-empty) directory that contains — or should contain — a `PRD.md`. They want the full repo scaffold (code repos + deployment + `.claude/` team setup + CI + monitoring + workflow docs) generated *before* writing any feature code.

Do **not** use this skill to modify an existing project. For that, the future `/upgrade-project` command is the right tool.

---

## Inputs

- **Working directory** — the new project workspace. Treat as the root.
- **`PRD.md`** in the working directory — the product spec. If missing, ask the user for its location or to create it before continuing.

---

## Phase 1 — Read the PRD

1. Locate `PRD.md` in the cwd. If absent, ask: *"No `PRD.md` found in the current directory. Paste the path, or paste the PRD content directly. I can't bootstrap without a spec."* Wait for response.
2. Read it end-to-end.
3. Extract the implicit signal — product name candidate, mentioned user roles, mentioned platforms (web / mobile / both), realtime hints, integrations (payment, push, email), data shape. Hold these as **suggested defaults** for the Q&A; do not lock them silently.

---

## Phase 2 — Interactive Q&A

Ask the questions in the order below. Show suggested defaults from the PRD where applicable, formatted as `[default: <value>]`. Accept short forms (`y`/`n`, numbers).

Group questions logically and ask in batches of 3–5 per turn so the user isn't drowning in a single wall of prompts. After each batch, summarize what you captured before the next batch.

### Batch A — Project identity

1. **Project name** (short, lowercase, will prefix all repos) — `[default: <inferred from PRD>]`
2. **Project description** (one sentence for READMEs) — `[default: <inferred>]`
3. **Cloud provider** — `vps` (default) / `gcp`. Drives the SSH/deploy mechanics. `vps` works with any provider that gives you SSH + a Linux host (DigitalOcean, Hetzner, Linode, AWS EC2, self-hosted, etc.). `gcp` switches to IAP-tunnel SSH and unlocks Artifact Registry as a registry choice.
4. **Image registry** — where built Docker images are pushed/pulled:
   - `dockerhub` (default) — needs `DOCKERHUB_USERNAME` + `DOCKERHUB_TOKEN`. Image prefix example: `imhasib`.
   - `ghcr` — GitHub Container Registry; auth via `GITHUB_TOKEN`. Image prefix example: `ghcr.io/<owner>`.
   - `gcp-ar` — only offered if cloud_provider=gcp. Image prefix example: `europe-west2-docker.pkg.dev/<gcp-project>/<repo>`. Ask for `gcp_ar_location` (e.g. `europe-west2`).
   - `other` — paste a custom prefix; user wires auth manually.

**Staging and production setup are both deferred.** They will be configured later by running `/configure-staging` and `/configure-prod` from the workspace root — typically once you have a server to point them at. At bootstrap, the `staging/` and `prod/` folders are stamped with `<FILL_IN_*>` placeholders. Do **not** ask staging-server or prod questions in this batch (no SSH host, no VM name, no staging domain, no prod domain).

### Batch B — Tech stack

5. **Backend runtime** — `node-express` (default) / `node-fastify` / `go` / `python-fastapi` / `other`
6. **Mobile app?** — `flutter` (default) / `android` (native Kotlin) / `swift` (native iOS) / `none`
7. **Web app?** — `nextjs` (default) / `vite-react` / `sveltekit` / `none`
8. **Web admin?** — `nextjs` (default) / `vite-react` / `sveltekit` / `none` — if not `none`, stamps a separate repo `<project>-web-admin`
9. **DB** — `mongodb` (default) / `postgres` / `mysql`
10. **Cache** — `redis` (default) / `none`
11. **Package manager** (JS repos) — `npm` (default) / `pnpm` / `yarn`
12. **Node version** — `[default: latest]` (resolves to the current latest LTS at stamp time; user can pin a specific major like `20` or `22`)
13. **Flutter version** (if mobile=flutter) — `[default: latest]` (resolves to the current stable Flutter release at stamp time; user can pin a specific version like `3.24`)

### Batch C — Shared services & API

14. **Use shared user-service?** — `y` (default) / `n`
    - Code path: `E:\workspace-nodejs\user-service`
    - DockerHub image: `imhasib/user-service`
    - Covers: user mgmt + email + assets/images
    - "Planned future services" section in CLAUDE.md will note `email-service`, `asset-service`, `notification-service` as deferred.
15. **API base path** — `[default: /api]` (header-based versioning, not URL)
16. **API version header name** — `[default: API-Version]`, default value `v1`
17. **API response shape** — confirm the bare-resource convention (no envelope): success bodies carry the resource directly (`{ id, ... }` or `{ items, nextCursor, hasMore, limit }` for lists); error bodies are flat (`{ code, message, details?, requestId? }`); HTTP status is the source of truth. Accept `[default]` or paste an override.
18. **Pagination** — `cursor` (default) / `offset`
19. **Idempotency-Key on POSTs?** — `y` (default) / `n`

### Batch D — Tracker / issue workflow

20. **Tracker** — `github` (default) / `linear` / `clickup` / `jira` / `none`
21. **Tracker-specific config** (asked only if tracker ≠ none):
    - **github**: owner (`imhasib` default), repo names per opted-in code repo, GitHub Project number, Kanban column option IDs (Backlog/Todo/In Progress/In Review/Done). Defer the IDs to a follow-up step if user doesn't have them — they can fill in later.
    - **linear**: team key (e.g. `SPCLUB`), workspace, status IDs for the 5 columns above. Note: `mcp__claude_ai_Linear__*` tools available.
    - **clickup** / **jira**: workspace, space/project, status IDs, name of the env var holding the API token (e.g. `CLICKUP_TOKEN`). No native MCP — workflow uses `curl`.

### Batch E — Git & workflow

22. **Branch model** — `main ← dev ← feature` (default) / `main ← feature`
23. **E2E gate?** — `y` (default if mobile included) / `n`
    - If y, stamps `run-e2e.md` and `ship-issue.md` commands plus a `<project>-app-tests/` repo (Appium + WebdriverIO + Mocha)
    - If n, only `run-issue.md` is stamped
24. **Hotfix command?** — `y` (default) / `n`
    - Behaviour: direct `git push origin dev` after local gate passes. Logged to `HOTFIX_LOG.md`. Never touches `main`.
25. **Staging policy** — `single-tenant` (default) / `per-branch-preview`
26. **Iteration budgets** — `[default: 5 for /run-issue, 2 for /run-e2e]`

### Batch F — Quality & ops

27. **Monitoring stack** — `grafana-loki-promtail` (default) / `none`. Logging compose stamps at `<project>-deployment/prod/docker-compose.logging.yml` (prod-only at bootstrap — runs when prod is configured).
28. **Conventional Commits + issue linking?** — `y` (default) / `n`. If `y`:
    - **commitlint + commit-msg hook** enforce `<type>(<scope>)?: <subject>` (see `coding-practices.md`).
    - **Issue reference required in every PR**, and **encouraged in commit footers**. The exact ID format comes from the tracker (Q20):
      - `github` → `#42` (PR body `Closes #42` auto-closes on merge)
      - `linear` → `SPCLUB-42` (branch name or `Refs SPCLUB-42` footer triggers Linear's Git integration)
      - `jira` → `PROJ-42`
      - `clickup` → `CU-abc123`
      - `none` → linking step skipped
    - **Branch naming**: `<issue-id>_<snake_slug>` (already enforced by `git-flow.md`).
    - **PR title**: `<type>(<scope>)?: <subject> (<issue-id>)` — e.g. `feat(auth): add login (#42)`.
    - **Commit footer** (recommended, warn-level in commitlint): `Refs <issue-id>` or `Closes <issue-id>`. Not blocking — a hotfix or trivial chore can land without it.
    - If `n`, no commitlint, no hook, no enforced linking — the workflow docs still note issue refs as a soft convention.
29. **Lint strictness** — `strict` (default) / `normal` / `lenient`
30. **DB hosting (staging)** — **deferred to `/configure-staging`**. Database name still defaults to `<project>` and is recorded in `BOOTSTRAP.json` now; the hosting choice (`atlas` / `self-hosted` / `managed-other`) and connection string come later, alongside the staging server.
    - The dev environment always uses a bundled DB container — independent of this answer.
    - Prod DB connection is asked separately by `/configure-prod` later.
31. **Dev nginx gateway host port** — `[default: 3030]`. The TCP port the dev machine publishes the nginx gateway on; the in-container nginx always listens on `80`. Override when `3030` is already claimed by another project's dev stack on the same machine. Stamped into `dev/docker-compose.yml` (`<port>:80`), the dev `env.example` localhost URLs (`APP_BASE_URL`, `GOOGLE_CALLBACK_URL`), the dev nginx CORS allow-origin (so the browser accepts cross-origin from the same host:port), and the dev quick-start URLs in deployment + core READMEs. Staging and prod nginx loopback bindings are unrelated and remain `3030` (house style — Caddy proxies a known loopback port; prod also overrideable via `NGINX_PORT` env at deploy time).

After Batch F, present a **summary table** of all captured answers and ask: *"Stamp the workspace with these settings? `[y]` to proceed, paste edits to revise."* Do not write files until ack.

---

## Phase 3 — Dispatch & render

After ack, load the modules conditional on the answers. Read each from `~/.claude/skills/bootstrap-project/modules/`.

| Always load | Load if |
|---|---|
| `tech-stack.md` | — |
| `api-contract.md` | — |
| `coding-practices.md` | — |
| `microservices.md` | — |
| `deployment.md` | — |
| `git-flow.md` | — |
| `agent-team.md` | — |
| `workflow.md` | — |
| `testing-unit.md` | — |
| `testing-integration.md` | — |
| `cicd.md` | — |
| `testing-e2e.md` | E2E = y |
| `monitoring.md` | monitoring ≠ none |
| `ticketing/github.md` | tracker = github |
| `ticketing/linear.md` | tracker = linear |
| `ticketing/clickup.md` | tracker = clickup |
| `ticketing/jira.md` | tracker = jira |
| `ticketing/none.md` | tracker = none |

Each module is a self-contained spec for its concern: what files to render, what content variables to substitute, and what to write into `CLAUDE.md` / specialist agents / docs.

If a module file does not exist yet (skill still being built out), surface a clear warning to the user listing the missing modules and continue with what's available. Do **not** silently skip.

---

## Phase 4 — Stamp templates

Render and write files in this order (so later steps can reference earlier ones):

1. **Root scaffold** (`templates/_root/`)
   - `CLAUDE.md` — repo map, service topology, API contract, planned future services, tech stack, sub-agent delegation rules
   - `README.md` — short product blurb + repo links
   - `WORKFLOW.md` — phase-by-phase, tracker-specific, rendered from `workflow.md` + chosen `ticketing/*.md`
   - `docs/CODING_PRACTICES.md` — rendered from `coding-practices.md`
   - `docs/API_CONTRACT.md` — rendered from `api-contract.md`
   - `BOOTSTRAP.json` — frozen Q&A answers + skill commit SHA (for future `/upgrade-project`)
   - `HOTFIX_LOG.md` — empty starter file (only if hotfix=y)

2. **`.claude/`** team setup
   - `.claude/agents/backend-specialist.md`
   - `.claude/agents/mobile-specialist.md` (if mobile ≠ none)
   - `.claude/agents/web-specialist.md` (if web ≠ none)
   - `.claude/agents/web-admin-specialist.md` (if web-admin = y)
   - `.claude/agents/deployment-specialist.md`
   - `.claude/agents/test-specialist.md` (if E2E = y)
   - `.claude/commands/run-issue.md`
   - `.claude/commands/run-e2e.md` (if E2E = y)
   - `.claude/commands/ship-issue.md` (if E2E = y)
   - `.claude/commands/hotfix.md` (if hotfix = y)
   - `.claude/hooks/block-main-pushes.ps1` (always — protects `main`)
   - `.claude/settings.json` — enables agent teams, registers the hook

3. **Code repos** (per `microservices.md`)
   - `<project>-core/` — backend skeleton, **bootable on `npm run dev`** with no domain code yet. Stamps:
     - Root: `Dockerfile`, `Dockerfile.dev`, `docker-compose.dev.yml`, `package.json` (DB-conditional deps), `tsconfig.json` (Node16 module + `exactOptionalPropertyTypes`), `eslint.config.js` (ESLint 9 flat config + `typescript-eslint` v8 umbrella), `.env.example`, `.prettierrc`, `.gitignore`, `README.md`, `vitest.config.ts` (Vitest 2.x), `vitest.integration.config.ts`
     - `src/`: `index.ts` (graceful boot/shutdown), `app.ts` (express factory for supertest), `config.ts` (Joi env validation), `logger.ts` (pino structured JSON), `openapi.ts` (swagger-jsdoc aggregator), `db/index.ts` (DB-conditional connect/ping/disconnect), `cache/index.ts` (if Redis)
     - `src/errors/`: `api-error.ts` (`ApiError(code, message, statusCode, details?)`), `codes.ts` (canonical taxonomy)
     - `src/lib/`: `serialize.ts` (`toWire()` — Mongo `_id` → `id`), `ulid.ts` (`newId('prefix')`)
     - `src/middleware/`: `request-id.ts`, `api-version.ts`, `jwt-verify.ts` (`requireAuth` + `requireRole`), `validate.ts` (Joi runner), `error-handler.ts` (thrown errors → flat error JSON), `not-found.ts`
     - `src/routes/`: `index.ts` (mounts feature routers), `health.ts` (`/health` liveness + `/health/ready` with DB ping)
     - `src/types/`: `express.d.ts` (augments Request with `requestId`, `apiVersion`, `user`), `env.d.ts` (process.env shape)
     - `src/__integration__/helpers/`: `global-setup.ts` (Testcontainers boot — DB-conditional), `setup.ts` (per-suite hooks), `http.ts` (`api()` and `authedApi(role)` supertest agents), `db.ts` (`resetDb()` between tests)
     - Smoke tests: `src/routes/__integration__/health.int.test.ts`, `src/lib/serialize.test.ts`
   - `<project>-app/` — Flutter skeleton (if mobile=flutter). **Prerequisite**: orchestrator runs `flutter create <project>-app --org <reverse-dns> --platforms=android,ios` first to generate `android/`, `ios/`, and other platform shells, then overlays the template files. **The overlay must replace `.gitignore` (not skip it)** — `flutter create`'s default `.gitignore` does NOT exclude `*.g.dart` / `*.freezed.dart` / `*.mocks.dart`, so without the replacement every developer's locally-regenerated build_runner output (containing their personal `API_BASE_URL`, baked envied client ids, etc.) ends up tracked and leaks into shared history. **The overlay must also replace `android/app/src/main/AndroidManifest.xml` (not skip it)** — Flutter's default manifest declares `INTERNET` only in `debug/AndroidManifest.xml` and omits `android:usesCleartextTraffic`, which combined makes plain-HTTP dev backends (the bootstrap default, e.g. `http://10.0.2.2:3030/api`) silently hang on Android 9+ until Dio's `receiveTimeout` fires; the bundled `AndroidManifest.xml.tmpl` adds both. Stamps:
     - Root: `pubspec.yaml` (Riverpod + go_router + Dio + envied + flutter_secure_storage pinned), `analysis_options.yaml` (strict lints + custom_lint), `.env.example`, `.gitignore` (**replaces Flutter's default — see above**), `README.md` (layered-feature pattern + commands)
     - `android/app/src/main/AndroidManifest.xml` (**replaces Flutter's default — see above** — adds `INTERNET` permission to the main manifest and `android:usesCleartextTraffic="true"` on `<application>`)
     - `lib/main.dart` (`ProviderScope` boot), `lib/app.dart` (`MaterialApp.router`)
     - `lib/core/config/env.dart` (`@Envied` annotated — compile-time env constants)
     - `lib/core/network/`: `api_client.dart` (Dio + auth/error interceptors + a `kDebugMode`-gated `LogInterceptor` so the first end-to-end bring-up isn't blind), `api_error.dart` (mirrors the backend's flat error shape), `error_codes.dart` (mirror of backend `ErrorCodes`)
     - `lib/core/auth/`: `auth_storage.dart` (`FlutterSecureStorage` wrapper), `auth_interceptor.dart` (Bearer injection + 401 sign-out), `auth_provider.dart` (`@Riverpod` `AsyncNotifier<AuthState>` with `signIn`/`signOut`)
     - `lib/core/router/router.dart` (go_router with auth-aware redirect; `/` splash, `/login`, `/home`)
     - `lib/core/theme/app_theme.dart`, `lib/core/widgets/error_view.dart` (reusable error display with retry)
     - `lib/features/`: `splash/` (`SplashScreen` — loader while auth resolves), `login/` (placeholder — implement via `/run-issue`), `home/` (placeholder — sign-out wired)
     - `test/widget_test.dart` (smoke — splash renders)
     - Every interactive widget carries a `Key('<feature>_<purpose>')` per the test-specialist contract
   - `<project>-web/` — Next.js 15 + React 19 public web skeleton (if web ≠ none). Stamps:
     - Root: `package.json` (Next 15, `next-auth@5.0.0-beta.x`, `dev` script bound to `next dev -p 3080` so it never collides with `<project>-web-admin`'s `:3081`), `tsconfig.json` (strict + `noUncheckedIndexedAccess`), `next.config.mjs` (`typedRoutes` at top level), `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` (flat config, `FlatCompat` for `next/core-web-vitals`), `vitest.config.ts` (jsdom + `passWithNoTests`), `.env.example`, `.gitignore`, `next-env.d.ts`, `Dockerfile` (multi-stage standalone), `Dockerfile.dev`, `README.md`
     - `src/auth.ts` — NextAuth v5 config with **Credentials** provider whose `authorize()` POSTs the Google `id_token` to user-service (`POST /api/auth/google` → user-service `/api/v1/auth/google`), stashes `{ accessToken, user }` on the JWT, exposes them via `session.backendToken` / `session.backendUser`. JWT signature is **never** verified locally — that lives in user-service (issuer) and `<project>-core` (validator). No OAuth client secret is held by the web app — only user-service has it.
     - `src/middleware.ts` — auth gate. Public: `/`, `/login`, `/api/auth/*`, Next internals. Protected: everything else (default redirect target is `/dashboard`). No role check — the public web is anonymous-friendly until a user opts to sign in.
     - `src/app/`: `layout.tsx` (RSC root + Providers), `page.tsx` (anonymous landing with `/login` CTA), `login/page.tsx` (reads `AUTH_GOOGLE_ID` server-side and passes it down) + `login/login-form.tsx` (renders `<GoogleSignInButton>` and calls `signIn('google', { idToken, redirect: false })` with friendly error mapping), `dashboard/layout.tsx` (auth-gated shell with sign-out), `dashboard/page.tsx` (placeholder), `api/auth/[...nextauth]/route.ts` (handlers re-export), `globals.css` (Tailwind base)
     - `src/components/`: `providers.tsx` (TanStack Query + Devtools), `sign-out-button.tsx`, `google-sign-in-button.tsx` (loads `accounts.google.com/gsi/client`, calls `google.accounts.id.initialize` + `prompt`, emits the resulting `id_token` via an `onIdToken` callback prop — pure browser-side GIS flow, no client secret needed)
     - `src/lib/`: `cn.ts` + `cn.test.ts` (placeholder spec so `npm test` passes), `api.ts` (typed fetch with header versioning), `api-error.ts`, `api-error-codes.ts` (mirrors backend taxonomy), `server-api.ts` (server-only wrapper auto-injecting `session.backendToken` as Bearer)
     - `src/types/next-auth.d.ts` (augments `Session` + `JWT` with `backendToken` / `backendUser`)
     - `src/test-setup.ts` (`@testing-library/jest-dom/vitest`); `vitest.config.ts` sets `esbuild.jsx: 'automatic'` so `.tsx` tests compile under the new JSX runtime
     - Env shape: `AUTH_GOOGLE_ID` (public — used by the browser to initialize GIS), `AUTH_SECRET`, `{{PROJECT_UPPER}}_API_BASE_URL` (defaults to `http://nginx/api` in docker-network dev so the in-cluster nginx fronts user-service + `<project>-core` from a single URL). **No `AUTH_GOOGLE_SECRET`** — the OAuth client secret lives only in user-service. **No `AUTH_TRUST_HOST`** — `src/auth.ts` hardcodes `trustHost: true`, so the env var would be redundant.
   - `<project>-web-admin/` — Next.js 15 + React 19 admin skeleton (if web-admin=y). Stamps:
     - Root: `package.json` (Next 15, jose for JWT, no `jsonwebtoken`), `tsconfig.json`, `next.config.mjs` (`typedRoutes` at top level), `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` (flat config, `FlatCompat` for `next/core-web-vitals` + `typescript-eslint` v8 umbrella), `vitest.config.ts` (`passWithNoTests`), `.prettierrc`, `.env.example`, `.gitignore`, `Dockerfile`, `Dockerfile.dev`, `docker-compose.dev.yml`, `README.md`
     - `src/lib/`: `cn.ts` + `cn.test.ts` (placeholder spec so `npm test` passes), `api.ts` (typed fetch with `{{API_BASE}}` + `{{API_VERSION_HEADER}}`), `api-error.ts`, `api-error-codes.ts`, `auth.ts` (`jose`-based JWT)
     - `src/middleware.ts` (cookie-gated dashboard routes)
     - `src/components/providers.tsx` (TanStack Query), `src/components/google-sign-in-button.tsx` (browser-side GIS flow — same component as web; theme styling passed via `className` prop)
     - `src/app/`: `layout.tsx`, `globals.css`, `login/page.tsx` (reads `AUTH_GOOGLE_ID` and passes to LoginForm) + `login/login-form.tsx` (renders `<GoogleSignInButton>` themed with admin tokens; `signIn('google', { idToken, redirect: false })` via the Credentials provider in `src/auth.ts`), `(dashboard)/layout.tsx` (auth gate) + `(dashboard)/page.tsx` (minimal landing — `"<name> logged in"` + sign-out button), `invite/[token]/` (stub flow). No top-nav, side-nav, or domain-specific subpages stamped — those land via `/run-issue` per product. Env shape mirrors web (no `AUTH_GOOGLE_SECRET`).
   - `<project>-app-tests/` — Appium skeleton (if E2E=y) — wdio.conf.js, page objects base, helpers, sample spec

4. **Deployment** (`<project>-deployment/`) — **tri-env layout**:
   - `dev/` — fully wired with bundled DB container: `docker-compose.yml`, `nginx/nginx.conf` (localhost CORS), `env.example` (committed combined schema)
   - `staging/` — **stamped with `<FILL_IN_*>` placeholders** (`/configure-staging` populates later): `docker-compose.yml` (loopback nginx bind), `nginx/nginx.conf` (staging CORS with `<FILL_IN_STAGING_DOMAIN>`), `env/.env.*.example` templates, `REBUILD.md` (per-cloud-provider from-zero runbook, with placeholder host/key paths)
   - `prod/` — **stamped with `<FILL_IN_*>` placeholders** (`/configure-prod` populates later): `docker-compose.yml`, `docker-compose.logging.yml` (if monitoring), `nginx/nginx.conf`, `.env.example`, `env/.env.*.example`
   - `shared/nginx/` — `locations.conf` (single source of truth for routing, header-versioned), `cors.conf`, `proxy-params.conf`, `proxy-params-minimal.conf` — mounted by every env's compose via `../shared/nginx/`
   - `grafana/`, `loki/`, `promtail/` — if `monitoring=grafana-loki-promtail`; referenced by `prod/docker-compose.logging.yml`
   - `.gitignore` (`**/env/*.env`, `prod/.env`), `.gitattributes` (LF on env + conf files)
   - `CLAUDE.md`, `README.md` — repo-level docs covering the tri-env layout and per-cloud staging access

5. **CI** (`.github/workflows/` per code repo)
   - `ci.yml`, `build.yml` — per `cicd.md`. `build.yml` pushes to the chosen `IMAGE_REGISTRY` with the chosen `IMAGE_PREFIX`. At bootstrap, push to `dev` builds + deploys to staging (moving tag `dev`); push to `main` builds + publishes the moving tag `latest` but **does not** deploy. Feature branches don't trigger build.
   - `deploy.yml` is stamped with the SSH/IAP scaffold but its `with:` block contains `<FILL_IN_*>` placeholders (host, user, VM name, etc.). It runs no-op until `/configure-staging` populates it.
   - Tag triggers + `release.yml` are NOT stamped at bootstrap — `/configure-prod` adds them.
   - Deploy auth shapes: VPS → `ssh -i` with `SSH_PRIVATE_KEY` secret; GCP → `gcloud --tunnel-through-iap` with `GCP_SA_KEY` (secrets created later when staging is configured).
   - `block-main-pushes.ps1` reminder in PR template

Every rendered file must have placeholders substituted:
- `{{PROJECT}}` → project name
- `{{PROJECT_DESCRIPTION}}`
- `{{CLOUD_PROVIDER}}` → `vps` | `gcp`
- Staging fields are **not** asked at bootstrap. Render the following as the literal token `<FILL_IN_*>` so `/configure-staging` can find-and-replace them later: `{{STAGING_DOMAIN}}` → `<FILL_IN_STAGING_DOMAIN>`, VPS-only `{{STAGING_SSH_HOST/USER/KEY_PATH}}` → `<FILL_IN_STAGING_SSH_*>`, GCP-only `{{STAGING_VM_NAME}}`/`{{GCP_PROJECT}}`/`{{GCP_ZONE}}` → `<FILL_IN_STAGING_VM_*>` / `<FILL_IN_GCP_*>`. `{{GCP_AR_LOCATION}}` is asked at bootstrap only if `image_registry=gcp-ar` (registry config can't be deferred — CI needs to push images on day one).
- `{{IMAGE_REGISTRY}}` (display name) and `{{IMAGE_PREFIX}}` (actual prefix used in compose)
- `{{API_BASE}}` (default `/api`), `{{API_VERSION_HEADER}}` (default `API-Version`), `{{API_VERSION_DEFAULT}}` (default `v1`)
- `{{TRACKER}}` and tracker-specific IDs
- `{{NODE_VERSION}}`, `{{FLUTTER_VERSION}}`, `{{PACKAGE_MANAGER}}`
- `{{PROJECT_CLASS}}` — PascalCase form of the project name, used in Dart class names (e.g. project `acme-shop` → `Acmeshop`). Compute at orchestration time from `{{PROJECT}}`.
- `{{PROJECT_SNAKE}}` — snake_case form of the project name, used as the Dart package name in `pubspec.yaml` and `package:<name>/...` imports (e.g. project `acme-shop` → `acmeshop_app`). Convention: append `_app` for the mobile package.
- `{{PROJECT_UPPER}}` — uppercase form of the project name with non-alphanumerics stripped, used as the prefix for project-scoped env var names (e.g. project `acme-shop` → `ACMESHOP`, project `acme_shop` → `ACMESHOP`). Stamped into env vars like `{{PROJECT_UPPER}}_API_BASE_URL` so each generated workspace owns a namespaced shape that won't collide across projects on the same machine.
- `{{PROJECT_TITLE}}` — title-case form of `{{PROJECT}}` with hyphens replaced by spaces (e.g. `acme-shop` → `Acme Shop`). Used in brand text rendered to the browser — page metadata `title`, landing-page hero, login-page header, dashboard top-nav brand. Distinct from `{{PROJECT_CLASS}}` (Dart PascalCase, no spaces) because the web app surfaces this verbatim to humans.
- `{{REVERSE_DNS}}` — reverse-DNS org prefix, used as the Android bundle prefix and `flutter create --org` argument (e.g. `org.karigor`). Combined with `{{PROJECT_SNAKE}}` to form the application id `{{REVERSE_DNS}}.{{PROJECT_SNAKE}}`.
- `{{DB}}`, `{{CACHE}}`, `{{DB_HOSTING}}`
- `{{DEV_NGINX_PORT}}` — host TCP port the dev nginx gateway publishes to (default `3030`). Recorded in `BOOTSTRAP.json` so `/upgrade-project` can re-stamp consistently.
- `{{USER_SERVICE_PATH}}` → `E:\workspace-nodejs\user-service`
- `{{USER_SERVICE_IMAGE}}` → `{{IMAGE_PREFIX}}/user-service`
- `{{PROD_READY}}` → `false` at bootstrap (always)

Conditional sections use mustache-style flags:
- `{{#VPS}}…{{/VPS}}`, `{{#GCP}}…{{/GCP}}` for cloud-provider branches
- `{{#STAGING_READY}}…{{/STAGING_READY}}` for content that only renders post-`/configure-staging` (deploy.yml `with:` values, staging-domain references in CLAUDE.md, REBUILD.md concrete host/key paths)
- `{{#PROD_READY}}…{{/PROD_READY}}` for content that only renders post-`/configure-prod` (release.yml, prod GHA triggers, prod-domain references in CLAUDE.md)
- `{{#REGISTRY_DOCKERHUB}}…{{/REGISTRY_DOCKERHUB}}`, `{{#REGISTRY_GHCR}}…`, `{{#REGISTRY_GCP_AR}}…` for registry-specific auth blocks
- `{{#MONGO}}…{{/MONGO}}`, `{{#POSTGRES}}…`, `{{#MYSQL}}…`, `{{#REDIS}}…` for DB/cache branches in dev compose
- `{{#INTEGRATION_TESTS}}…{{/INTEGRATION_TESTS}}` — gates the DB-backed `integration` job in `ci.yml`. **Set per-repo, not project-wide**: `true` only when stamping a backend service repo that owns a `test:int` script + datastore (e.g. `{{PROJECT}}-core`); `false` for frontend/mobile repos (`-web`, `-web-admin`, `-app`), which have no `test:int` script and talk to the backend over HTTP. Without this gate, frontend `ci.yml`s render an `integration` job that calls a non-existent `test:int` and fails every PR.
- `{{#WEB}}…{{/WEB}}`, `{{#WEB_ADMIN}}…`, `{{#MOBILE_FLUTTER}}…{{/MOBILE_FLUTTER}}`, `{{#MOBILE_ANDROID}}…`, `{{#MOBILE_SWIFT}}…`, `{{#E2E_GATE}}…`, `{{#HOTFIX}}…` for opt-in features (`MOBILE_*` flags replace the prior single `{{#MOBILE}}` — distinct because the stamped repo type differs per option)

**Neither staging nor prod is fully configured at bootstrap.** Both `staging/` and `prod/` folders are stamped but `<FILL_IN_*>` placeholders remain. The summary at Phase 6 must remind the user to run `/configure-staging` (once they have a server) and `/configure-prod` (when ready to publish).

Do **not** start dev servers, install dependencies, or run the new project's CI. Stamping only.

---

## Phase 5 — Initialize git + first commit

For each generated code/deployment repo:

1. `git init -b <default-branch>` — default `main`
2. Create `dev` branch from `main` (if branch model is `main ← dev ← feature`)
3. Switch to `dev`
4. Initial commit on `dev` with message: `chore: scaffold <repo-name> from bootstrap-project skill@<short-sha>`
5. Do **not** push, do **not** create remotes — user wires those up manually after reviewing.

The workspace root itself is **not** a git repo (each sub-repo is independent — matches sirr / sc pattern).

---

## Phase 6 — Summary + next steps

Print a summary:

```
✅ Workspace scaffolded: <project>

Repos created:
  - <project>-core         (backend, dev branch)
  - <project>-app          (mobile, dev branch)     [if applicable]
  - <project>-web          (web, dev branch)        [if applicable]
  - <project>-web-admin    (admin, dev branch)      [if applicable]
  - <project>-app-tests    (e2e, dev branch)        [if applicable]
  - <project>-deployment   (infra, dev branch)

Deployment envs:
  - dev/      fully wired (bundled <DB> container, zero-setup local stack)
  - staging/  DEFERRED — stamped with <FILL_IN_*> placeholders
  - prod/     DEFERRED — stamped with <FILL_IN_*> placeholders

.claude/ team:
  - agents: <list>
  - commands: <list>
  - hooks: block-main-pushes.ps1

Skill version: bootstrap-project@<short-sha>
Frozen settings: BOOTSTRAP.json (prod_ready: false)

Next steps for you:
  1. Review CLAUDE.md and BOOTSTRAP.json
  2. Create remote repos and wire `git remote add origin ...` per repo
  3. cd into <project>-deployment/dev && docker compose up — verify the dev stack
  4. cd into <project>-core && start the backend dev server
  5. Run /run-issue <first-task> to drive your first feature

When ready for a staging server (typically as soon as you want CI deploys + a shareable URL):
  - Provision the VM / host first
  - From the workspace root, run /configure-staging to fill in the staging/
    placeholders and wire deploy.yml secrets

When ready to publish to production (typically weeks/months later):
  - From the workspace root, run /configure-prod to populate the prod/ folder
    and add release.yml + prod GHA triggers.
```

If any module was missing during Phase 3, list those at the end with: *"To fully complete this scaffold, write modules: <list>, then re-run /upgrade-project."*

---

## Outputs

The completed workspace must satisfy these invariants:

- Every repo has `dev` as its working branch (if branch model = `main ← dev ← feature`)
- `block-main-pushes.ps1` is wired in `.claude/settings.json` as a PreToolUse hook
- All `{{PLACEHOLDER}}` tokens are substituted — none remain in stamped files
- `BOOTSTRAP.json` is committed in the root scaffold (or stored if root is not a repo) so future `/upgrade-project` can read what choices were made

---

## Hard rules

- **Never** write to or modify `E:\workspace-nodejs\user-service` — it is read-only reference
- **Never** stamp a `main` branch direct-push command anywhere — only `dev` for hotfix
- **Never** auto-populate tracker IDs without asking — user must paste them or defer
- **Never** start the dev server or run npm install on the new project — stamping only
- **Never** invent module content if a module file is missing — surface and continue with what's loaded
- **Never** ask staging-server or prod questions in Batch A — both are deferred. Staging goes to `/configure-staging`; prod goes to `/configure-prod`. The `staging/` and `prod/` folders are stamped with `<FILL_IN_*>` placeholders.
- **Never** stamp `release.yml` at bootstrap — it lives in the future `/configure-prod` skill
- **Never** populate staging or prod `<FILL_IN_*>` placeholders by hand if the user asks mid-bootstrap — direct them to `/configure-staging` / `/configure-prod` once bootstrap completes, so server settings get recorded in `BOOTSTRAP.json` and the GHA workflow conditionals update together

---

## Module index

Modules live at `~/.claude/skills/bootstrap-project/modules/` (read via the junction; canonical at `E:\org-karigor\skills\bootstrap-project\modules\`).

| Module | Purpose |
|---|---|
| `tech-stack.md` | Locks runtime versions, package manager, lib choices |
| `api-contract.md` | Base path, header versioning, bare-resource response shape, flat error body, pagination, Swagger |
| `coding-practices.md` | Naming, error handling, comments, lint config, commit format |
| `microservices.md` | Repo split, nginx routes, env files, shared user-service wiring |
| `deployment.md` | docker-compose dev/prod, env file pattern, prod VM SCP flow |
| `cicd.md` | build → staging → prod workflow YAML |
| `monitoring.md` | Grafana + Loki + Promtail stack |
| `testing-unit.md` | Jest/Vitest patterns per stack |
| `testing-integration.md` | Real DB integration tests (no mocks for DB layer) |
| `testing-e2e.md` | Appium + WebdriverIO + Mocha (optional) |
| `git-flow.md` | `main ← dev ← feature`, PR base = dev, block-main hook |
| `agent-team.md` | `.claude/agents/` specialist generation rules |
| `workflow.md` | Phase 0–8 issue lifecycle, tracker-agnostic |
| `ticketing/<provider>.md` | Tracker-specific intake / status moves / branching |
