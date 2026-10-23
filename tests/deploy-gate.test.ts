// The production deploy gate (scripts/vercel-ignore-build.sh): only a commit
// whose SUBJECT carries [deploy] builds production; a preview builds only for a
// [preview] subject (owner, 2026-10-17), and claude/* branches never deploy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const SCRIPT = path.resolve(__dirname, "../scripts/vercel-ignore-build.sh");
const run = (env: Record<string, string>) => spawnSync("bash", [SCRIPT], { env: { PATH: process.env.PATH ?? "", ...env } as unknown as NodeJS.ProcessEnv }).status;

test("production builds only on a [deploy] subject", () => {
  assert.equal(run({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_MESSAGE: "release: daily [deploy]" }), 1);
  assert.equal(run({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_MESSAGE: "Fix the card page" }), 0);
  assert.equal(run({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_MESSAGE: "Fix\n\nthis body mentions [deploy] in prose" }), 0);
});

test("previews are off unless the SUBJECT carries [preview]; claude/* branches never deploy", () => {
  for (const env of ["preview", "development"]) {
    assert.equal(run({ VERCEL_ENV: env, VERCEL_GIT_COMMIT_MESSAGE: "anything" }), 0, env);
    assert.equal(run({ VERCEL_ENV: env, VERCEL_GIT_COMMIT_MESSAGE: "Try the card page [preview]" }), 1, env);
    assert.equal(run({ VERCEL_ENV: env, VERCEL_GIT_COMMIT_MESSAGE: "Try it [PREVIEW]" }), 1, `${env}: any case`);
    assert.equal(run({ VERCEL_ENV: env, VERCEL_GIT_COMMIT_MESSAGE: "Try it\n\nthe body says [preview]" }), 0, `${env}: subject only`);
    assert.equal(run({ VERCEL_ENV: env, VERCEL_GIT_COMMIT_MESSAGE: "release [deploy]" }), 0, `${env}: [deploy] is not [preview]`);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vercel = require(path.resolve(__dirname, "../vercel.json")) as { git: { deploymentEnabled: Record<string, boolean> } };
  assert.equal(vercel.git.deploymentEnabled["claude/*"], false);
  assert.equal(vercel.git.deploymentEnabled["claude/**"], false);
});

test("production builds only main, and a [deploy] release of docs alone skips", () => {
  const prod = { VERCEL_ENV: "production", VERCEL_GIT_COMMIT_MESSAGE: "release: scheduled production deploy [deploy]" };
  assert.equal(run({ ...prod, VERCEL_GIT_COMMIT_REF: "feature/x" }), 0, "another branch never builds production");
  assert.equal(run({ ...prod, VERCEL_GIT_COMMIT_REF: "main" }), 1);
  // An unknown previous deployment builds (fail open).
  assert.equal(run({ ...prod, VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_PREVIOUS_SHA: "0000000000000000000000000000000000000000" }), 1);
  const src = require("node:fs").readFileSync(SCRIPT, "utf8") as string;
  assert.match(src, /git diff --name-only "\$prev" HEAD/);
  assert.match(src, /grep -qvE '\(\\\.md\$\|\^docs\/\)'/);
});
