import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { setGuideFacts, type SetPriceGuideRow } from "../src/lib/set-price-guide";

// RiftCompare's set template on OP Compare (DECISIONS.md, 2026-11-24).
const PAGE = fs.readFileSync("src/app/sets/[slug]/page.tsx", "utf8");
const at = (needle: string) => {
  const i = PAGE.indexOf(needle, PAGE.indexOf("  return (\n    <div>"));
  assert.ok(i > 0, needle);
  return i;
};

test("the set page runs hero, grid, read-out, then the commercial blocks", () => {
  const order = ["<h1", '<section id="cards"', "data-set-intro", "<SetPriceGuide", 'id="set-read-h"', "<RelatedGuides", "Other One Piece sets", "<EbaySearchPanel", "<InlineAds"];
  const idx = order.map(at);
  for (let i = 1; i < idx.length; i++) assert.ok(idx[i] > idx[i - 1], `${order[i]} after ${order[i - 1]}`);
  assert.doesNotMatch(PAGE, /<ReadMore\b/, "the set's own prose is open, not folded");
  assert.match(PAGE, /"@type": "CollectionPage"/);
  assert.match(PAGE, /href=\{`\/sets\/\$\{set\.slug\}\/gallery`\}/);
});

test("a released set's title leads with the count, inside 60 characters", () => {
  assert.match(PAGE, /`\$\{s\.code\} \$\{s\.name\} Card List: All \$\{revealed\} Cards \+ Prices`/);
  assert.match(PAGE, /\.find\(\(x\) => x\.length <= 60\) \?\? short/);
});

const row = (name: string, priceCents: number | null, rarity: string | null): SetPriceGuideRow => ({ id: name.length, slug: name, name, rarity, number: null, priceCents, stores: 1 });

test("setGuideFacts: dearest, cheapest priced, and a rarity only when it fills five of ten", () => {
  const rows = [
    ...Array.from({ length: 6 }, (_, i) => row(`SP ${i}`, 10000 - i, "SP")),
    ...Array.from({ length: 6 }, (_, i) => row(`C ${i}`, 50 - i, "C")),
    row("Unpriced", null, "C"),
  ];
  const f = setGuideFacts(rows);
  assert.deepEqual(f.top, { name: "SP 0", priceCents: 10000 });
  assert.deepEqual(f.low, { name: "C 5", priceCents: 45 });
  assert.deepEqual(f.topTenRarity, { rarity: "SP", n: 6 });
  assert.equal(setGuideFacts(rows.slice(0, 3)).topTenRarity, null, "fewer than ten priced");
  assert.equal(setGuideFacts([row("One", 100, "C")]).low, null);
  assert.deepEqual(setGuideFacts([]), { top: null, low: null, topTenRarity: null });
});
