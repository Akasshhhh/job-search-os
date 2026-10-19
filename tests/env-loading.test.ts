import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("copying the example to .env.local does not mask a provider configured in .env", async () => {
  const template = await readFile(".env.example", "utf8");
  const files = [
    { path: ".env.local", contents: template, env: {} },
    { path: ".env", contents: "GEMINI_API_KEY=fixture-key\nGEMINI_MODEL=fixture-model\n", env: {} }
  ];
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (/^(GEMINI_|OPENROUTER_|OPENAI_|LLM_|__NEXT_PROCESSED_ENV$)/.test(name)) delete env[name];
  }
  const script = `
    const nextEnv = require('@next/env');
    const { configuredProviders } = require('./src/llm/provider-router.ts');
    const [loaded] = nextEnv.processEnv(JSON.parse(process.argv[1]), process.cwd(), { info() {}, error() {} });
    console.log(JSON.stringify(configuredProviders(loaded).map(provider => provider.name)));
  `;
  const output = execFileSync(process.execPath, ["--import", "tsx", "-e", script, JSON.stringify(files)], {
    env, encoding: "utf8"
  });
  assert.deepEqual(JSON.parse(output), ["gemini"]);
});
