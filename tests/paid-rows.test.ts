// Owner, 2026-11-12: "we just want eBay and TCGplayer as the paid links at the top". Source guards: fail the build if a
// pinned Fetch row or an unpriced Amazon row comes back.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f: string) => readFileSync(new URL(`../src/components/${f}`, import.meta.url), "utf8");

test("Amazon draws a row only with a real price", () => {
  assert.match(read("AmazonLiveSlot.tsx"), /if \(!live\) return null;/);
  assert.match(read("AmazonCheck.tsx"), /:not\(:has\(\[data-amazon-priced\]\)\)\]:hidden/);
  assert.doesNotMatch(read("AmazonLiveSlot.tsx"), /Check Amazon|Also check on Amazon/);
  assert.doesNotMatch(read("SealedQuickView.tsx"), /data-amazon-row/);
});

test("Fetch TCG is an ordinary store row: not pinned, no Marketplace or Paid link tag", () => {
  const s = read("PriceBoardView.tsx");
  assert.doesNotMatch(s, /PIN_OUTLINE\.fetch/);
  const m = s.match(/function fetchRowLis[\s\S]*$/);
  assert.ok(m);
  assert.doesNotMatch(m[0], /Marketplace|Paid link|board_pinned/);
});
