import { z } from "zod";

export const workplaceTypeSchema = z.enum(["remote", "hybrid", "onsite", "unknown"]);
export const sponsorshipStatusSchema = z.enum(["yes", "no", "conditional", "unknown"]);
export const sourceTypeSchema = z.enum(["pasted_jd", "url", "linkedin", "ashby", "other"]);

const nullableText = z.string().trim().min(1).max(6_000).nullable().optional().default(null);
const textList = z.array(z.string().trim().min(1).max(2_000)).max(100).optional().default([]);
const httpUrl = z.string().trim().url("Enter a valid URL").max(2_000).refine(
  (value) => URL.canParse(value) && ["https:", "http:"].includes(new URL(value).protocol),
  "Use an HTTP or HTTPS source URL"
);

/** Model output plus user-owned fields that are safe to persist. */
const normalizedJobFields = z.object({
  title: z.string().trim().min(1, "A job title is required").max(500),
  company: nullableText,
  jobLocation: nullableText,
  workplaceType: workplaceTypeSchema.optional().default("unknown"),
  employmentType: nullableText,
  seniorityLevel: nullableText,
  sponsorship: sponsorshipStatusSchema.optional().default("unknown"),
  sponsorshipEvidence: nullableText,
  experienceRequirements: textList,
  skills: textList,
  responsibilities: textList,
  compensation: nullableText
});

function validateSponsorship(
  job: { sponsorship: string; sponsorshipEvidence: string | null },
  ctx: z.RefinementCtx
) {
  if (job.sponsorship !== "unknown" && !job.sponsorshipEvidence) {
    ctx.addIssue({ code: "custom", path: ["sponsorshipEvidence"], message: "Known sponsorship requires supporting evidence" });
  }
  if (job.sponsorship === "unknown" && job.sponsorshipEvidence !== null) {
    ctx.addIssue({ code: "custom", path: ["sponsorshipEvidence"], message: "Unknown sponsorship must not claim supporting evidence" });
  }
}

export const normalizedJobDraftSchema = normalizedJobFields.superRefine(validateSponsorship);

export const createJobInputSchema = z.object({
  // Validate using trimmed length without modifying the audit copy.
  description: z.string().max(60_000, "Job descriptions must be under 60,000 characters")
    .refine((value) => value.trim().length >= 30, "Paste at least 30 characters from the job description"),
  sourceUrl: z.union([httpUrl, z.literal("")]).optional(),
  employmentCountry: z.string().trim().min(1).max(100).default("India")
});

export const savedJobSchema = normalizedJobFields.extend({
  id: z.string().min(1),
  employmentCountry: z.string().min(1),
  applicationUrl: httpUrl.nullable(),
  sourceUrl: httpUrl.nullable(),
  sourceType: sourceTypeSchema,
  rawDescription: z.string().min(1),
  createdAt: z.string().datetime(),
  provider: z.string().min(1)
}).superRefine(validateSponsorship);

export type NormalizedJobDraft = z.infer<typeof normalizedJobDraftSchema>;
export type CreateJobInput = z.infer<typeof createJobInputSchema>;
export type SavedJob = z.infer<typeof savedJobSchema>;

export function buildSavedJob(
  draft: NormalizedJobDraft,
  input: CreateJobInput,
  provider: string
): SavedJob {
  const sourceUrl = input.sourceUrl || null;

  return savedJobSchema.parse({
    ...draft,
    id: crypto.randomUUID(),
    employmentCountry: input.employmentCountry,
    // A source posting is not necessarily an application link.
    applicationUrl: null,
    sourceUrl,
    sourceType: "pasted_jd",
    rawDescription: input.description,
    createdAt: new Date().toISOString(),
    provider
  });
}
