# Module: cicd

GitHub Actions for build, staging deploy, and (post-`/configure-prod`) production release. Always loaded.

## Inputs

- `cloud_provider` — `vps` (default) | `gcp` — drives deploy.yml's SSH path
- `image_registry` — `dockerhub` | `gcp-ar` | `ghcr` | `other` — drives build.yml's auth + tag path
- `image_prefix` — registry prefix in compose files (e.g. `imhasib`, `ghcr.io/<owner>`, `<region>-docker.pkg.dev/<gcp-project>/<repo>`)
- `staging_domain` — required at bootstrap (health-check target)
- `staging_policy` — `single-tenant` (default) | `per-branch-preview`
- `prod_ready` — `false` at bootstrap. `release.yml` is NOT stamped until `/configure-prod` flips this to `true`.

## Workflows stamped per code repo

Each code repo (`{{PROJECT}}-core`, `{{PROJECT}}-web`, `{{PROJECT}}-web-admin`, `{{PROJECT}}-app`) gets:

### `.github/workflows/ci.yml` — every push & PR

Lint, typecheck, unit tests, integration tests (backend only — spins up DB + cache via GH Actions service containers). Required check on PRs to `dev`.

Fail-fast across steps. Concurrency group cancels superseded pushes.

### `.github/workflows/build.yml` — `dev` / `main` push + manual dispatch

Triggers:
- `push` to `dev` — auto build + dispatch staging deploy (image gets `sha-<sha>` and the moving `dev` tag)
- `push` to `main` — auto build only, **no deploy** (image gets `sha-<sha>` and the moving `latest` tag)
- `workflow_dispatch` with `ref` — manual rebuild
- **Tag push (`v*`) is NOT a trigger at bootstrap** — `/configure-prod` adds it once prod is wired
- **Feature branches do not trigger build** — only `dev` and `main` push do

Steps:
1. Checkout `<ref>`
2. Compute tag: `sha-<short-sha>` (SHA-pinned) plus a moving tag (`dev` for dev, `latest` for main)
3. Login to the chosen registry (DockerHub / GHCR / GCP AR — per `image_registry`)
4. `docker build` + `docker push` both tags via `docker/build-push-action`
5. Auto-dispatch `deploy.yml` with `environment=staging` and the SHA tag — gated by `if: github.ref_name == 'dev'` so `main` builds never roll a deploy

### `.github/workflows/deploy.yml` — manual + chained from build

Inputs: `environment` (`staging` at bootstrap; `production` added post-`/configure-prod`), `image_tag`.

Concurrency group `deploy-${environment}` — staging deploys serialize (single-tenant pattern). Production deploys serialize against themselves but don't block staging.

Steps differ per `cloud_provider`:

| Step | VPS | GCP |
|---|---|---|
| Auth | Write `SSH_PRIVATE_KEY` from secrets to `~/.ssh/deploy_key` | `google-github-actions/auth` with `GCP_SA_KEY` |
| SSH | `ssh -i deploy_key user@host` | `gcloud compute ssh <vm-name> --tunnel-through-iap` |
| Roll | `sudo -E CORE_TAG=<tag> docker compose -f <env>/docker-compose.yml pull && up -d --remove-orphans` | same command via `--command="..."` |
| Smoke | `curl -fsS https://<domain>/health` with 5-min backoff | same |

Note `<env>` is `staging` (or `production` when prod_ready) — the deploy.yml targets the right env folder based on the `environment` input.

### `.github/workflows/release.yml` — NOT stamped at bootstrap

Stays deferred. `/configure-prod` adds it. It triggers on tag push (`v*`), builds + tags images as `:v<version>` + `:latest`, then dispatches `deploy.yml` with `environment=production`.

## Required GitHub secrets (per code repo)

Set via `gh secret set` after the repo is wired:

### Common
- `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` — only if `image_registry=dockerhub`
- `GCP_SA_KEY` — service account JSON; required if `cloud_provider=gcp` OR `image_registry=gcp-ar`. The SA needs:
  - Compute IAP Tunnel User (for IAP SSH)
  - Artifact Registry Reader/Writer (if AR is the registry)

### VPS-specific
- `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `SSH_PRIVATE_KEY`
- `PROD_SSH_HOST`, `PROD_SSH_USER` — added by `/configure-prod`

### GCP-specific
- `STAGING_VM_NAME` (or hard-coded as a workflow input default)
- `PROD_VM_NAME` — added by `/configure-prod`

`PROD_DOMAIN` is added by `/configure-prod` (used by the smoke-check step when `environment=production`).

Stamp `<root>/docs/CI_SECRETS.md` with the full list + `gh secret set` commands per repo.

## Single-tenant vs per-branch-preview staging

| Policy | Behaviour |
|---|---|
| `single-tenant` (default) | One branch deploys to staging at a time. `deploy.yml`'s concurrency group `deploy-staging` serializes runs. `/run-issue` and `/run-e2e` MUST NOT overlap with one another. |
| `per-branch-preview` | Each branch deploys to its own subdomain (`<branch>.{{STAGING_DOMAIN}}`). Compose project name templated as `-p {{PROJECT}}-<branch>` so containers don't collide. Requires DNS wildcard for the staging domain. |

`single-tenant` matches sirr/sc and is the default.

## CI cost discipline

- Concurrency groups on `ci.yml`: `group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true`
- Cache `~/.{{PACKAGE_MANAGER}}-cache` keyed on lockfile hash
- `flutter` cache `~/.pub-cache` for mobile
- Docker layer cache via `cache-from: type=gha, cache-to: type=gha,mode=max`

## What this module renders

- Per code repo: `.github/workflows/{ci.yml, build.yml, deploy.yml}`
- `<root>/docs/CI_SECRETS.md` — full secret list + `gh secret set` commands per code repo
- Section in `<root>/CLAUDE.md` summarizing the CI flow + staging URL + how `/run-issue` triggers it
- `release.yml` is intentionally NOT stamped at bootstrap

## Hard rules

- Never embed secrets in workflow YAML — only `${{ secrets.X }}`
- Never let `deploy.yml` deploy to production until `prod_ready=true` (the `production` choice doesn't appear in the input dropdown until `/configure-prod` runs)
- `single-tenant` staging: never run two `/run-issue` invocations concurrently; the workflow command knows this and refuses
- Health-check polling has a hard 5-min ceiling — STOP after that and surface CI logs to the user
- Image tags are SHA-pinned (`sha-<short-sha>`) — never deploy `:latest` from a workflow; latest is a fallback for manual ops only
