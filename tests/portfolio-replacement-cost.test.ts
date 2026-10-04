import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cheapestSplit, replacementPreview, type ReplacementListing } from "../src/lib/portfolio-replacement";

// ─────────────────────────────────────────────────────────────────────────────
// "Replacement cost" on /portfolio — RiftCompare's
// tests/portfolio-replacement-cost.test.ts, ported in wave 2 (2026-10-03).
// What it pins, as RiftCompare's does:
//   • the headline stays an item price — the replacement figure is a separate
//     panel and never folded into "Collection value";
//   • the heavy listing read stays behind a button, scoped and rate-limited;
//   • the total is free, the store-by-store plan is Premium.
// OP Compare's interim computation (until the tools track's planBasket lands)
// is each copy at its cheapest store listing, BEFORE POSTAGE, and says so.
// RiftCompare's optimiser cases (postage once per store) move here with
// planBasket at integration.
// ─────────────────────────────────────────────────────────────────────────────

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const readCode = (p: string) => read(p).replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\/\*[\s\S]*?\*\//g, "");

const l = (source: string, priceCents: number): ReplacementListing => ({ source, storeName: source.replace("store:", ""), priceCents, url: `https://x/${source}` });

test("each copy at its cheapest listing; a card nothing stocks is left out and counted", () => {
  const r = cheapestSplit(
    [
      { cardId: 1, name: "Shanks", slug: "s", qty: 2, valueCents: 5000 },
      { cardId: 2, name: "Nami", slug: "n", qty: 1, valueCents: 100 },
      { cardId: 3, name: "Zoro", slug: "z", qty: 3, valueCents: 0 },
    ],
    new Map([
      [1, [l("store:a", 2600), l("tcgplayer", 2500)]],
      [2, [l("store:a", 120), l("store:b", 90)]],
    ]),
  );
  assert.equal(r.totalCents, 2500 * 2 + 90);
  assert.equal(r.storeCount, 2);
  assert.deepEqual([r.requested, r.covered], [6, 3]);
  assert.equal(r.beforePostage, true);
  assert.equal(r.shippingCents, 0);
});

test("eBay is never a basket store, even when it is the cheapest", () => {
  const r = cheapestSplit([{ cardId: 1, name: "Shanks", slug: "s", qty: 1, valueCents: 0 }], new Map([[1, [l("ebay", 10), l("store:a", 500)]]]));
  assert.equal(r.totalCents, 500);
  assert.deepEqual(r.plan.stores.map((s) => s.key), ["store:a"]);
});

test("a tie goes to the store already used, so the split does not scatter for nothing", () => {
  const r = cheapestSplit(
    [
      { cardId: 1, name: "A", slug: "a", qty: 1, valueCents: 0 },
      { cardId: 2, name: "B", slug: "b", qty: 1, valueCents: 0 },
    ],
    new Map([
      [1, [l("store:b", 100)]],
      [2, [l("store:a", 200), l("store:b", 200)]],
    ]),
  );
  assert.equal(r.storeCount, 1);
});

test("a non-Premium answer carries the aggregate only: no store names, lines or links", () => {
  const r = cheapestSplit([{ cardId: 1, name: "A", slug: "a", qty: 1, valueCents: 0 }], new Map([[1, [l("store:a", 100)]]]));
  const p = replacementPreview(r);
  assert.equal("plan" in p, false);
  assert.doesNotMatch(JSON.stringify(p), /store:a|https:/);
});

test("the route: signed in, rate-limited, Premium gets the plan, and the headline value is untouched", () => {
  const route = readCode("src/app/api/portfolio/replacement/route.ts");
  assert.match(route, /rateLimit\(`replacement:\$\{user\.id\}`, 12, 3_600_000\)/);
  assert.match(route, /const full = isPremium\(user, "premium"\)/);
  assert.match(route, /\.\.\.\(full \? result : replacementPreview\(result\)\)/);
  assert.match(route, /valuedCents: wanted\.reduce/);
  const lib = readCode("src/lib/collection-server.ts");
  const read = lib.slice(lib.indexOf("export async function replacementInputs"));
  assert.match(read, /take: ids\.length \* REPLACEMENT_ROWS_PER_CARD/);
  assert.match(read, /OR: \[\{ source: \{ startsWith: "store:" \} \}, \{ source: "tcgplayer" \}\]/, "real stores and TCGplayer only");
  assert.match(read, /inStock: true/);
  assert.match(lib, /REPLACEMENT_MAX_HOLDINGS = 200/);
  // The panel runs it behind a button, and says before postage.
  const panel = readCode("src/components/PortfolioReplacementCost.tsx");
  assert.match(panel, /onClick=\{run\}/);
  assert.doesNotMatch(panel, /useEffect\(/, "never on load");
  assert.match(panel, /before postage/);
  // The headline is the item price; nothing adds postage to it.
  const page = readCode("src/app/portfolio/page.tsx");
  assert.match(page, /money\(portfolio\.totalCents, country\)/);
  assert.doesNotMatch(page, /shippingCents/);
});
