import { normalizedJobDraftSchema, type NormalizedJobDraft } from "@/src/domain/job";
import { LlmProviderError } from "@/src/llm/errors";

function removeMarkdownFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export function parseNormalizedJob(value: string, description?: string): NormalizedJobDraft {
  const cleaned = removeMarkdownFence(value);
  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end <= start) {
      throw new LlmProviderError("Provider returned non-JSON output", true);
    }

    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      throw new LlmProviderError("Provider returned malformed JSON", true);
    }
  }

  const result = normalizedJobDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw new LlmProviderError("Provider JSON did not match the job contract", true);
  }

  if (description && result.data.sponsorshipEvidence) {
    const normalizeWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();
    if (!normalizeWhitespace(description).includes(normalizeWhitespace(result.data.sponsorshipEvidence))) {
      throw new LlmProviderError("Sponsorship evidence was not found in the source description", true);
    }
  }

  return result.data;
}
