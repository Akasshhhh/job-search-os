import type { NormalizedJobDraft } from "@/src/domain/job";

export type ProviderName = "gemini" | "openrouter" | "openai";

export type NormalizationInput = {
  description: string;
  sourceUrl: string | undefined;
  employmentCountry: string;
};

export type ProviderAttempt = {
  provider: ProviderName;
  status: "success" | "failed";
  message?: string;
};

export type NormalizationResult = {
  draft: NormalizedJobDraft;
  provider: ProviderName;
  attempts: ProviderAttempt[];
};

export interface LlmProvider {
  readonly name: ProviderName;
  generate(input: NormalizationInput): Promise<string>;
}
