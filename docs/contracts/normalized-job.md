# Normalized job contract

The normalized job is the shared contract between intake, LLM normalization, persistence, future source adapters, and the frontend.

## Fields

| Field | Meaning |
| --- | --- |
| `title` | Role title. Required and non-empty. |
| `company` | Employer name, or `null` when absent. |
| `jobLocation` | Location stated by the posting. This is not the user's target country. |
| `employmentCountry` | Country where the user wants to be employed. Defaults to `India`. |
| `workplaceType` | `remote`, `hybrid`, `onsite`, or `unknown`. |
| `employmentType` | Full-time, contract, internship, or another stated type. |
| `seniorityLevel` | Stated level, such as senior or entry. |
| `sponsorship` | `yes`, `no`, `conditional`, or `unknown`. |
| `sponsorshipEvidence` | Exact supporting phrase from the posting; whitespace is normalized for comparison. |
| `experienceRequirements` | Required experience statements. |
| `skills` | Required or preferred skills explicitly named. |
| `responsibilities` | Main responsibilities explicitly named. |
| `compensation` | Salary or benefits text, or `null`. |
| `applicationUrl` | Application link when known. |
| `sourceUrl` | Original source URL supplied by the user. |
| `sourceType` | `pasted_jd` for this slice. |
| `rawDescription` | Original, unmodified pasted text. |

## Invariants

- `employmentCountry` is never inferred from `jobLocation`.
- `sponsorshipEvidence` must be present when sponsorship is `yes`, `no`, or `conditional`; it is `null` for `unknown`. The parser rejects a quote not found in the input.
- `unknown` is the correct value when the source is silent or ambiguous.
- The raw description is retained so a later normalizer or human can audit the result.
- Source links accept only HTTP(S). `applicationUrl` stays null in this slice; `sourceUrl` is not proof of an application link.
- Saved records add `id`, `createdAt`, and `provider`. Model-generated ownership/provenance fields are ignored; the server supplies them.
