export class LlmProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}

export class LlmConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmConfigurationError";
  }
}

export class AllProvidersFailedError extends Error {
  constructor(readonly attempts: Array<{ provider: string; message: string }>) {
    super("All configured LLM providers failed");
    this.name = "AllProvidersFailedError";
  }
}

export function httpError(
  provider: string,
  status: number
): LlmProviderError {
  const retryable = status === 408 || status === 409 || status === 429 || status >= 500;
  return new LlmProviderError(`${provider} returned HTTP ${status}`, retryable, status);
}
