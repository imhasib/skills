# Module: testing-e2e

End-to-end tests via Appium + WebdriverIO + Mocha. **Only loaded if `e2e_gate = y` AND mobile ≠ none.** Web-only E2E is not in scope yet (use Playwright if you want to add it later — write a new module).

Distilled from `speaking-club/sc-repos/speaking-club-app-tests/`.

## Inputs

- `mobile` — `flutter` | `react-native` (web-only → skip this module)
- `e2e_gate` — `y`
- `staging_domain` — for the app's `.env` pointing to the staging API
- `device_strategy` — `emulator` (default) | `physical` | `cloud` (e.g. BrowserStack)

## Repo: `{{PROJECT}}-app-tests/`

Stamped with this layout:

```
{{PROJECT}}-app-tests/
├── apps/
│   └── {{PROJECT}}.apk           # copied from {{PROJECT}}-app/build/...
├── pageobjects/
│   ├── base.page.js              # shared interactions
│   └── <feature>.page.js         # one per feature screen
├── test/
│   └── specs/
│       └── <feature>.spec.js
├── helpers/
│   ├── auth.js                   # login helper, JWT injection
│   ├── data.js                   # test data factories
│   └── waits.js                  # custom waiters (avoid raw sleeps)
├── wdio.conf.js                  # WebdriverIO config
├── package.json
├── .env.example                  # APPIUM_HOST, STAGING_API, TEST_USER credentials
└── README.md
```

## Key tooling

| Tool | Purpose |
|---|---|
| `appium` | Mobile automation server (start locally or remote) |
| `appium-uiautomator2-driver` | Android driver |
| `appium-xcuitest-driver` | iOS driver (only if iOS in scope) |
| `webdriverio` | Selenium-like client; better than raw Appium client |
| `mocha` | Test runner |
| `chai` | Assertions |
| `wdio-mocha-framework` | Glue |
| `wdio-appium-service` | Auto-starts Appium server during test runs |

## `wdio.conf.js` essentials

- `runner: 'local'`
- `capabilities` block per platform:
  - Android: `{ platformName: 'Android', 'appium:deviceName': '<emulator-or-device>', 'appium:app': './apps/{{PROJECT}}.apk', 'appium:appPackage': '<com.karigor.x>', 'appium:autoGrantPermissions': true }`
- `services: ['appium']`
- `framework: 'mocha'`
- `mochaOpts: { timeout: 90_000 }`
- `baseUrl: process.env.STAGING_API` — page objects use this for any deep-link or HTTP setup

## Widget Key requirement (Flutter)

Specs target widgets by **Key**, not by accessibility label or text (text changes; Keys don't). The `mobile-specialist` agent prompt has a hard rule that any new interactive widget needs a `Key('<feature>_<purpose>')` before the matching spec can land.

Example:
```dart
ElevatedButton(
  key: const Key('login_submit'),
  onPressed: ...,
  child: const Text('Sign in'),
);
```

```js
// page object
async submit() {
  await $('~login_submit').click();   // ~ prefix = accessibility ID match in Appium
}
```

## Page object pattern

```js
// pageobjects/login.page.js
class LoginPage {
  get emailInput()    { return $('~login_email'); }
  get passwordInput() { return $('~login_password'); }
  get submitButton()  { return $('~login_submit'); }

  async login(email, password) {
    await this.emailInput.setValue(email);
    await this.passwordInput.setValue(password);
    await this.submitButton.click();
  }
}
module.exports = new LoginPage();
```

## Spec pattern

```js
// test/specs/login.spec.js
const LoginPage = require('../../pageobjects/login.page');
const { freshTestUser } = require('../../helpers/data');

describe('Login', () => {
  it('signs in with valid credentials', async () => {
    const user = await freshTestUser();
    await LoginPage.login(user.email, user.password);
    await expect($('~home_greeting')).toBeDisplayed();
  });

  it('shows error on invalid credentials', async () => {
    await LoginPage.login('bad@example.com', 'wrong');
    await expect($('~login_error_banner')).toBeDisplayed();
  });
});
```

## APK build flow (matches sc pattern)

1. `cd {{PROJECT}}-app`
2. Ensure `.env` points at `{{STAGING_API}}` (no flavors yet — relies on `envied` to embed env at build time)
3. `dart run build_runner build --delete-conflicting-outputs` — regenerate env bindings
4. `flutter build apk --release`
5. `cp build/app/outputs/flutter-apk/app-release.apk ../{{PROJECT}}-app-tests/apps/{{PROJECT}}.apk`

`/run-e2e` automates this when the mobile repo was touched in the run. If not touched, the existing APK is reused (skip rebuild).

## Running specs

```bash
cd {{PROJECT}}-app-tests
npm install
npm test                          # runs all specs
npm test -- --spec test/specs/login.spec.js   # single spec
```

Appium server starts via `wdio-appium-service` — no separate process needed.

## Triage (referenced from `workflow.md` `/run-e2e`)

E2E failures classify as:
- **In-scope** — caused by our changes → fix inline (budget: `{{iter_budget_run_e2e}}`, default 2)
- **Out-of-scope** — pre-existing flake or environmental → file tracker ticket, don't block PR
- **Blocker** — security / data integrity / availability → pause PR for human decision

## What this module renders

- `{{PROJECT}}-app-tests/wdio.conf.js`
- `{{PROJECT}}-app-tests/package.json` with the toolchain pinned
- `{{PROJECT}}-app-tests/pageobjects/base.page.js`
- `{{PROJECT}}-app-tests/helpers/{auth.js, data.js, waits.js}`
- Sample spec: `test/specs/smoke.spec.js` that boots the app and asserts the splash screen renders
- `{{PROJECT}}-app-tests/.env.example`
- `{{PROJECT}}-app-tests/README.md` — how to run, device strategy, APK rebuild
- `<root>/.claude/agents/test-specialist.md` — owns this repo, knows the page object + key conventions
- `<root>/.claude/commands/run-e2e.md` — workflow command (already covered by `workflow.md`)
- Section in `<root>/CLAUDE.md` documenting the E2E gate + URL of the staging API

## Hard rules

- **Never use `sleep`/`browser.pause()` as a wait strategy** — use explicit waiters (`waitForDisplayed`, `waitForExist`)
- **Never target widgets by text** in Flutter specs — text is localized and changes; Keys are stable
- **Never run E2E in parallel** when staging is single-tenant (per `cicd.md`)
- **Never auto-mark a PR ready-for-review** if E2E budget exhausted — PR stays draft; user decides
- APK in `apps/` must come from a release build of the **same branch** — `/run-e2e` verifies this in the deploy-check phase
