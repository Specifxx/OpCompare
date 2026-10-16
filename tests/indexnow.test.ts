import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { submissionPlan } from "../scripts/indexnow-submit";

// IndexNow answers 422 to any URL off the request's host: the request names the
// sitemap's own host (MTG Compare's stale SITE_URL made every batch a 422), and
// a refusal fails the run instead of logging "0 of N" on a green one.
test("IndexNow posts for the host of the sitemap's own URLs and leaves other hosts out", () => {
  const plan = submissionPlan(["https://opcompare.app/", "https://opcompare.app/sets/op16-time-of-battle", "https://elsewhere.test/x"]);
  assert.ok(plan);
  assert.equal(plan.host, "opcompare.app");
  assert.equal(plan.keyLocation, "https://opcompare.app/indexnow.txt");
  assert.deepEqual(plan.urls, ["https://opcompare.app/", "https://opcompare.app/sets/op16-time-of-battle"]);
  assert.equal(plan.dropped, 1);
  assert.equal(submissionPlan([]), null);
});

test("a refused batch, a key file that never serves the key and an empty sitemap fail the run", () => {
  const src = readFileSync(new URL("../scripts/indexnow-submit.ts", import.meta.url), "utf8");
  assert.match(src, /host: plan\.host, key, keyLocation: plan\.keyLocation/);
  assert.doesNotMatch(src, /new URL\(site\)\.host/);
  assert.match(src, /if \(sent < plan\.urls\.length\) \{[\s\S]*?process\.exitCode = 1/);
  assert.match(src, /never served INDEXNOW_KEY[\s\S]*?process\.exitCode = 1/);
  assert.match(src, /listed no URLs[\s\S]*?process\.exitCode = 1/);
  assert.match(src, /await r\.text\(\)/, "IndexNow's answer is logged with a refusal");
});
