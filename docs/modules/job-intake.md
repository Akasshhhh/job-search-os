# Job intake

**Entry:** `components/job-intake-form.tsx` → `POST /api/jobs` (`app/api/jobs/route.ts`).

**Input:** pasted `description` (30–60,000 characters), optional HTTP(S) `sourceUrl`, `employmentCountry` default `India`.

**Flow:** validate request → `normalizeWithFallback()` → `buildSavedJob()` → `saveJob()` → return the saved record → update the reusable job cards.

**Owns:** local host/origin protection, bounded JSON intake, input errors, orchestration. The form locks while pending, retains input after errors, and clears JD/source only after a confirmed save. Country stays selected for the next posting.

**Does not own:** URL fetching, actual applications, editing extracted data, status tracking, email.

**Invariant:** invalid input causes no provider call; failed normalization saves no job. The source URL is reference-only. `GET /api/jobs` is uncached and returns persisted records.

**Tests:** `tests/api-persistence.test.ts` uses a real temporary SQLite DB with a stubbed external LLM; `tests/browser/intake.spec.ts` checks real missing-config behavior and a separately labeled HTTP-stubbed UI success case.
