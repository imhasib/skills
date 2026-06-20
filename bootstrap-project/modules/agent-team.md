# Module: agent-team

Generates the `.claude/agents/*.md` specialist team and the delegation rules in `CLAUDE.md`. Always loaded.

## Inputs

- All opted-in repos from tech-stack Q&A
- Tracker choice (referenced by specialists when filing/moving issues)
- Coding practices block (inherited verbatim)
- API contract block (inherited verbatim)

## Specialists to stamp

| File | Created if | Repo owned |
|---|---|---|
| `backend-specialist.md` | always | `{{PROJECT}}-core` |
| `mobile-specialist.md` | mobile ≠ none | `{{PROJECT}}-app` |
| `web-specialist.md` | web ≠ none | `{{PROJECT}}-web` |
| `web-admin-specialist.md` | web_admin = y | `{{PROJECT}}-web-admin` |
| `deployment-specialist.md` | always | `{{PROJECT}}-deployment` |
| `test-specialist.md` | e2e_gate = y | `{{PROJECT}}-app-tests` |

## Specialist prompt skeleton

Each `.claude/agents/<name>.md` has this shape:

```md
---
name: <name>
description: <one-line — when the lead should delegate to this specialist>
---

# <Name>

You own `{{PROJECT}}-<repo>`. Every task that touches this repo is delegated to you. You do not touch other repos — coordinate with the lead via messages if a task spans repos.

## Stack constraints
<rendered from tech-stack.md for this repo>

## API contract (inherited)
<short version from api-contract.md — base path, header versioning, bare resource on success, flat error body>

## Coding practices (inherited)
<universal rules block from coding-practices.md>

## File organization
<the row from coding-practices.md applicable to this repo>

## Repo-specific guidance
<repo-specific section, see below>

## Hard rules
- Never start the dev server or run `npm install` unless the lead asks
- Never push to `main`. PR base is always `dev`.
- Never modify `E:\workspace-nodejs\user-service` (shared service is read-only reference)
- Surface ambiguous requirements back to the lead; do not invent contracts
```

## Repo-specific sections

### backend-specialist

- Knows the API contract intimately — writes routes, controllers, services, models
- Owns Swagger docs for every new endpoint
- Owns DB migrations and indexes
- Writes unit + integration tests inline with feature work
- Must validate request bodies at the controller boundary (Joi/Zod)
- Must surface DB schema changes that may require migration coordination

### mobile-specialist (Flutter)

- Owns `lib/features/<feature>/` for the feature in question
- Mirrors backend API contract — generates client models from Swagger if available
- Adds widget Keys for any new interactive element so `test-specialist` can target it
- Uses `envied` package for `.env` → compiled config (no Flutter flavors yet, matching sc pattern)
- Stamps assets to `pubspec.yaml` properly; never imports a non-declared asset

### web-specialist / web-admin-specialist (Next.js)

- App router (`app/`) by default
- Server components where possible; client components only when interactivity required
- `services/` for API client wrappers, `hooks/` for stateful hooks, `components/` for UI
- Mirrors API contract — `lib/api.ts` returns parsed JSON on `2xx`, throws a typed `ApiError({ code, message, details? })` on `4xx`/`5xx` (parsed from the flat error body)
- For admin: routes under `app/(dashboard)/`

### deployment-specialist

- Owns `docker-compose.yml`, `docker-compose.dev.yml`, `nginx/`, `env/`, monitoring stack
- Knows the prod VM SSH flow (per `deployment.md`)
- Never commits `env/*.env` (only `.env.example`)
- Stamps new services into nginx + compose when backend adds one

### test-specialist (Appium / WebdriverIO / Mocha)

- Owns `<project>-app-tests/`
- Adds page objects in `pageobjects/<feature>.page.js` and specs in `test/<feature>.spec.js`
- Coordinates with `mobile-specialist` so widget Keys exist before specs land
- Maintains the device/APK install flow per `testing-e2e.md`

## CLAUDE.md additions

Append this section to `<root>/CLAUDE.md`:

```md
## Agent Team Workflow

Whenever the user asks for an implementation task in this workspace, the lead (main session) MUST delegate to specialists rather than coding directly. Single-line edits, pure research questions, and workspace-level config changes are the only exceptions.

### Delegation rules

| Task touches | Delegate to |
|---|---|
| `{{PROJECT}}-core/` | `backend-specialist` |
| `{{PROJECT}}-app/` | `mobile-specialist` |
| `{{PROJECT}}-web/` | `web-specialist` |
| `{{PROJECT}}-web-admin/` | `web-admin-specialist` |
| `{{PROJECT}}-deployment/` | `deployment-specialist` |
| `{{PROJECT}}-app-tests/` | `test-specialist` |

Rows for repos that don't exist in this project are omitted.

### Coordination patterns

- **Backend contract changes first.** When a feature spans backend + clients, `backend-specialist` lands the API contract update first; clients (mobile, web, admin) implement against it in parallel.
- **Widget Keys before specs.** When a mobile UI change needs E2E coverage, `mobile-specialist` adds widget Keys and `test-specialist` adds page objects + specs — coordinate in parallel after the lead defines what's testable.
- **nginx changes last.** `deployment-specialist` updates nginx only after the backend route is committed, to avoid 502s in dev.
```

## .claude/settings.json

Stamp this into `<root>/.claude/settings.json`:

```json
{
  "experimental": {
    "agentTeams": true
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|PowerShell",
        "hooks": [
          { "type": "command", "command": "powershell -File .claude/hooks/block-main-pushes.ps1" }
        ]
      }
    ]
  }
}
```

## Hard rules

- Lead never implements directly when a specialist exists for the touched repo
- Specialists never invoke each other directly — coordination goes through the lead
- Every specialist prompt inherits the same coding-practices + api-contract block (single source of truth at scaffold time; freezes from there)
