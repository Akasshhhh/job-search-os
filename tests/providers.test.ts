import assert from "node:assert/strict";
import test from "node:test";
import { AllProvidersFailedError, LlmConfigurationError, LlmProviderError } from "@/src/llm/errors";
import { configuredProviders, normalizeWithFallback } from "@/src/llm/provider-router";
import { GeminiProvider } from "@/src/llm/providers/gemini";
import { OpenAiCompatibleProvider } from "@/src/llm/providers/openai-compatible";
import type { LlmProvider, ProviderName } from "@/src/llm/types";

const input = { description: "Software Engineer at Example with Python experience.", employmentCountry: "India", sourceUrl: undefined };
const validResponse = '{"title":"Software Engineer","company":"Example"}';
const provider = (name: ProviderName, generate: LlmProvider["generate"]): LlmProvider => ({ name, generate });

test("unconfigured providers are skipped, order is deduplicated, and models are explicit", () => {
  const env = { GEMINI_API_KEY: "test", GEMINI_MODEL: "test-model", OPENAI_API_KEY: "test", OPENAI_MODEL: "test-model", LLM_FALLBACK_PROVIDERS: "openai,gemini,openai" };
  assert.deepEqual(configuredProviders(env).map((item) => item.name), ["gemini", "openai"]);
  assert.deepEqual(configuredProviders({}), []);
  assert.throws(() => configuredProviders({ GEMINI_API_KEY: "test" }), LlmConfigurationError);
  assert.throws(() => configuredProviders({ LLM_PRIMARY_PROVIDER: "typo" }), LlmConfigurationError);
});

test("temporary failures and invalid JSON fall back in order", async () => {
  const result = await normalizeWithFallback(input, [
    provider("gemini", async () => { throw new LlmProviderError("HTTP 429", true); }),
    provider("openrouter", async () => "not json"),
    provider("openai", async () => validResponse)
  ]);
  assert.equal(result.provider, "openai");
  assert.deepEqual(result.attempts.map((attempt) => attempt.status), ["failed", "failed", "success"]);
});

test("configuration/auth failures stop rather than quietly incurring fallback charges", async () => {
  let fallbackCalled = false;
  await assert.rejects(() => normalizeWithFallback(input, [
    provider("gemini", async () => { throw new LlmProviderError("HTTP 401", false); }),
    provider("openai", async () => { fallbackCalled = true; return validResponse; })
  ]), AllProvidersFailedError);
  assert.equal(fallbackCalled, false);
  await assert.rejects(() => normalizeWithFallback(input, []), LlmConfigurationError);
});

test("native Gemini and OpenAI-compatible adapters send correct server-side requests", async (ctx) => {
  const requests: Array<{ url: string; options?: RequestInit }> = [];
  ctx.mock.method(globalThis, "fetch", async (url: string | URL, options?: RequestInit) => {
    requests.push({ url: String(url), options });
    return Response.json(String(url).includes("googleapis")
      ? { candidates: [{ content: { parts: [{ text: validResponse }] } }] }
      : { choices: [{ message: { content: validResponse } }] });
  });
  assert.equal(await new GeminiProvider("secret-test-key", "test-model").generate(input), validResponse);
  assert.equal(await new OpenAiCompatibleProvider("openrouter", "test-key", "test-model", "https://openrouter.ai/api/v1").generate(input), validResponse);
  assert.equal(requests[0].url.includes("secret-test-key"), false);
  assert.equal(new Headers(requests[0].options?.headers).get("x-goog-api-key"), "secret-test-key");
  assert.ok(JSON.parse(requests[0].options?.body as string).systemInstruction);
  const chatBody = JSON.parse(requests[1].options?.body as string);
  assert.equal(chatBody.messages[0].role, "system");
  assert.equal(chatBody.messages[1].role, "user");
});

test("upstream errors never echo potentially private provider payloads", async (ctx) => {
  ctx.mock.method(globalThis, "fetch", async () => Response.json({ error: { message: "secret-test-key and private description" } }, { status: 429 }));
  await assert.rejects(() => new GeminiProvider("test", "test").generate(input), (error: unknown) => {
    assert.ok(error instanceof LlmProviderError);
    assert.equal(error.retryable, true);
    assert.equal(error.message.includes("secret-test-key"), false);
    return true;
  });
});
