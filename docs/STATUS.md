# Current handoff — first slice

## Built

- Paste JD + optional reference URL + target employment country default India.
- Native Gemini adapter and shared OpenAI/OpenRouter chat adapter, with configurable order, explicit model IDs, 30-second attempts, and bounded fallback.
- Shared Zod contract; user-owned fields cannot be overridden by the model. Sponsorship supports yes/no/conditional/unknown and requires source-matching evidence for known values.
- Prisma/SQLite save and newest-first list, with a checked-in migration.
- Responsive intake/results/saved-card UI, accessible pending/error states, all extracted list items, and expandable original text.
- Compact contract/module/reuse docs plus root `AGENTS.md` to guide later sessions.

## Actual verification

Completed on 2026-10-18 using Node 24.2.0:

| Command | Result |
| --- | --- |
| `npm ci` | Passed; Prisma client generated. Final ESLint version is 9.39.5 to match Next's lint-plugin peer ranges. |
| `npm run db:setup` | Passed; migration applied, later re-run had no pending migrations. |
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed. |
| `npm test` | 13 passed. Includes real temporary SQLite, route orchestration, reload/reopen, concurrent saves, invalid input, fallback, and safe errors. External LLM calls are stubbed. |
| `npm run build` | Passed with Next.js 16.4.2. |
| `npm run test:e2e` | 4 passed: desktop/mobile missing-config flow against the real route, and separately HTTP-stubbed browser success/reload cases. |
| `npm audit --omit=dev` | Zero production vulnerabilities reported. |
| `npm audit` | Still reports 5 high-severity development-toolchain entries through `braces` → `micromatch` → Next's ESLint plugin. No forced downgrade was applied. |
| Local preview HTTP smoke | `/` and `/api/jobs` both returned 200; user DB contained zero records. |

In this session, Playwright Chromium was installed under a temporary approved directory. The executed browser command was:

```bash
PLAYWRIGHT_BROWSERS_PATH="/var/folders/qh/jwphwtnx1rn1ydjh_d8rpj2w0000gr/T/omnirush/playwright" npm run test:e2e
```

For a fresh machine use the standard `npx playwright install chromium` then `npm run test:e2e`.

## Preview and artifacts

- Development server: `http://localhost:3000` (bound to 127.0.0.1).
- Desktop screenshot: `docs/previews/intake-desktop.png`.
- Mobile screenshot: `docs/previews/intake-mobile.png`.
- Screenshots show the real empty intake page, not invented live LLM results.

## Required next step / not yet verified

Provider configuration is now detected successfully after the environment-precedence repair below. Keep credentials in the private `.env` or `.env.local`; do not send them in chat. Paste one real JD in the restarted preview and confirm normalize → save → browser refresh. OpenRouter and OpenAI remain optional fallbacks and untested against live APIs.

Live extraction quality, provider latency, and account-specific model access are not yet verified. The provider adapters, fallback/error behavior, and persistence were verified with external calls stubbed; this is not a live-provider success claim.

ESLint 9 is deprecated upstream but currently matches the bundled React/import/accessibility plugin peer ranges. Review lint tooling when those plugins support ESLint 10; keep the development-only audit findings visible rather than force-downgrading Next.

This is a local modular monolith, not a deployed multi-user service or a multi-package workspace yet. No URL scraping, contact lookup, applications, email sending, editable review, or pipeline-status automation is implemented. The next approved step should be based on feedback from the first real pasted JD, not speculative modules.

## Follow-up: `.env` provider detection repair

**Cause:** the original blank provider assignments in `.env.local` took precedence over working configuration in `.env`. Next.js treats an empty value as an explicit override, not an absent variable.

**Fix:** left optional local overrides commented, made `.env.example` non-overriding until settings are deliberately uncommented, clarified the setup docs and configuration errors, and left the user's `.env` untouched. No custom dotenv loader or new dependency was added.

**Regression:** `tests/env-loading.test.ts` uses Next's real environment loader with fictional credentials. It failed before the template change (no providers detected) and passes after it (Gemini detected). A separate actual-configuration check printed only presence booleans and provider names, never credentials or model values.

**Rechecked:** `npm run lint`, `npm run typecheck`, `npm test` (14 passed), `npm run build`, and desktop/mobile `npm run test:e2e` (4 passed). The existing app server was restarted after confirming its process belonged to this workspace; `/` and `/api/jobs` returned 200 at `http://localhost:3000`.

No live provider call was made during this repair, and no new job was inserted into the user's database. End-to-end live extraction quality remains to be checked with the user's next posting.
