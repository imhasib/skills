# Module: monitoring

Grafana + Loki + Promtail logging stack. Optional — only loaded if `monitoring = grafana-loki-promtail`.

**Logging runs prod-only at bootstrap.** The compose file lives at `prod/docker-compose.logging.yml`, alongside the prod app stack. Dev and staging don't run the logging stack (Promtail scraping local Docker logs is rarely worth the resource cost). When prod is configured via `/configure-prod`, this stack starts working.

## Inputs

- `grafana_admin_password_env` — env var name for the initial admin password; default `GRAFANA_ADMIN_PASSWORD` (set in `prod/.env`)
- `loki_retention_days` — default `30`
- `prod_ready` — `false` at bootstrap; logging compose file is stamped but won't start until prod is up

## Where files live

```
<project>-deployment/
├── prod/
│   └── docker-compose.logging.yml      # the Loki + Promtail + Grafana stack
├── loki/
│   └── loki-config.yml                 # filesystem TSDB, retention per loki_retention_days
├── promtail/
│   └── promtail-config.yml             # docker_sd_configs — scrapes container JSON logs
└── grafana/
    └── provisioning/
        ├── datasources/loki.yml        # auto-add Loki as default datasource
        └── dashboards/
            └── dashboard-providers.yml # points at /etc/grafana/provisioning/dashboards/json/
```

The logging stack joins the same external `{{PROJECT}}-network` so Promtail can scrape the app containers.

## Operating the stack

```bash
# Start prod app + logging together
sudo docker compose -f prod/docker-compose.yml -f prod/docker-compose.logging.yml up -d

# Start logging only
sudo docker compose -f prod/docker-compose.logging.yml up -d

# Stop
sudo docker compose -f prod/docker-compose.logging.yml down
```

## Access

Grafana binds to `127.0.0.1:${GRAFANA_HOST_PORT}` (default `3050`) — **loopback only**. The host-level Caddy on the prod VM reverse-proxies the public hostname (e.g. `monitor.<prod-domain>`) to that port. Direct public exposure of Grafana is blocked at the network layer.

- URL (post-`/configure-prod`): `https://monitor.<prod-domain>/`
- Login: `admin` / `$GRAFANA_ADMIN_PASSWORD` (from `prod/.env`)
- Datasource: Loki, provisioned at startup as the default

## Backend logging requirement

For Loki labels (`level`, `requestId`, `userId`, `service`) to populate, the backend services must emit JSON-structured logs:

```json
{ "level": "info", "msg": "...", "requestId": "req_01H...", "userId": "u_01H...", "service": "{{PROJECT}}-core", "ts": "ISO-8601" }
```

The `{{PROJECT}}-core` skeleton uses `pino` (configured in `src/logger.ts`) to emit this shape. The `backend-specialist` agent's prompt enforces it.

Promtail's pipeline first attempts JSON parsing; plain-text lines fall back to a regex extracting `level`. Container metadata labels (`container_name`, `service`, `compose_project`) are stamped automatically from Docker labels.

## What this module renders

- `<project>-deployment/prod/docker-compose.logging.yml`
- `<project>-deployment/loki/loki-config.yml`
- `<project>-deployment/promtail/promtail-config.yml`
- `<project>-deployment/grafana/provisioning/datasources/loki.yml`
- `<project>-deployment/grafana/provisioning/dashboards/dashboard-providers.yml`
- `<project>-deployment/grafana/provisioning/dashboards/json/.gitkeep` — placeholder; populate with real dashboards after first deploy (`app-overview.json`, `error-explorer.json` are good starting names)
- `<project>-core/src/logger.ts` — JSON logger template (pino)
- Section in `<root>/CLAUDE.md` documenting the URL pattern + login + dashboard list
- Adds `GRAFANA_ADMIN_PASSWORD` + `GRAFANA_HOST_PORT` to `prod/.env.example`

## Hard rules

- Never expose Grafana on a raw public port — always proxy through the host Caddy
- Never commit `GRAFANA_ADMIN_PASSWORD` — env var only
- Never log secrets / JWTs / passwords / full request bodies — sample or redact
- Retention is capacity-bound — bump `loki_retention_days` only if you've provisioned disk for it
- Logging stack stays prod-only at bootstrap. If staging logs become useful later, copy the compose file into `staging/` rather than running one cross-env stack
- The logging stack and app stack MUST share the external `{{PROJECT}}-network` — that's how Promtail discovers app containers
