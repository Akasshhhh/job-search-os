import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:4137", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }
  ],
  webServer: {
    command: "npm run dev -- --port 4137",
    url: "http://127.0.0.1:4137",
    reuseExistingServer: false,
    env: {
      GEMINI_API_KEY: "", GEMINI_MODEL: "",
      OPENROUTER_API_KEY: "", OPENROUTER_MODEL: "",
      OPENAI_API_KEY: "", OPENAI_MODEL: ""
    }
  }
});
