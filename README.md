# Job Search OS

A personal job-search workspace. The first slice turns a pasted job description into a validated, saved job record and displays it in the browser.

## Run it

```bash
npm install
test -f .env || cp .env.example .env
# Uncomment and set GEMINI_API_KEY and GEMINI_MODEL in .env.
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app tries the configured providers in this order:

1. `LLM_PRIMARY_PROVIDER` (defaults to `gemini`)
2. Providers listed in `LLM_FALLBACK_PROVIDERS`

Provider keys stay on the server. Jobs are stored in SQLite at `data/jobs.db` through Prisma. The app binds to loopback only and is intentionally personal/local: do not expose it publicly without authentication.

## Provider setup

Edit `.env` or `.env.local` locally; do not paste credentials into chat. Both files are gitignored. Example settings are commented until you intentionally enable them.

```env
GEMINI_API_KEY=your-private-key
GEMINI_MODEL=your-available-text-model-id
```

Model IDs are explicit because provider catalogs change. Choose a Gemini text model available in your [Google AI Studio](https://aistudio.google.com/) account; do not use the `models/` prefix. For OpenRouter or OpenAI, set both the corresponding key and model ID. Missing keys skip a provider; a key without a model is a configuration error. Restart the development server after editing environment variables.

**Environment precedence:** shell variables → `.env.development.local` (or `.env.production.local`) → `.env.local` → `.env.development` (or `.env.production`) → `.env`. A blank assignment such as `GEMINI_API_KEY=` in `.env.local` still overrides a working value in `.env`. Remove/comment unused overrides instead of duplicating credentials. `npm run dev` does not require a preceding build. If you already have a server on port 3000, stop that terminal's server first so you do not accidentally keep using an older instance.

Temporary failures fall back in order; authentication and model-configuration errors stop with a visible error instead of quietly spending another provider's credits. One attempt per provider has a 30-second timeout. Pasted text is sent to the provider(s) attempted. No real normalization is simulated when credentials are absent.

An optional `DATABASE_URL=file:/absolute/path/jobs.db` selects another SQLite database at runtime; apply the checked-in migration to it before use. The default migration command creates `data/jobs.db`.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

See `docs/PROJECT.md` and `docs/architecture.md` for the current boundaries and the next safe extension points.

Node.js 22.16+ is required. Dependency versions and a lockfile are included. `deepmerge-ts` is pinned to 8.0.0 via an override to avoid the recursive-merge advisory in Prisma's transitive configuration dependency; the Prisma migration/generation commands are verified with this override. See `docs/STATUS.md` for actual verification and known gaps.
