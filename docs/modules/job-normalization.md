# Job normalization module

## Owns

- Building the shared prompt
- Calling the configured provider router
- Parsing provider text as JSON
- Validating with the normalized-job schema
- Applying user-owned fields such as the employment country and source URL

## Does not own

- React components
- Filesystem persistence
- Job-board scraping
- Contact research or outreach

## Failure behavior

- Empty descriptions are rejected before any provider call.
- A provider may fail and the router may try the next configured provider.
- If every provider fails, the route returns a safe error and saves nothing.
- Invalid model output is never persisted.
