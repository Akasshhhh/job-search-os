import assert from "node:assert/strict";
import test from "node:test";
import { buildSavedJob, createJobInputSchema, normalizedJobDraftSchema } from "@/src/domain/job";
import { parseNormalizedJob } from "@/src/llm/parse";

test("normalization applies safe defaults for omitted optional fields", () => {
  const draft = normalizedJobDraftSchema.parse({ title: "Backend Engineer" });

  assert.equal(draft.company, null);
  assert.equal(draft.workplaceType, "unknown");
  assert.equal(draft.sponsorship, "unknown");
  assert.deepEqual(draft.skills, []);
});

test("provider JSON can be parsed when wrapped in a markdown fence", () => {
  const draft = parseNormalizedJob(`
    \`\`\`json
    {"title":"Product Engineer","workplaceType":"remote","sponsorship":"unknown"}
    \`\`\`
  `);

  assert.equal(draft.title, "Product Engineer");
  assert.equal(draft.workplaceType, "remote");
});

test("empty or short intake is rejected before an LLM call", () => {
  const result = createJobInputSchema.safeParse({ description: "too short" });
  assert.equal(result.success, false);
});

test("sponsorship values outside the contract are rejected", () => {
  assert.throws(() =>
    normalizedJobDraftSchema.parse({ title: "Engineer", sponsorship: "probably" })
  );
});

test("target country defaults to India and raw JD is preserved exactly", () => {
  const description = "  Senior Backend Engineer in Berlin\nWe need Python and SQL experience.  \n";
  const input = createJobInputSchema.parse({ description, sourceUrl: "https://example.com/jobs/1" });
  const job = buildSavedJob(normalizedJobDraftSchema.parse({ title: "Backend Engineer", jobLocation: "Berlin" }), input, "gemini");
  assert.equal(job.employmentCountry, "India");
  assert.equal(job.jobLocation, "Berlin");
  assert.equal(job.rawDescription, description);
  assert.equal(job.applicationUrl, null);
  assert.equal(job.sourceUrl, input.sourceUrl);
});

test("unsafe URLs and oversized intake are rejected", () => {
  const description = "Software Engineer with Python experience at Example Corp";
  assert.equal(createJobInputSchema.safeParse({ description, sourceUrl: "javascript:alert(1)" }).success, false);
  assert.equal(createJobInputSchema.safeParse({ description, sourceUrl: "" }).success, true);
  assert.equal(createJobInputSchema.safeParse({ description, sourceUrl: "not-a-url" }).success, false);
  assert.equal(createJobInputSchema.safeParse({ description: "x".repeat(60_001) }).success, false);
});

test("sponsorship needs an actual quote from the source", () => {
  assert.throws(() => parseNormalizedJob('{"title":"Engineer","sponsorship":"yes"}'));
  assert.throws(() => parseNormalizedJob('{"title":"Engineer","sponsorship":"yes","sponsorshipEvidence":"We sponsor visas"}', "We do not offer visas"));
  const job = parseNormalizedJob('{"title":"Engineer","sponsorship":"no","sponsorshipEvidence":"No visa sponsorship"}', "Engineer. No visa\n sponsorship.");
  assert.equal(job.sponsorship, "no");
});
