# Module: testing-unit

Unit-test setup per stack. Always loaded.

## Inputs

- `backend_runtime` — drives test framework (Node → Jest or Vitest)
- `mobile` — Flutter → `flutter test`, RN → Jest
- `web`, `web_admin` — Next.js → Vitest (or Jest if user prefers)
- `lint_strictness` — affects test config strictness

## Framework defaults

| Repo | Framework | Why |
|---|---|---|
| `{{PROJECT}}-core` (Node) | **Vitest** | Faster than Jest, native ESM support, same API |
| `{{PROJECT}}-app` (Flutter) | `flutter test` | Built-in |
| `{{PROJECT}}-web` / `-web-admin` (Next.js) | **Vitest** + Testing Library | Aligns with backend, faster |
| `{{PROJECT}}-app-tests` (Appium) | Mocha (E2E only, no units here) | — |

## What "unit" means here

- **Pure function or single-class** under test
- **No real I/O** — no DB, no HTTP, no FS, no clock unless explicitly faked
- **One file under test per spec file** by convention — `foo.ts` → `foo.test.ts` next to it
- **Fast** — entire unit suite should run in under 30s on a developer's laptop

What does NOT belong in unit tests:
- Database operations (use **integration** per `testing-integration.md`)
- Full HTTP request cycles (integration)
- Cross-service calls (integration)

## Backend unit conventions (Node + Vitest)

### File layout

```
src/services/user-service.ts
src/services/user-service.test.ts          ← unit
src/services/__integration__/user-service.int.test.ts   ← integration (different module)
```

Separating with `.test.ts` vs `.int.test.ts` (and a sub-folder) lets the CI run them as distinct jobs.

### Vitest config (`vitest.config.ts`)

```ts
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],          // unit only — integration has its own config
    exclude: ['**/__integration__/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/__integration__/**', '**/types/**', 'src/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
```

### Mocking policy

- **Mock external dependencies, not internal helpers.** If `userService` calls `db.users.findOne`, mock `db`. Do not mock `parseEmail()` if `parseEmail` is in the same module.
- **Use `vi.fn()` and `vi.spyOn()`** — never replace real implementations globally
- **Reset mocks between tests** — `beforeEach(() => vi.resetAllMocks())`
- **No global setup for unit tests** — each test must run in isolation

### Naming

```ts
describe('UserService', () => {
  describe('getById', () => {
    it('returns the user when found', async () => { ... });
    it('throws USER_NOT_FOUND when no user exists', async () => { ... });
    it('throws on invalid id format', async () => { ... });
  });
});
```

Test names describe **behaviour**, never implementation details.

## Flutter unit conventions

- File next to source: `lib/foo.dart` → `test/foo_test.dart` (matches Dart convention)
- Use `flutter_test`'s `group()` / `test()` blocks
- Mock platform channels with `mockito` or hand-rolled fakes
- No widget tests in this tier — widget tests are integration-level (see `testing-integration.md`)

## Next.js unit conventions

- Same Vitest setup as backend
- React Testing Library for component logic (rendering, prop handling) — but **only pure components** at unit level; data-fetching components belong to integration
- Use `@testing-library/jest-dom` matchers (Vitest-compatible via `vitest.setup.ts`)

## What this module renders

- `<project>-core/vitest.config.ts`
- `<project>-core/package.json` — `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`
- `<project>-web/vitest.config.ts` + `vitest.setup.ts`
- `<project>-web-admin/vitest.config.ts` + `vitest.setup.ts`
- `<project>-app/` — Flutter test scaffold (`test/` directory exists by default; just sample test stamped)
- Sample tests in each repo: one passing test as a smoke check so `npm test` immediately works
- Section in `<root>/docs/CODING_PRACTICES.md` summarizing unit-test boundaries

## Hard rules

- Never touch a real DB / Redis / HTTP in unit tests
- Never use `setTimeout` real waits — fake timers (`vi.useFakeTimers()`)
- Never skip tests in committed code (`.skip` is a code smell; remove or fix)
- Coverage thresholds enforce a floor, not a goal — write meaningful tests, not coverage padding
- If a unit test needs more than 50ms, it's probably an integration test in disguise
