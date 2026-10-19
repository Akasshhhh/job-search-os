# Project agreement

## Goal

Reduce the repetitive work of turning a promising job posting into a tracked opportunity. The first useful outcome is a trustworthy normalized job record that can be reviewed and reused by future research, outreach, and filtering modules.

## Current slice

The user pastes a job description, optionally supplies its source URL, and chooses an employment country (default: India). The server asks a configured LLM to normalize the description, validates the result, saves it, and returns it to the frontend.

## In scope

- Single-user local application
- Paste-based job intake
- Provider-agnostic LLM normalization
- Gemini as the default provider, with OpenRouter and OpenAI fallback adapters
- Normalized job fields for remote work and sponsorship
- Prisma/SQLite persistence and a saved-jobs list
- Visible loading, success, empty, and failure states

## Out of scope for this slice

- Scraping job boards or browser extensions
- People research, email enrichment, Gmail, or outreach
- Authentication and multi-user access
- Automatic applications or follow-ups
- Production deployment and hosted database setup

## Non-negotiable behavior

- A missing value in the source must remain `null`, `unknown`, or an empty list; the model must not invent it.
- Model output is validated before persistence.
- Sponsorship is `yes`, `no`, `conditional`, or `unknown`, never an inferred boolean.
- `employmentCountry` defaults to `India` and represents the user's target employment country, not the posting's advertised location.
- Provider credentials never reach the browser.

## Start-of-session context

Read this file and `docs/STATUS.md`, then only the contract/module document relevant to the current change. `docs/architecture.md` maps real code entry points; `docs/modules/components.md` is the reusable-UI inventory.
