import { expect, test } from "@playwright/test";
import { buildSavedJob, createJobInputSchema, normalizedJobDraftSchema } from "../../src/domain/job";

const description = "Backend Engineer at Example in Berlin. Work remotely with Python and SQL. No visa sponsorship.";

test("real missing-credentials flow preserves input and shows a useful error", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Normalize & save" })).toBeDisabled();
  await expect(page.getByLabel("Target employment country")).toHaveValue("India");
  await page.screenshot({ path: `docs/previews/intake-${testInfo.project.name}.png`, fullPage: true });
  await page.getByLabel("Job description", { exact: true }).fill(description);
  await page.getByRole("button", { name: "Normalize & save" }).click();
  await expect(page.getByRole("alert", { name: "Job intake error" })).toContainText("No LLM provider is configured");
  await expect(page.getByLabel("Job description", { exact: true })).toHaveValue(description);
  await expect(page.getByRole("button", { name: "Normalize & save" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("UI with stubbed HTTP result renders every field and reuses saved cards on reload", async ({ page }) => {
  // This tests the browser boundary only; API/SQLite persistence is tested with real SQLite separately.
  const job = buildSavedJob(normalizedJobDraftSchema.parse({
    title: "Backend Engineer", company: "Example", jobLocation: "Berlin",
    workplaceType: "remote", employmentType: "Full-time", seniorityLevel: "Senior",
    sponsorship: "no", sponsorshipEvidence: "No visa sponsorship",
    experienceRequirements: ["3+ years"], skills: ["Python", "SQL", "Git", "Linux", "Docker", "HTTP", "Seventh visible skill"],
    responsibilities: ["Build reliable APIs"], compensation: "€60,000–80,000"
  }), createJobInputSchema.parse({ description }), "gemini");
  const jobs: typeof job[] = [];
  let finishPost: (() => void) | undefined;
  await page.route("**/api/jobs", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise<void>((resolve) => { finishPost = resolve; });
      jobs.push(job);
      await route.fulfill({ status: 201, json: { job, provider: "gemini" } });
    } else {
      await route.fulfill({ json: { jobs } });
    }
  });
  await page.goto("/");
  await page.getByLabel("Job description", { exact: true }).fill(description);
  await page.getByRole("button", { name: "Normalize & save" }).click();
  await expect(page.getByLabel("Job description", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Target employment country")).toBeDisabled();
  finishPost?.();
  await expect(page.getByRole("heading", { name: "Here's what we found" })).toBeVisible();
  await expect(page.getByText("Target country: India").first()).toBeVisible();
  await expect(page.getByText("Berlin", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Seventh visible skill").first()).toBeVisible();
  await expect(page.getByText("Visa sponsorship: Explicitly not offered").first()).toBeVisible();
  await page.getByText("Original pasted job description").first().click();
  await expect(page.getByText(description, { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Backend Engineer" })).toBeVisible();
});
