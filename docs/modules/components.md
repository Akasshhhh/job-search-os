# Reusable UI inventory

Read this before creating overlapping UI. Components are React/TypeScript with shared CSS in `app/globals.css`; no UI framework or Tailwind setup is needed for this slice.

| Component | Owns | Reuse rule |
| --- | --- | --- |
| `JobIntakeForm` (`components/job-intake-form.tsx`) | JD/source/country input, pending/error/success messages | Extend this intake for another pasted-input option; do not put provider calls in it. |
| `JobCard` (`components/job-card.tsx`) | All saved job fields, sponsorship evidence, raw-text audit, source links | Both current results and saved jobs already reuse this; future ingestion sources should use it unchanged. |
| `SavedJobs` (`components/saved-jobs.tsx`) | Pipeline heading/count, empty state, list of `JobCard`s | Consume `SavedJob[]`, independent of provider or source. |
| `Fact`, `ListSection`, `Tag` (inside `job-card.tsx`) | Consistent job field/list/badge display | Extract/export only if a second module actually needs them. |
| `HomePage` (`app/page.tsx`) | Browser loading state and form/result/list composition | Keep business normalization and storage on the server. |

**State ownership:** `HomePage` reads saved jobs and merges confirmed new records. The form owns transient inputs. A focused result heading announces new output. No extraction stubs or sample records are shipped in the app.

**Accessibility:** native labels/fieldset, disabled pending controls, named error alert, polite status, visible keyboard focus, reduced motion, and wrapping mobile layouts. Browser automation covers desktop and a mobile viewport; a dedicated screen-reader audit is not claimed.
