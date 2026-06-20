# Module: coding-practices

Locks naming, error handling, comments, file org, lint config, commit format. Always loaded.

## Inputs

- `conventional_commits` — `y` (default) | `n`
- `lint_strictness` — `strict` (default) | `normal` | `lenient`

## Universal rules (rendered into every specialist agent prompt)

### Naming

| Kind | Convention | Example |
|---|---|---|
| Variables, function params | `camelCase` | `userId`, `parsedAt` |
| Functions, methods | `camelCase` | `getUserById()` |
| Types, classes, interfaces | `PascalCase` | `UserProfile`, `OrderStatus` |
| Constants (module-level) | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_TTL` |
| Files (JS/TS) | `kebab-case.ts` | `user-service.ts`, `parse-jwt.ts` |
| Files (Flutter/Dart) | `snake_case.dart` | `user_service.dart` |
| React/Next components | `PascalCase.tsx` | `UserCard.tsx` |
| Folders | `kebab-case` | `user-profile/` |
| Mongo collections | `snake_case` plural | `users`, `user_sessions` |
| URL paths | `kebab-case` | `/api/user-profiles` |
| Query params | `camelCase` | `?sortBy=createdAt` |
| Env vars | `SCREAMING_SNAKE_CASE` | `MONGODB_URI`, `JWT_ACCESS_SECRET` |

### Error handling

- **Throw typed errors at boundaries** (services, validators). Never throw raw strings.
- **Map to flat error JSON at the error-handler middleware** (per `api-contract.md`). Controllers throw `ApiError(code, message, statusCode, details?)`; the error-handler middleware is the only place that converts to the wire format. No `success` field, no `error` wrapper — body is `{ code, message, details?, requestId? }` flat.
- **Never swallow errors silently.** If you must ignore one, log it with a reason.
- **No `catch (e) { console.log(e); }`** without context. Always include what failed and the requestId.
- **Validation belongs at the boundary** — request body validators (Joi/Zod), not deep inside services.
- Domain errors carry a `code` (string from `api-contract.md` taxonomy) and an optional `details` object.

### File organization

| Repo | Layout |
|---|---|
| Backend (`{{PROJECT}}-core`) | **Layer-based**: `src/{routes, controllers, services, models, middleware, utils, errors, types}/` |
| Mobile (`{{PROJECT}}-app`) | **Feature-based**: `lib/features/<feature>/{ui, services, models}/` |
| Web / admin | **Feature-based**: `app/(<feature>)/`, `components/<feature>/`, `services/`, `hooks/` |

### Comments

- **Default: no comments.** Named identifiers do the documentation work.
- **Add a comment only when the WHY is non-obvious:** a hidden constraint, a subtle invariant, a workaround for a specific bug, behaviour that would surprise a reader.
- **Never narrate WHAT the code does** ("loop over users", "check if null").
- **Never reference current tasks or PRs in code** ("added for issue #42", "fixes the X flow"). Those rot in the codebase; they belong in the PR description.
- **JSDoc/TSDoc only on public API exports** that aren't self-explanatory from the signature.

### Logging

- Structured (JSON) in production, pretty in dev. `pino` for Node.
- Log levels: `error` (failures), `warn` (recoverable issues), `info` (state transitions), `debug` (dev-only).
- Every log must include `requestId` when within request scope.
- Never log secrets, JWTs, passwords, full request bodies (sample/redact instead).

### Testing

- Test names: `it("returns 404 when user does not exist", ...)` — describe behaviour, not implementation.
- One assertion per test where practical.
- Tests are **first-class code** — same lint rules, same review bar.

## Commit format (if `conventional_commits = y`)

Renders `commitlint.config.js` + `.husky/commit-msg` hook into every code repo.

Format: `<type>(<scope>)?: <subject>`

| Type | When |
|---|---|
| `feat` | New feature for users |
| `fix` | Bug fix for users |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Tooling, config, deps |
| `ci` | CI/CD config |
| `build` | Build system changes |

Subject: imperative, lowercase, no trailing period, ≤72 chars.

### Issue linking (commit body / footer)

If a tracker is configured (Q20 ≠ `none`), commits **should** carry an issue reference. Format depends on the tracker — the orchestrator substitutes `{{ISSUE_REF_PATTERN}}` at stamp time:

| Tracker | Pattern | Example |
|---|---|---|
| `github` | `#<num>` | `Refs #42` / `Closes #42` |
| `linear` | `<TEAM>-<num>` | `Refs SPCLUB-42` / `Fixes SPCLUB-42` |
| `jira` | `<PROJ>-<num>` | `Refs PROJ-42` |
| `clickup` | `CU-<hash>` | `Refs CU-abc123` |

Placement: footer line, on its own. Keywords: `Refs` (link only), `Closes` / `Fixes` (auto-close on merge where the integration supports it).

`commitlint.config.js` adds a custom `references-empty` rule at **warn** level — missing footers don't block the commit, but `git log` callouts show them as a reminder. The PR-level check (below) is the hard gate.

### PR title + body

- **PR title** mirrors the commit subject and appends the issue ID: `<type>(<scope>)?: <subject> (<issue-id>)`
  - e.g. `feat(auth): add refresh token (#42)` or `feat(auth): add refresh token (SPCLUB-42)`
- **PR body** opens with a magic-word line on its own (so the tracker auto-closes / auto-transitions): `Closes #42` / `Fixes SPCLUB-42` / etc.
- The `run-issue` command (`.claude/commands/run-issue.md`) injects both automatically from the issue ID it was given.
- CI lint job re-checks the PR title against the configured `{{ISSUE_REF_PATTERN}}` and fails the check if missing.

## Lint config

### `strict` (default)

- `tsconfig.json` → `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes: true`
- ESLint `@typescript-eslint/strict` + `@typescript-eslint/strict-type-checked`
- Prettier with project defaults (single quotes, no semicolons optional based on team — default semicolons on)

### `normal`

- `tsconfig.json` → `strict: true` only
- ESLint `@typescript-eslint/recommended`

### `lenient`

- `tsconfig.json` → `strict: false`, but `noImplicitAny: true`
- ESLint `@typescript-eslint/recommended` with several rules downgraded to `warn`

## What this module renders

- `<project>-core/.eslintrc.json`
- `<project>-core/.prettierrc`
- `<project>-core/tsconfig.json` (strictness-tuned)
- `<project>-core/commitlint.config.js` (if conventional commits)
- `<project>-core/.husky/pre-commit` (lint + typecheck on staged files via `lint-staged`)
- `<project>-core/.husky/commit-msg` (if conventional commits)
- `<project>-core/.lintstagedrc.json`
- Same files into `<project>-web`, `<project>-web-admin`, `<project>-app-tests` (adjusted for stack)
- `<project>-app/analysis_options.yaml` (Dart/Flutter lint)
- `<project>-app/pubspec.yaml` includes `very_good_analysis` if `strict`, `flutter_lints` if `normal`
- `<root>/docs/CODING_PRACTICES.md` — full reference for new devs
- Specialist agent prompts include the universal rules block

## Hard rules

- Never disable a lint rule inline without a `// eslint-disable-next-line <rule> — <reason>` justification
- Never commit `console.log` outside of explicit debug paths (use the logger)
- Never check in `.env` files — only `.env.example`
- Never bypass `pre-commit` with `--no-verify` (covered by `git-flow.md` hook policy)
