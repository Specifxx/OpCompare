// The pre-order page's logic (src/lib/preorders.ts) and its wiring
// (/op18-preorders, PreorderProduct): which products are "not out yet", the
// per-market rows with TCGplayer and eBay beside the stores, and the rules the
// page must keep (PreOrder availability, tagged links, nothing private).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { OfferRow, SealedLite, SetLite } from "../src/lib/data";
import type { PanelListing } from "../src/lib/listing-panel";
import { daysUntil, groupForSet, longDateOf, PREORDER_PAGES, preorderGroups, productBoard, releaseDateOf, shortDateOf } from "../src/lib/preorders";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

const set = (over: Partial<SetLite> & Pick<SetLite, "id" | "code">): SetLite => ({
  slug: over.code.toLowerCase(),
  name: over.code,
  kind: "booster",
  releasedOn: null,
  cardCount: 0,
  sealedCount: 0,
  ...over,
});
const product = (over: Partial<SealedLite> & Pick<SealedLite, "id" | "name">): SealedLite => ({
  slug: over.name.toLowerCase().replace(/\W+/g, "-"),
  setId: null,
  kind: "Booster Box",
  packCount: 24,
  imageUrl: null,
  releasedOn: null,
  presale: false,
  marketUsd: null,
  low: { US: null, AU: null, UK: null, SG: null, CA: null, EU: null },
  stores: { US: 0, AU: 0, UK: 0, SG: 0, CA: 0, EU: 0 },
  change7d: null,
  tcgplayerUrl: "https://www.tcgplayer.com/product/1",
  ...over,
});
const offer = (o: Partial<OfferRow> & Pick<OfferRow, "source" | "priceCents">): OfferRow => ({
  market: "US",
  currency: "USD",
  url: `https://shop.example/${o.source}`,
  inStock: true,
  condition: null,
  shippingCents: null,
  updatedAt: "2026-10-08T00:00:00.000Z",
  ...o,
});
const listing = (over: Partial<PanelListing> = {}): PanelListing => ({
  market: "US",
  rank: 0,
  priceCents: 30000,
  shippingCents: 0,
  currency: "USD",
  url: "https://www.ebay.com/itm/123",
  title: "OP18 booster box",
  imageUrl: null,
  ...over,
});

const SETS = [set({ id: 1, code: "OP18", releasedOn: "2026-11-20" }), set({ id: 2, code: "OP17", releasedOn: "2026-08-01" })];
const TODAY = "2026-10-08";

test("releaseDateOf: the product's own date, else its set's", () => {
  const byId = new Map(SETS.map((s) => [s.id, s]));
  assert.equal(releaseDateOf({ releasedOn: "2026-12-01", setId: 1 }, byId), "2026-12-01");
  assert.equal(releaseDateOf({ releasedOn: null, setId: 1 }, byId), "2026-11-20");
  assert.equal(releaseDateOf({ releasedOn: null, setId: null }, byId), null);
});

test("preorderGroups: only products not out yet, soonest first, box before pack", () => {
  const sealed = [
    product({ id: 1, name: "OP18 Pack", kind: "Booster Pack", setId: 1 }),
    product({ id: 2, name: "OP18 Box", kind: "Booster Box", setId: 1 }),
    product({ id: 3, name: "OP17 Box", setId: 2 }),
    product({ id: 4, name: "Collection", kind: "Premium Collection", releasedOn: "2026-10-30" }),
    product({ id: 5, name: "Undated" }),
    product({ id: 6, name: "Presale flag in the past", releasedOn: "2026-09-01", presale: true }),
  ];
  const groups = preorderGroups(sealed, SETS, TODAY);
  assert.deepEqual(groups.map((g) => g.releasedOn), ["2026-09-01", "2026-10-30", "2026-11-20"]);
  const op18 = groups[2];
  assert.deepEqual(op18.products.map((p) => p.name), ["OP18 Box", "OP18 Pack"]);
  assert.equal(op18.set?.code, "OP18");
  assert.equal(groupForSet(groups, "OP18"), op18);
  assert.equal(groupForSet(groups, "OP17"), null);
});

test("preorderGroups: a released product drops out on its own", () => {
  const sealed = [product({ id: 1, name: "OP18 Box", setId: 1 })];
  assert.equal(preorderGroups(sealed, SETS, "2026-11-20").length, 0);
  assert.equal(preorderGroups(sealed, SETS, "2026-11-19").length, 1);
});

