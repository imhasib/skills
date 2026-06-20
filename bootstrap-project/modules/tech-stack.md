# Module: tech-stack

Locks language, runtime, and lib choices across repos. Always loaded.

## Inputs (from SKILL.md Q&A)

- `backend_runtime` — `node-express` | `node-fastify` | `go` | `python-fastapi` | `other`
- `mobile` — `flutter` | `android` | `swift` | `none`
- `web` — `nextjs` | `vite-react` | `sveltekit` | `none`
- `web_admin` — `nextjs` | `vite-react` | `sveltekit` | `none`
- `db` — `mongodb` | `postgres` | `mysql`
- `cache` — `redis` | `none`
- `package_manager` — `npm` | `pnpm` | `yarn`
- `node_version` — semver string or the literal `latest` (default `latest` — resolves to the current latest LTS at stamp time, e.g. `22`)
- `flutter_version` — semver string or the literal `latest` (default `latest` — resolves to the current stable Flutter release at stamp time)

## What this module renders

### Into `<root>/CLAUDE.md` — "Tech Stack" section

```md
## Tech Stack

| Repo | Stack | Versions |
|---|---|---|
| `{{PROJECT}}-core` | {{backend_runtime}} + {{db}} + {{cache}} | Node {{node_version}}, {{package_manager}} |
| `{{PROJECT}}-app` | {{mobile}} | Flutter {{flutter_version}} |
| `{{PROJECT}}-web` | {{web}} | Node {{node_version}} |
| `{{PROJECT}}-web-admin` | Next.js (admin) | Node {{node_version}} |
| `{{PROJECT}}-deployment` | Docker Compose + nginx | — |
| `{{PROJECT}}-app-tests` | Appium + WebdriverIO + Mocha | Node {{node_version}} |

Rows for opted-out repos are omitted.
```

### Into stamped repo files

- `<project>-core/.nvmrc` → `{{node_version}}`
- `<project>-core/package.json` → `"engines": { "node": ">={{node_version}}" }`, `"packageManager": "{{package_manager}}@<version>"`
- `<project>-core/tsconfig.json` → strict per `coding-practices.md`
- `<project>-app/pubspec.yaml` → `environment: { sdk: ">=<dart-for-flutter>" }`
- `<project>-web/.nvmrc`, `<project>-web/package.json` → same Node + PM
- `<project>-web-admin/.nvmrc`, `<project>-web-admin/package.json` → same

### Into `.claude/agents/<specialist>.md`

Each specialist prompt prepends a "Stack constraints" block so generated code respects versions and PM choice. See `agent-team.md` for prompt skeleton.

## Defaults if Q skipped

| Q | Default |
|---|---|
| `backend_runtime` | `node-express` |
| `db` | `mongodb` |
| `cache` | `redis` |
| `package_manager` | `npm` |
| `node_version` | `latest` (resolved to current LTS at stamp time) |
| `flutter_version` | `latest` (resolved to current stable at stamp time) |
| `web` | `nextjs` |
| `web_admin` | `nextjs` |
| `mobile` | `flutter` if PRD mentions mobile, else ask |

## Hard rules

- Do not stamp a repo type whose Q answered `none`
- Do not mix package managers across JS repos — one PM per project
- `<project>-app-tests` always uses npm (Appium toolchain expects it)
