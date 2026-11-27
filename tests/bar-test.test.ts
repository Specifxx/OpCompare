import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BAR_TEST_START, barArm } from "../src/lib/bar-test";

// The phone buy bar test (2026-11-27, DECISIONS.md "The phone buy bar test").
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("starts on 3 Dec and draws today's bar before then (and off a browser)", () => {
  assert.equal(BAR_TEST_START, Date.parse("2026-12-03T00:00:00Z"));
  assert.equal(barArm(BAR_TEST_START - 1), null);
  assert.equal(barArm(BAR_TEST_START + 1), null, "no window on the server");
});

test("the paid arm says Ad, clicks are counted on card pages outside the quick view", () => {
  const bar = read("src/components/CardStickyBuyBar.tsx");
  assert.match(bar, /const ad = arm === "paid" && paid \? paid : null;/);
  assert.match(bar, /\{ad \? <span[^>]*>Ad<\/span> : null\}/);
  const lib = read("src/lib/bar-test.ts");
  assert.match(lib, /closest\('\[role="dialog"\]'\)\) return/);
  assert.match(lib, /startsWith\("\/card\/"\)/);
  assert.match(read("src/components/ConsentGatedAnalytics.tsx"), /barTestClick\(a, props\.paid === true\)/);
  assert.match(read("src/app/card/[slug]/page.tsx"), /paid=\{paidBest\}/);
});