test("productBoard: stores, TCGplayer and eBay ranked by item price", () => {
  const b = productBoard(
    [
      offer({ source: "tcgplayer", priceCents: 34300 }),
      offer({ source: "storea", priceCents: 36000 }),
      offer({ source: "ebay", priceCents: 31000, shippingCents: 0 }),
      offer({ source: "storeb", priceCents: 30000, inStock: false }),
      offer({ source: "storec", priceCents: 29000, market: "AU", currency: "AUD" }),
    ],
    [],
    "US",
    "/op18-preorders",
  );
  assert.deepEqual(b.rows.map((r) => r.priceCents), [31000, 34300, 36000]);
  assert.equal(b.cheapest.ebay?.priceCents, 31000);
  assert.equal(b.cheapest.tcgplayer?.priceCents, 34300);
  assert.equal(b.cheapest.store?.priceCents, 36000);
  assert.equal(b.ebayFromPanel, false);
});

test("productBoard: the panel's headline listing stands in for a missing eBay offer", () => {
  const b = productBoard(
    [offer({ source: "tcgplayer", priceCents: 34300 })],
    [listing({ rank: 1, priceCents: 29000 }), listing({ rank: 0, priceCents: 30000 }), listing({ market: "AU", priceCents: 100 })],
    "US",
    "/op18-preorders",
  );
  assert.equal(b.ebayFromPanel, true);
  const ebay = b.rows.find((r) => r.ebay);
  assert.equal(ebay?.priceCents, 30000);
  assert.equal(ebay?.postage, "free postage");
  assert.equal(b.rows[0], ebay);
  // A priced eBay offer wins; the panel adds nothing.
  const both = productBoard([offer({ source: "ebay", priceCents: 32000 })], [listing()], "US", "/op18-preorders");
  assert.equal(both.ebayFromPanel, false);
  assert.equal(both.rows.filter((r) => r.ebay).length, 1);
  // Nothing in the market, nothing invented.
  const none = productBoard([], [listing({ market: "UK" })], "US", "/op18-preorders");
  assert.deepEqual(none.rows, []);
});

test("date helpers", () => {
  assert.equal(longDateOf("2026-11-20"), "20 November 2026");
  assert.equal(shortDateOf("2026-11-20"), "20 Nov");
  assert.equal(daysUntil("2026-11-20", "2026-10-08"), 43);
  assert.equal(daysUntil("2026-10-08", "2026-10-08"), 0);
  assert.equal(daysUntil("2026-10-07", "2026-10-08"), -1);
});

test("the pages: pre-order availability, no private data, linked from /sealed and the sitemap", () => {
  const shared = read("src/components/PreorderPage.tsx");
  assert.match(shared, /schema\.org\/PreOrder/);
  assert.doesNotMatch(shared, /schema\.org\/InStock|availability: *"InStock"/);
  assert.doesNotMatch(shared, /@\/lib\/db["']/);
  assert.doesNotMatch(shared, /generateStaticParams/);
  for (const [code, route] of Object.entries(PREORDER_PAGES)) {
    const page = read(`src/app${route}/page.tsx`);
    assert.match(page, /export const revalidate = 3600/, route);
    assert.match(page, new RegExp(`code: "${code}"`), route);
    assert.match(page, new RegExp(`path: "${route}"`), route);
    assert.doesNotMatch(page, /generateStaticParams|@\/lib\/db["']/, route);
    assert.ok(read("src/app/sitemap.ts").includes(`"${route}"`), `${route} in the sitemap`);
  }
  // /sealed links every dedicated page through the same map.
  assert.match(read("src/app/sealed/page.tsx"), /PREORDER_PAGES/);
});

test("EB05 releases before OP18, so its group sorts first and each links to its own page", () => {
  const sets = [set({ id: 1, code: "OP18", releasedOn: "2026-11-20" }), set({ id: 3, code: "EB05", kind: "extra", releasedOn: "2026-10-30" })];
  const groups = preorderGroups([product({ id: 1, name: "OP18 Box", setId: 1 }), product({ id: 2, name: "EB05 Box", setId: 3 })], sets, TODAY);
  assert.deepEqual(groups.map((g) => g.set?.code), ["EB05", "OP18"]);
  assert.equal(groupForSet(groups, "EB05")?.releasedOn, "2026-10-30");
  assert.equal(PREORDER_PAGES.EB05, "/eb05-preorders");
});

test("the product card: every outbound link is tagged and rel-marked", () => {
  const card = read("src/components/PreorderProduct.tsx");
  assert.match(card, /ebaySearchUrl/);
  assert.match(card, /affiliateUrl/);
  assert.match(card, /outboundRel/);
});
