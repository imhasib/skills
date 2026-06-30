---
description: Production hotfix — local gate → direct push to dev. Never touches main. Logged.
argument-hint: <one-line-cause> [--repo=<repo-name>]
---

Apply an **urgent fix** directly to `dev`. This bypasses the usual PR review path because the issue is too urgent to wait — typically a production-impacting incident, but also covers dev blockers if those are gating shipped work. Use sparingly — anything that can go through `/run-issue` should.

User input: `$ARGUMENTS`

---

## Step 1 — Refuse if log is unresolved

Read `HOTFIX_LOG.md`. If the last entry has no `Verification` value **and** is >24h old → STOP and tell the user:

```
Previous hotfix is unresolved (no Verification recorded). Close it out in HOTFIX_LOG.md
before running another hotfix.
```

This forces every hotfix to reach a documented resolution.

---

## Step 2 — Confirm scope

Inspect `$ARGUMENTS`. Expect:

- A `--repo=<repo-name>` flag identifying which repo the fix lands in. If absent, ask the user.
- A one-line cause description. If absent, ask the user.

Confirm the repo is one of the in-scope code repos (not `{{PROJECT}}-deployment`, not `{{USER_SERVICE_PATH}}`).

If the impact target is production but production hasn't been configured yet (`/configure-prod` not run), warn the user — usually the right move in that case is to fix through normal `/run-issue` instead, since there's nothing live to hotfix.

---

## Step 3 — Pre-flight

1. `git status` in the target repo — uncommitted changes must already be the fix (no extra work-in-progress mixed in)
2. Current branch must be a feature branch off `dev`, **not** `dev` itself, **not** `main`
3. The diff size: if >100 LOC, ask: *"This is large for a hotfix ({n} LOC). Confirm you want to bypass PR review? [y/N]"* — default N

---

## Step 4 — Local gate

In order, in the target repo:

```bash
{{PACKAGE_MANAGER}} run lint
{{PACKAGE_MANAGER}} run typecheck   # if applicable
{{PACKAGE_MANAGER}} test            # unit only — integration is too slow for a hotfix
```

Any failure → STOP. Fix and re-run. No iteration budget enforcement — hotfix is human-driven.

---

## Step 5 — Commit + push

```bash
git add <files>
git commit -m "fix: <one-line-cause>"
git checkout dev
git pull origin dev
git merge --no-ff <hotfix-branch>
git push origin dev
```

The `block-main-pushes.ps1` hook permits this (it only blocks `main`/`master`).

---

## Step 6 — Log it

Append a row to `HOTFIX_LOG.md`:

| Field | Value |
|---|---|
| Date (UTC) | `<now>` |
| Repo | `<repo>` |
| Branch (from `dev`) | `<hotfix-branch>` |
| Author | `<git config user.name>` |
| Issue link | `<tracker link or "none">` |
| One-line cause | `<from $ARGUMENTS>` |
| Verification | `pending — fill in within 24h` |
| Follow-up PR | `pending — open a normal PR to back-fill review` |

---

## Step 7 — Output

```
🔥 Hotfix pushed: <repo>@dev <sha>
   Cause: <one-line>
   Branch (local): <hotfix-branch>

Next:
  1. Verify on dev (and on production, if launched) within 24h and update
     HOTFIX_LOG.md "Verification"
  2. Open a normal PR for the same change (back-filled review) — note in "Follow-up PR"
```

---

## Hard rules

- **Never** push to `main` from this command — only `dev`
- **Never** skip the local gate (lint + typecheck + unit)
- **Never** stamp a hotfix without a tracker issue link OR an explicit "none — incident report only" reason
- **Never** combine multiple unrelated fixes in one hotfix
- **Never** run two hotfixes in parallel — `HOTFIX_LOG.md` is the serialization point
