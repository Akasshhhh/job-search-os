# Workspace guide

This is a local, single-user job-search application. Work one visible slice at a time.

## Recover context cheaply

1. Read `docs/PROJECT.md` and `docs/STATUS.md`.
2. For the area being changed, read its entry in `docs/modules/` and the relevant `docs/contracts/` file.
3. Inspect the actual code and tests before changing the contract.

## Reuse first

- Domain schema: `src/domain/job.ts` is the shared source of truth.
- LLM calls: use `normalizeWithFallback()` in `src/llm/provider-router.ts`; keep provider details in adapters.
- Storage: use `src/server/jobs-repository.ts`, not Prisma in routes or UI.
- UI: consult `docs/modules/components.md` before making another job card, form, or list.
- Future imports should enter the existing normalization path rather than fork it.

Keep boundaries explicit but do not add empty packages/services for hypothetical features. No scraping, enrichment, outreach, or sending without a new approved slice.

## Validate and document

Run the smallest meaningful tests plus `npm run typecheck`, `npm run lint`, and `npm run build` for a finished slice. Browser checks use `npm run test:e2e`; provider tests use stubs and never spend real credits. Keep stubs out of the running app.

Update the relevant compact module/contract doc when behavior changes, and `docs/STATUS.md` with actual checks and the next step. Never copy credentials, raw private notes, or real provider payloads into documentation. `.env.local` and `data/jobs.db` remain private and uncommitted.
