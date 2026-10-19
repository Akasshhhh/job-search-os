import { buildNormalizationContent, buildNormalizationPrompt } from "@/src/llm/prompt";
import { httpError, LlmProviderError } from "@/src/llm/errors";
import type { LlmProvider, NormalizationInput } from "@/src/llm/types";

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

export class GeminiProvider implements LlmProvider {
  readonly name = "gemini" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async generate(input: NormalizationInput): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: buildNormalizationPrompt() }] },
          contents: [{ parts: [{ text: buildNormalizationContent(input) }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });
    } catch {
      throw new LlmProviderError("Gemini network request failed or timed out", true);
    }

    const payload = (await response.json().catch(() => null)) as GeminiResponse | null;
    if (!response.ok) {
      throw httpError("Gemini", response.status);
    }

    const parts = payload?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.map((part) => typeof part?.text === "string" ? part.text : "").join("").trim()
      : "";

    if (!text) {
      throw new LlmProviderError("Gemini returned no content", true);
    }

    return text;
  }
}
