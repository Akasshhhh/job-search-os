# LLM provider contract

The app owns one normalization contract and several provider adapters.

## Adapter responsibility

Each adapter only translates the shared request into its provider's HTTP format and translates the response into text. It must not save jobs or render UI.

```ts
interface LlmProvider {
  readonly name: ProviderName;
  generate(input: NormalizationInput): Promise<string>;
}
```

## Provider order

`LLM_PRIMARY_PROVIDER` is tried first. `LLM_FALLBACK_PROVIDERS` is then tried in listed order, but only configured providers are included.

The router falls back for timeouts, network failures, rate limits, provider 5xx responses, and malformed structured output. It does not turn invalid user input into a provider call.

There is one attempt per provider (30 seconds), not an unbounded retry loop. HTTP 4xx configuration/auth errors (except 408, 409, 429) stop. No API key skips that provider; a key without an explicit model ID is a configuration error. Invalid provider names are errors, not silent substitutions.

`parseNormalizedJob()` validates the shared domain shape and sponsorship quotes. `normalizeWithFallback()` returns the validated draft, provider, and safe attempt metadata. Raw provider error bodies are never returned to the frontend.

## Environment files

Next.js owns environment loading; the router only reads the resulting environment. `.env` and `.env.local` are both supported. `.env.local` has higher precedence even when a value is blank. `.env.example` leaves settings commented to prevent copied placeholders from masking another file's credentials. Do not add a second custom dotenv loader or read keys from the frontend. `tests/env-loading.test.ts` exercises the template/precedence regression with fictional credentials only.

## Adding a provider

1. Implement the adapter in `src/llm/providers/`.
2. Map provider errors to `LlmProviderError` with `retryable` set intentionally.
3. Register the adapter in `src/llm/provider-router.ts`.
4. Add environment variables to `.env.example`.
5. Add or update adapter tests without putting credentials in tests.
