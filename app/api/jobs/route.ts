import { NextResponse } from "next/server";
import {
  buildSavedJob,
  createJobInputSchema
} from "@/src/domain/job";
import {
  AllProvidersFailedError,
  LlmConfigurationError
} from "@/src/llm/errors";
import { normalizeWithFallback } from "@/src/llm/provider-router";
import { listJobs, saveJob } from "@/src/server/jobs-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestError = localRequestError(request);
  if (requestError) return requestError;
  try {
    return NextResponse.json({ jobs: await listJobs() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Saved jobs could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestError = localRequestError(request);
  if (requestError) return requestError;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Use Content-Type: application/json." }, { status: 415 });
  }

  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new SyntaxError();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256_000) {
        await reader.cancel();
        return NextResponse.json({ error: "Job intake request is too large." }, { status: 413 });
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const input = createJobInputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: input.error.issues[0]?.message || "Job description is invalid." },
      { status: 400 }
    );
  }

  try {
    const result = await normalizeWithFallback({
      description: input.data.description,
      sourceUrl: input.data.sourceUrl || undefined,
      employmentCountry: input.data.employmentCountry
    });
    const job = buildSavedJob(result.draft, input.data, result.provider);
    await saveJob(job);

    return NextResponse.json({ job, provider: result.provider, attempts: result.attempts }, { status: 201 });
  } catch (error) {
    if (error instanceof LlmConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof AllProvidersFailedError) {
      const lastFailure = error.attempts.at(-1);
      return NextResponse.json(
        {
          error: `Normalization was not completed; nothing was saved. ${lastFailure?.message || "Check your provider configuration or try again."}`,
          attempts: error.attempts.map(({ provider }) => provider)
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ error: "The job could not be normalized and saved." }, { status: 500 });
  }
}

function localRequestError(request: Request) {
  const requestUrl = new URL(request.url);
  // Next may canonicalize request.url to localhost, so use the actual Host header.
  const host = request.headers.get("host") || requestUrl.host;
  let expectedOrigin: URL;
  try {
    expectedOrigin = new URL(`${requestUrl.protocol}//${host}`);
  } catch {
    return NextResponse.json({ error: "Invalid host." }, { status: 403 });
  }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(expectedOrigin.hostname)) {
    return NextResponse.json({ error: "This single-user workspace only accepts local requests." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== expectedOrigin.origin) {
    return NextResponse.json({ error: "Cross-origin submissions are not allowed." }, { status: 403 });
  }
  return null;
}
