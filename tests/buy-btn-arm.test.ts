import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The eBay-button A/B (2026-11-19, DECISIONS.md "eBay's own blue on its button, 50/50").
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

test("arm b colours only eBay links that wear the filled site button, in eBay blue", () => {
  assert.match(read("src/app/globals.css"), /html\[data-ebaybtn="b"\] a\[data-retailer\^="ebay"\]\.btn-primary \{[^}]*#0064d2/);
});

test("buy_click carries the arm and the layout assigns it", () => {
  assert.match(read("src/components/ConsentGatedAnalytics.tsx"), /ebay_btn: ebayBtnNow\(\)/);
  assert.match(read("src/app/layout.tsx"), /<BuyBtnArm \/>/);
});
