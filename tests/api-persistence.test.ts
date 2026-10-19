import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { buildSavedJob, createJobInputSchema, normalizedJobDraftSchema } from "@/src/domain/job";

test("real API orchestration persists validated jobs, survives reopen, and rejects unsafe input", async (ctx) => {
  const parent = path.join(tmpdir(), "omnirush");
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, "job-search-test-"));
  const datasourceUrl = `file:${path.join(directory, "jobs.db")}`;
  process.env.DATABASE_URL = datasourceUrl;
  process.env.GEMINI_API_KEY = "test-key-not-a-real-secret";
  process.env.GEMINI_MODEL = "test-model";
  process.env.LLM_PRIMARY_PROVIDER = "gemini";
  process.env.LLM_FALLBACK_PROVIDERS = "";
  const client = new PrismaClient({ datasourceUrl });
  ctx.after(async () => {
    await client.$disconnect();
    await (globalThis as unknown as { jobsDatabase?: PrismaClient }).jobsDatabase?.$disconnect();
    await rm(directory, { recursive: true });
  });
  const migration = await readFile(path.join(process.cwd(), "prisma/migrations/20261018163559_init/migration.sql"), "utf8");
  for (const statement of migration.split(";").filter((value) => value.trim())) {
    await client.$executeRawUnsafe(statement);
  }

  // Only the external LLM is stubbed. HTTP route validation and SQLite are real.
  let calls = 0;
  ctx.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({
      title: "Backend Engineer", company: "Example", jobLocation: "Berlin",
      workplaceType: "remote", sponsorship: "conditional",
      sponsorshipEvidence: "Visa sponsorship may be available", skills: ["Python", "SQL"]
    }) }] } }] });
  });
  const { POST, GET } = await import("@/app/api/jobs/route");
  const { jobsRepository } = await import("@/src/server/jobs-repository");
  const request = (value: unknown, headers: Record<string, string> = {}) => new Request("http://localhost:3000/api/jobs", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(value)
  });
  const input = { description: "  Backend Engineer at Example in Berlin. Python, SQL. Visa sponsorship may be available.\n", sourceUrl: "https://example.com/job/1" };

  const response = await POST(request(input));
  assert.equal(response.status, 201);
  const { job } = await response.json();
  assert.equal(job.employmentCountry, "India");
  assert.equal(job.jobLocation, "Berlin");
  assert.equal(job.rawDescription, input.description);
  assert.equal(job.applicationUrl, null);
  assert.equal(job.sponsorship, "conditional");
  assert.equal(calls, 1);

  const reopened = new PrismaClient({ datasourceUrl });
  assert.equal((await jobsRepository(reopened).listJobs())[0].id, job.id);
  await reopened.$disconnect();
  const listResponse = await GET(new Request("http://localhost:3000/api/jobs"));
  assert.equal((await listResponse.json()).jobs[0].id, job.id);
  assert.equal(listResponse.headers.get("cache-control"), "no-store");

  assert.equal((await POST(request({ description: "short" }))).status, 400);
  assert.equal((await POST(request({ ...input, sourceUrl: "javascript:alert(1)" }))).status, 400);
  assert.equal((await POST(request(input, { Origin: "https://evil.example" }))).status, 403);
  assert.equal((await GET(new Request("http://localhost:3000/api/jobs", { headers: { Host: "evil.example" } }))).status, 403);
  assert.equal((await POST(request(input, { "Content-Type": "text/plain" }))).status, 415);
  assert.equal((await POST(request({ description: "x".repeat(256_001) }))).status, 413);
  assert.equal(calls, 1, "invalid requests must not incur provider calls");

  ctx.mock.method(globalThis, "fetch", async () => Response.json({ candidates: [{ content: { parts: [{ text: '{"title":"Invented","sponsorship":"yes"}' }] } }] }));
  assert.equal((await POST(request(input))).status, 502);
  assert.equal((await jobsRepository(client).listJobs()).length, 1, "failed normalization must not save a row");

  const repository = jobsRepository(client);
  await Promise.all(Array.from({ length: 10 }, (_, index) => repository.saveJob(buildSavedJob(
    normalizedJobDraftSchema.parse({ title: `Concurrent job ${index}` }),
    createJobInputSchema.parse(input), "test"
  ))));
  assert.equal((await repository.listJobs()).length, 11, "concurrent saves must not overwrite records");
});
