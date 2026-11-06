import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dropsWatch, gradedWatch, sealedWatch, GRADED_WATCH_MAX_CENTS } from "../src/lib/price-watch";
import type { CardLite, OfferRow, SealedLite } from "../src/lib/data";
import type { PanelGraded, PanelListing } from "../src/lib/listing-panel";

// The Black Friday / Cyber Monday price watch (DECISIONS.md, 2026-11-06): pure rules.

const now = Date.parse("2026-11-06T00:00:00Z");
const fresh = now - 3_600_000;
const stale = now - 100 * 3_600_000;
const sealed = (id: number, kind: string, lowUS: number | null, storesUS = 2, presale = false) =>
  ({ id, slug: `s${id}`, name: `S${id}`, kind, presale, marketUsd: null, low: { US: lowUS, AU: null }, stores: { US: storesUS, AU: 0 } }) as unknown as SealedLite;
const offer = (source: string, market: string, priceCents: number, inStock = true): OfferRow => ({ source, market, priceCents, currency: "USD", url: `https://www.ebay.com/itm/${priceCents}`, inStock, condition: null, shippingCents: null, updatedAt: new Date(fresh).toISOString() });

test("sealed watch: in-stock products only, cases and boxes first, dearest first, with the cheapest in-stock eBay row in the market", () => {
  const offers = new Map<number, OfferRow[]>([
    [1, [offer("ebay_us", "US", 9000), offer("ebay_us", "US", 8000), offer("ebay_us", "US", 7000, false), offer("ebay_us", "CA", 1000), offer("store:x", "US", 8500)]],
    [2, []],
  ]);
  const rows = sealedWatch([sealed(1, "Booster Box", 10000), sealed(2, "Starter Deck", 2000), sealed(3, "Booster Case", 120000), sealed(4, "Booster Box", null), sealed(5, "Booster Box", 9000, 0), sealed(6, "Booster Box", 9000, 2, true)], offers, "US");
  assert.deepEqual(rows.map((r) => r.sealed.id), [3, 1, 2]);
  assert.equal(rows[1].ebay?.priceCents, 8000);
  assert.equal(rows[2].ebay, null);
});

test("drops watch: steepest seven-day falls of cards worth US$5+, each with its rank-0 fresh listing in the market", () => {
  const card = (id: number, change7d: number | null, marketUsd: number | null) => ({ id, slug: `c${id}`, name: `C${id}`, change7d, marketUsd }) as unknown as CardLite;
  const l = (market: string, rank: number, priceCents: number, u = fresh): PanelListing => ({ market, rank, priceCents, shippingCents: null, currency: "USD", url: "https://www.ebay.com/itm/1", title: "t", imageUrl: null, u });
  const out = dropsWatch(
    [card(1, -10, 1000), card(2, -40, 2000), card(3, -50, 100), card(4, 20, 5000), card(5, null, 5000), card(6, -40, 3000)],
    { "2": [l("US", 1, 1800), l("US", 0, 1900), l("AU", 0, 100)], "6": [l("US", 0, 2500, stale)] },
    "US",
    now,
  );
  assert.deepEqual(out.map((d) => [d.card.id, d.pct]), [[6, -40], [2, -40], [1, -10]]);
  assert.equal(out[1].ebay?.priceCents, 1900);
  assert.equal(out[0].ebay, null);
});

test("graded watch: one row per card, best grade (PSA first) at its cheapest price, dearest cards first; other markets, stale and silly rows out", () => {
  const slab = (market: string, grader: string, grade: string, priceCents: number, u = fresh): PanelGraded => ({ market, itemId: `${grader}${grade}${priceCents}`, priceCents, shippingCents: null, currency: "USD", url: "https://www.ebay.com/itm/1", title: "t", imageUrl: null, grader, grade, u });
  const cards = new Map([
    [1, { id: 1, slug: "luffy", name: "Luffy", number: "OP01-001", variant: null, marketUsd: 1000 }],
    [2, { id: 2, slug: "nami", name: "Nami", number: "OP01-002", variant: null, marketUsd: 1000 }],
    [3, { id: 3, slug: "zoro", name: "Zoro", number: "OP01-003", variant: null, marketUsd: 1000 }],
  ]);
  const rows = gradedWatch(
    {
      "1": [slab("US", "PSA", "10", 50000), slab("US", "PSA", "10", 40000), slab("US", "BGS", "10", 30000), slab("US", "PSA", "9", 9000)],
      "2": [slab("US", "CGC", "9.5", 45000), slab("US", "PSA", "10", GRADED_WATCH_MAX_CENTS + 1), slab("AU", "PSA", "10", 1000)],
      "3": [slab("US", "PSA", "10", 99000, stale)],
      "9": [slab("US", "PSA", "10", 99000)],
    },
    cards,
    "US",
    now,
  );
  assert.deepEqual(rows.map((r) => [r.card.name, r.grade, r.priceCents]), [["Nami", "CGC 9.5", 45000], ["Luffy", "PSA 10", 40000]]);
});

test("both sale pages are the one component, six hours; Cyber Monday is in the sitemap", () => {
  for (const p of ["src/app/black-friday/page.tsx", "src/app/cyber-monday/page.tsx"]) {
    const page = readFileSync(p, "utf8");
    assert.match(page, /export const revalidate = 21600;/);
    assert.match(page, /HolidaySalePage/);
  }
  const comp = readFileSync("src/components/HolidaySalePage.tsx", "utf8");
  assert.doesNotMatch(comp, /ends soon|limited time|countdown/i);
  assert.match(comp, /<SalePriceWatch /);
  assert.match(readFileSync("src/app/sitemap.ts", "utf8"), /"\/cyber-monday"/);
});
