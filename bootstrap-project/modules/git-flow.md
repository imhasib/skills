# Module: git-flow

Locks branch model, PR base, hotfix policy, and the main-branch protection hook. Always loaded.

## Inputs

- `branch_model` — `main-dev-feature` (default) | `main-feature`
- `hotfix_enabled` — `y` (default) | `n`

## Branch model: `main ← dev ← feature` (default)

```
main         ← release branch (production; only fast-forwarded from dev via release PRs)
  ↑
dev          ← integration branch (the remote dev env deploys from this)
  ↑
<feature>    ← per-issue feature branches, base = dev
```

### Rules

- All feature work branches from `dev`, never `main`.
- All feature PRs target `dev`. Never open a PR against `main` from a feature branch.
- `main` advances only via a **release PR** from `dev` (manual, periodic).
- After scaffold, each repo has both `main` and `dev`; HEAD is on `dev`.
- The block-main-pushes hook prevents accidental direct pushes to `main`.

### Branch naming

If tracker ≠ `none` and an issue ID is known:

- `<issue-id>_<snake_slug>` — e.g. `42_logout_redirect`, `SPCLUB-23_payment_retry`, `PROJ-7_invoice_export`
- No `type/` prefix
- Slug: lowercase ASCII, `_`-separated, ≤5 words, derived from the issue title
- The issue ID matches the tracker's pattern (see `coding-practices.md` → Issue linking). Tracker integrations (GitHub auto-link, Linear Git sync, Jira smart commits) all key off this prefix — getting it right here means PRs and commits auto-link to the ticket without extra plumbing.

If untracked (Mode B):

- `<snake_slug>` only — e.g. `fix_swipe_jitter`

### PR title

Mirrors the commit subject and appends the issue ID in parens:

- `<type>(<scope>)?: <subject> (<issue-id>)` — e.g. `feat(auth): add refresh token (#42)`
- For trackers without `#`-style IDs, drop the `#`: `feat(auth): add refresh token (SPCLUB-42)`
- CI lint job (stamped per `cicd.md`) rejects PR titles missing the issue ID when tracker ≠ `none`.

## Branch model: `main ← feature` (alternative)

For solo or simple projects without a remote dev tier.

- All feature work branches from `main`, PRs target `main`.
- No `dev` branch.
- The block-main-pushes hook still prevents direct *push* to `main` (only PR-merge is allowed).
- Hotfix command behaviour: commits direct to `main` (instead of `dev`).

## Hotfix command (if `hotfix_enabled = y`)

Stamps `<root>/.claude/commands/hotfix.md` with this behaviour:

### Flow

1. **Take input** — issue ID, free-text description, or paste of the diff
2. **Pre-flight**
   - Working tree clean? If not → STOP, ask user to commit/stash
   - On `dev` (or `main` if branch model = `main-feature`)? If not → checkout
   - `git pull origin <branch>` to sync
3. **Make the fix** — delegate to the relevant specialist if cross-stack
4. **Local gate (mandatory, do not skip)**
   - `lint` → fail = STOP, report
   - `typecheck` → fail = STOP, report
   - `unit tests` → fail = STOP, report
5. **Commit** with message: `[hotfix] <subject>` + optional issue ref in body
6. **Push** — literal `git push origin <branch>` (no PR)
7. **Trigger dev deploy** — `gh workflow run deploy.yml --ref <branch>` (or chosen CI command). Poll `/health` (max 10 min). If unhealthy → revert via `git revert HEAD && git push`, STOP.
8. **Tracker update** (if tracker ≠ none) — move ticket → Done (or `Hotfix` column if you configured one)
9. **Append to `<root>/HOTFIX_LOG.md`**:
   ```
   ## <ISO-8601 datetime>
   - Subject: <commit subject>
   - Commit: <short-sha>
   - Issue: <id or "untracked">
   - Bypassed: PR review, E2E gate
   ```

### Hotfix command file content

See `templates/.claude/commands/hotfix.md` (stamped at bootstrap with project variables substituted).

### Hard rules for hotfix

- **Never** push to `main` via hotfix (only `dev` is allowed under default branch model)
- **Never** skip the local gate — the whole point of "controlled bypass" is that lint+typecheck+unit still run
- **Never** stamp a `hotfix.md` that targets `main` unless branch model is explicitly `main-feature`
- Hotfix never invokes the E2E loop — that's its point. If E2E coverage matters, use `/run-issue` instead.
- If three hotfixes land in a 7-day window without a normal `/run-issue` in between, surface a warning to the user — "consider whether the hotfix flow is being abused"

## block-main-pushes.ps1 hook

Stamp `<root>/.claude/hooks/block-main-pushes.ps1` (always — regardless of hotfix choice).

Behaviour: PreToolUse hook on `Bash` and `PowerShell` tool calls.

Blocks:
- `git push <remote> main` (any variant)
- `git push <remote> master`
- `git push --force` / `--force-with-lease` / `-f` to any branch (unless explicitly overridden by user via a temporary env flag)
- `git merge` involving `main` / `master` from CLI

Allows: everything else, including `git push origin dev` (so hotfix works).

See `templates/.claude/hooks/block-main-pushes.ps1` for the actual implementation. Lift it from sc-repos' equivalent and parameterize the protected-branch list.

## What this module renders

- `<root>/.claude/hooks/block-main-pushes.ps1`
- `<root>/.claude/commands/hotfix.md` (if hotfix_enabled = y)
- Section in `<root>/CLAUDE.md` documenting the branch model + protected branches
- Section in `<root>/docs/CODING_PRACTICES.md` about commit + branch naming
- During Phase 5 of bootstrap (per `SKILL.md`):
  - Per repo: `git init -b main`, create `dev`, switch to `dev`, initial commit on `dev`
  - If branch model = `main-feature`: skip `dev` creation; initial commit lands on `main`

## CLAUDE.md addition

```md
## Git Flow

- Default branch: `dev` (remote-dev integration). `main` is production.
- All feature work: branch from `dev`, PR back to `dev`.
- `main` advances via release PR from `dev`, not from features.
- Hotfix: `/hotfix <subject>` — direct push to `dev` after local gate. Logged in `HOTFIX_LOG.md`.
- Direct push to `main` is blocked by `.claude/hooks/block-main-pushes.ps1`.
```
