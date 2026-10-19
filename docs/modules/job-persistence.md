# Job persistence module

## Owns

- Reading and writing saved jobs
- SQLite inserts and deterministic newest-first reads through Prisma

## Does not own

- Normalizing text
- Deciding whether a job is a good fit
- Provider credentials
- UI state

The server's domain builder creates stable IDs and timestamps before saving. The repository validates on write and read. `prisma/schema.prisma` and `prisma/migrations/` own the storage contract. The database file is gitignored.

The repository is intentionally a small single-user implementation. `jobsRepository()` exposes `saveJob()` and `listJobs()`; callers do not import Prisma. Changing storage later should preserve those operations.
