import { buildNormalizationContent, buildNormalizationPrompt } from "@/src/llm/prompt";
import { httpError, LlmProviderError } from "@/src/llm/errors";
import type { LlmProvider, NormalizationInput, ProviderName } from "@/src/llm/types";

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(
    readonly name: Extract<ProviderName, "openai" | "openrouter">,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string,
    private readonly extraHeaders: Record<string, string> = {}
  ) {}

  async generate(input: NormalizationInput): Promise<string> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...this.extraHeaders
        },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          model: this.model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: buildNormalizationPrompt()
            },
            { role: "user", content: buildNormalizationContent(input) }
          ]
        })
      });
    } catch {
      throw new LlmProviderError(`${this.name} network request failed or timed out`, true);
    }

    const payload = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
    if (!response.ok) {
      throw httpError(this.name, response.status);
    }

    const content = payload?.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content.trim() : "";
    if (!text) {
      throw new LlmProviderError(`${this.name} returned no content`, true);
    }

    return text;
  }
}
