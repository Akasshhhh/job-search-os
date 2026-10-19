import {
  AllProvidersFailedError,
  LlmConfigurationError,
  LlmProviderError
} from "@/src/llm/errors";
import { parseNormalizedJob } from "@/src/llm/parse";
import { GeminiProvider } from "@/src/llm/providers/gemini";
import { OpenAiCompatibleProvider } from "@/src/llm/providers/openai-compatible";
import type {
  LlmProvider,
  NormalizationInput,
  NormalizationResult,
  ProviderAttempt,
  ProviderName
} from "@/src/llm/types";

const providerNames: ProviderName[] = ["gemini", "openrouter", "openai"];

export async function normalizeWithFallback(
  input: NormalizationInput,
  providers: LlmProvider[] = configuredProviders()
): Promise<NormalizationResult> {
  if (providers.length === 0) {
    throw new LlmConfigurationError(
      "No LLM provider is configured. Set a provider API key and its model ID in .env or .env.local, then restart the server. Note: .env.local overrides .env, even for blank values."
    );
  }

  const attempts: ProviderAttempt[] = [];
  for (const provider of providers) {
    try {
      const text = await provider.generate(input);
      const draft = parseNormalizedJob(text, input.description);
      attempts.push({ provider: provider.name, status: "success" });
      return { draft, provider: provider.name, attempts };
    } catch (error) {
      const message = safeErrorMessage(error);
      attempts.push({ provider: provider.name, status: "failed", message });

      if (!(error instanceof LlmProviderError) || !error.retryable) {
        break;
      }
    }
  }

  throw new AllProvidersFailedError(
    attempts.map(({ provider, message }) => ({ provider, message: message || "request failed" }))
  );
}

export function configuredProviders(env: Record<string, string | undefined> = process.env): LlmProvider[] {
  const primary = normalizeProviderName(env.LLM_PRIMARY_PROVIDER || "gemini");
  const fallback = (env.LLM_FALLBACK_PROVIDERS ?? "openrouter,openai")
    .split(",")
    .filter((value) => value.trim())
    .map(normalizeProviderName);
  const order = [...new Set([primary, ...fallback])];

  return order.flatMap((name) => {
    const provider = createProvider(name, env);
    return provider ? [provider] : [];
  });
}

function createProvider(name: ProviderName, env: Record<string, string | undefined>): LlmProvider | null {
  const prefix = name === "gemini" ? "GEMINI" : name === "openrouter" ? "OPENROUTER" : "OPENAI";
  const key = env[`${prefix}_API_KEY`]?.trim();
  if (!key) return null;
  const model = env[`${prefix}_MODEL`]?.trim();
  if (!model) throw new LlmConfigurationError(`Set ${prefix}_MODEL in .env or .env.local for the configured ${name} provider. Check for blank overrides in .env.local.`);

  if (name === "gemini") {
    return new GeminiProvider(key, model);
  }

  if (name === "openrouter") {
    return new OpenAiCompatibleProvider(
      "openrouter",
      key,
      model,
      "https://openrouter.ai/api/v1",
      {
        "HTTP-Referer": env.OPENROUTER_SITE_URL || "http://localhost:3000",
        "X-Title": env.OPENROUTER_SITE_NAME || "Job Search OS"
      }
    );
  }

  return new OpenAiCompatibleProvider(
    "openai", key, model, "https://api.openai.com/v1"
  );
}

function normalizeProviderName(value: string | undefined): ProviderName {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || !providerNames.includes(normalized as ProviderName)) {
    throw new LlmConfigurationError("Provider order must only contain gemini, openrouter, or openai.");
  }
  return normalized as ProviderName;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof LlmProviderError) {
    return error.message;
  }
  return "Unexpected provider response";
}
