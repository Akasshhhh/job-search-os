# Architecture

## Current shape

This is a modular monolith. The modules have explicit boundaries, but they run in one Next.js application until the workflow proves that separate deployments are worthwhile.

```text
Paste form
   ↓ POST /api/jobs
Job intake route
   ↓
Normalization service → provider router → Gemini / OpenRouter / OpenAI
   ↓ shared Zod contract
Prisma job repository → SQLite
   ↓
Normalized job card + saved jobs list
```

## Module boundaries

- `src/domain`: the stable business contract for a job. It does not import React, Next.js, or a provider SDK.
- `src/llm`: provider adapters, shared normalization prompt, response parsing, and fallback routing.
- `src/server`: persistence. `app/api/jobs/route.ts` composes intake, normalization, and saving. Server modules own credentials and database access.
- `app` and `components`: HTTP/UI concerns. They consume domain-shaped values and do not call provider APIs directly.
- `docs`: short context anchors for contracts and module ownership.

## Future source adapters

LinkedIn, Ashby, or a niche sponsorship site should eventually produce the existing `NormalizationInput` and then enter the same normalization path. `RawJobPosting` is not a separate implemented type. Source adapters must not create their own job schema or bypass validation.

```text
Source adapter → NormalizationInput → normalizeWithFallback() → SavedJob → existing UI
```

## Persistence decision

The first slice uses Prisma with SQLite at `data/jobs.db`. A checked-in migration defines searchable columns, with list fields stored as JSON. Each insert is a database operation, so parallel submissions do not overwrite each other. Only the repository knows Prisma's storage shape.

The current code lives in one application with logical module folders, not multiple workspace packages. Split independently deployed apps or packages only when they exist; do not create empty microservices or duplicate domain contracts for future features.

## Security and provenance

- Local-only host/origin checks protect this unauthenticated personal workspace; public deployment is out of scope.
- Gemini uses its native API; OpenAI and OpenRouter share their compatible chat adapter.
- Keys are sent in headers, never to the browser or in stored jobs.
- Untrusted JD text is separate from system instructions. Zod validates output and known sponsorship needs a quote found in the raw source. This does not guarantee that every semantic inference is correct: review the result.
- A source URL is not automatically labeled as an application URL.
