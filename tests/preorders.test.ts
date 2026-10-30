// The pre-order page's logic (src/lib/preorders.ts) and its wiring
// (/op18-preorders, PreorderProduct): which products are "not out yet", the
// per-market rows (eBay and TCGplayer pinned in their own Marketplaces block,
// the stores ranked by item price under it, sold-out stores last), the summary
// strip, and the rules the page must keep (PreOrder availability, tagged links,
// marketplaces never counted as stores, nothing private).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { OfferRow, SealedLite, SetLite } from "../src/lib/data";
import type { PanelListing } from "../src/lib/listing-panel";
import { daysUntil, groupForSet, longDateOf, PREORDER_PAGES, preorderGroups, preorderPageFor, preorderSummary, productBoard, releaseDateOf, shortDateOf, upcomingPreorderPages } from "../src/lib/preorders";
import { storesIn } from "../src/lib/stores";

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

// The probe's clock: every fixture row was read the evening before.
const NOW = Date.parse("2026-10-08T12:00:00.000Z");

test("productBoard: every open row by item price, the stores alone in their ranking, the marketplaces apart", () => {
  const b = productBoard(
    [
      offer({ source: "tcgplayer", priceCents: 34300 }),
      offer({ source: "store:a", priceCents: 36000 }),
      offer({ source: "store:d", priceCents: 35000 }),
      offer({ source: "ebay", priceCents: 31000, shippingCents: 0 }),
      offer({ source: "store:b", priceCents: 30000, inStock: false }),
      offer({ source: "store:c", priceCents: 29000, market: "AU", currency: "AUD" }),
    ],
    [],
    "US",
    "/op18-preorders",
    NOW,
  );
  // rows: the headline and the structured data, from anyone, cheapest first.
  assert.deepEqual(b.rows.map((r) => r.priceCents), [31000, 34300, 35000, 36000]);
  // stores: the ranking, never TCGplayer or eBay.
  assert.deepEqual(b.stores.map((r) => r.source), ["store:d", "store:a"]);
  assert.ok(b.stores.every((r) => !r.ebay && r.source !== "tcgplayer"));
  // the marketplaces block reads cheapest.ebay / cheapest.tcgplayer.
  assert.equal(b.cheapest.ebay?.priceCents, 31000);
  assert.equal(b.cheapest.tcgplayer?.priceCents, 34300);
  assert.equal(b.cheapest.store?.priceCents, 35000);
  assert.equal(b.ebayFromPanel, false);
  // a sold-out store is last, in its own list, never in a ranking.
  assert.deepEqual(b.soldOut.map((r) => [r.source, r.state]), [["store:b", "soldout"]]);
});

test("productBoard: sold-out and stale stores are listed once each, last, never a store that is open here", () => {
  const b = productBoard(
    [
      offer({ source: "store:open", priceCents: 33000 }),
      offer({ source: "store:open", priceCents: 31000, inStock: false }), // a second, sold-out listing of an open store
      offer({ source: "store:gone", priceCents: 28000, inStock: false, updatedAt: "2026-10-01T00:00:00.000Z" }), // not seen for a week
      offer({ source: "store:sold", priceCents: 30000, inStock: false, updatedAt: "2026-10-06T00:00:00.000Z" }),
      offer({ source: "store:sold", priceCents: 29500, inStock: false }), // its newest observation wins
      offer({ source: "store:cheap", priceCents: 21200, inStock: false }),
      offer({ source: "ebay", priceCents: 20000, inStock: false }),
      offer({ source: "tcgplayer", priceCents: 25000, inStock: false }),
      offer({ source: "store:au", priceCents: 1000, inStock: false, market: "AU", currency: "AUD" }),
    ],
    [],
    "US",
    "/eb05-preorders",
    NOW,
  );
  assert.deepEqual(b.stores.map((r) => r.source), ["store:open"]);
  assert.deepEqual(
    b.soldOut.map((r) => [r.source, r.state, r.priceCents]),
    [
      ["store:cheap", "soldout", 21200],
      ["store:sold", "soldout", 29500],
      ["store:gone", "unknown", 28000],
    ],
  );
  assert.ok(b.soldOut.every((r) => r.source.startsWith("store:")), "never eBay or TCGplayer");
});

test("preorderSummary: stores checked from the registry, stores taking pre-orders, the cheapest store box, the all-market total", () => {
  const box = product({ id: 1, name: "OP18 Box", kind: "Booster Box", setId: 1 });
  const pack = product({ id: 2, name: "OP18 Pack", kind: "Booster Pack", setId: 1 });
  const boxOffers = [
    offer({ source: "ebay", priceCents: 28000 }),
    offer({ source: "tcgplayer", priceCents: 29000 }),
    offer({ source: "store:castlegames", priceCents: 32999 }),
    offer({ source: "store:triadcards", priceCents: 34499 }),
    offer({ source: "store:hobbiesville", priceCents: 19100, inStock: false }),
    offer({ source: "store:timetwister", priceCents: 24990, market: "EU", currency: "EUR" }),
    offer({ source: "store:grailborne", priceCents: 54900, market: "AU", currency: "AUD", inStock: false }),
    offer({ source: "store:stale", priceCents: 100, market: "UK", currency: "GBP", updatedAt: "2026-09-30T00:00:00.000Z" }),
    offer({ source: "ebay", priceCents: 19999, market: "UK", currency: "GBP" }),
  ];
  const packOffers = [offer({ source: "store:castlegames", priceCents: 1599 }), offer({ source: "store:wulfgaming", priceCents: 2199 })];
  const items = [
    { s: box, offers: boxOffers, board: productBoard(boxOffers, [], "US", "/op18-preorders", NOW) },
    { s: pack, offers: packOffers, board: productBoard(packOffers, [], "US", "/op18-preorders", NOW) },
  ];
  const us = preorderSummary(items, "US", NOW);
  assert.equal(us.checked, storesIn("US").length, "the registry's count, the EB05 post's 'We track N stores'");
  assert.equal(us.taking, 3, "castlegames, triadcards, wulfgaming: never eBay or TCGplayer");
  assert.deepEqual(us.box, { priceCents: 32999, label: "The Castle Games" }, "the cheapest STORE box, not the cheaper eBay or TCGplayer listing");
  // Every market: listing = open or sold out on a fresh read (the stale UK row is neither).
  assert.deepEqual(us.all, { listing: 6, taking: 4, markets: 3 });
  const au = preorderSummary(
    items.map((i) => ({ ...i, board: productBoard(i.offers, [], "AU", "/op18-preorders", NOW) })),
    "AU",
    NOW,
  );
  assert.equal(au.checked, storesIn("AU").length);
  assert.equal(au.taking, 0);
  assert.equal(au.box, null);
  assert.deepEqual(au.all, us.all, "the all-market line is the same in every market");
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
  assert.equal(b.cheapest.ebay, ebay, "the Marketplaces block shows it");
  assert.deepEqual(b.stores, [], "never in the store ranking");
  // Postage eBay states is shown as the board shows it; unknown is never "delivered".
  const paid = productBoard([], [listing({ shippingCents: 345 })], "US", "/op18-preorders");
  assert.equal(paid.cheapest.ebay?.postage, "+ US$3.45 postage · ≈ US$303.45 delivered");
  const unknown = productBoard([], [listing({ shippingCents: null })], "US", "/op18-preorders");
  assert.equal(unknown.cheapest.ebay?.postage, "postage at checkout");
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

test("marketplace buttons wear their own colour: eBay blue, TCGplayer violet, stores the shared red", () => {
  const card = read("src/components/PreorderProduct.tsx");
  // The Marketplaces block: eBay's listing or search, TCGplayer's listing or link.
  assert.equal((card.match(/surface: "preorder_marketplace_ebay",\s*btn: "btn-ebay"/g) ?? []).length, 2, "eBay listing and eBay search");
  assert.equal((card.match(/surface: "preorder_marketplace_tcgplayer",\s*btn: "btn-tcg"/g) ?? []).length, 2, "TCGplayer listing and TCGplayer link");
  // The store ranking: the shared red, its own surface.
  assert.match(card, /data-surface="preorder_row"\s*className="btn-primary/);
  // The old bottom bar is gone: the marketplace links live in the block at the top.
  assert.doesNotMatch(card, /data-surface="preorder_(ebay|tcgplayer)"/);
  const css = read("src/app/globals.css");
  // Fixed fill, white ink in both themes (the themed `text-white` goes dark in light).
  assert.match(css, /\.btn-tcg \{\s*@apply btn bg-\[#6d3fd9\] text-\[#ffffff\]/);
});

test("eBay pass: a forced run can be narrowed to products by name", () => {
  assert.match(read("src/lib/ebay-import.ts"), /EBAY_ONLY_NAME/);
  assert.match(read(".github/workflows/ebay-prices.yml"), /EBAY_ONLY_NAME: \$\{\{ inputs\.only_name \}\}/);
});

test("preorderPageFor: a set's board only while it is unreleased, and only for a set that has one", () => {
  const eb05 = set({ id: 3, code: "EB05", kind: "extra", releasedOn: "2026-10-30" });
  assert.equal(preorderPageFor(eb05, "2026-10-14"), "/eb05-preorders");
  assert.equal(preorderPageFor(eb05, "2026-10-29"), "/eb05-preorders");
  assert.equal(preorderPageFor(eb05, "2026-10-30"), null, "release day retires it");
  assert.equal(preorderPageFor({ ...eb05, releasedOn: null }, "2026-10-14"), null, "no date, no self-retiring link");
  assert.equal(preorderPageFor(set({ id: 4, code: "OP17", releasedOn: "2026-12-01" }), "2026-10-14"), null, "no board, no link");
});

test("upcomingPreorderPages: every unreleased set with a board, soonest first, each once", () => {
  const sets = [
    set({ id: 1, code: "OP18", name: "The Dominance of God", releasedOn: "2026-11-20" }),
    set({ id: 3, code: "EB05", name: "Heroines Vol. 2", kind: "extra", releasedOn: "2026-10-30" }),
    set({ id: 5, code: "OP18", name: "duplicate code", releasedOn: "2026-11-20" }),
    set({ id: 2, code: "OP17", releasedOn: "2026-08-01" }),
  ];
  assert.deepEqual(
    upcomingPreorderPages(sets, "2026-10-14").map((l) => [l.code, l.href, l.releasedOn]),
    [
      ["EB05", "/eb05-preorders", "2026-10-30"],
      ["OP18", "/op18-preorders", "2026-11-20"],
    ],
  );
  assert.deepEqual(upcomingPreorderPages(sets, "2026-10-30").map((l) => l.code), ["OP18"]);
  assert.deepEqual(upcomingPreorderPages(sets, "2026-11-20"), [], "the homepage line disappears on its own");
});

test("the set page, /release-dates and the homepage link the boards through the self-retiring helpers", () => {
  const setPage = read("src/app/sets/[slug]/page.tsx");
  assert.match(setPage, /preorderPageFor\(set, today\)/);
  assert.match(setPage, /<PreorderCallout /);
  assert.match(read("src/components/PreorderCallout.tsx"), /\{code\} pre-order prices from every tracked store →/);
  const releases = read("src/app/release-dates/page.tsx");
  assert.match(releases, /preorderPageFor\(next, today\)/);
  assert.match(releases, /preorderPageFor\(s, today\)/);
  const home = read("src/components/home/HomeSections.tsx");
  assert.match(home, /upcomingPreorderPages\(cat\.sets, today\)/);
  assert.match(home, /<PreorderLinksLine links=\{preorders\} \/>/);
  // No hand-kept list of codes anywhere: PREORDER_PAGES is the one map.
  for (const f of ["src/app/sets/[slug]/page.tsx", "src/app/release-dates/page.tsx", "src/components/home/HomeSections.tsx", "src/components/home/PreorderLinksLine.tsx"]) {
    assert.doesNotMatch(read(f), /"(?:EB05|OP18)"|eb05-preorders|op18-preorders/, f);
  }
});

test("the product block: Marketplaces pinned first and outside the ranking, then the stores cheapest first, then sold out", () => {
  const card = read("src/components/PreorderProduct.tsx");
  const at = (needle: string) => {
    const i = card.indexOf(needle, card.indexOf("return (\n    <section"));
    assert.ok(i > 0, needle);
    return i;
  };
  assert.ok(at(">Marketplaces<") < at(">Stores, cheapest first<"), "the marketplaces come first");
  assert.ok(at("{ebayLine}") < at("{tcgLine}"), "eBay, then TCGplayer");
  assert.ok(at("shown.map(row)") < at("board.soldOut.map(dead)"), "sold-out stores last");
  // Only the store ranking is numbered and badged, and it reads the stores alone.
  assert.match(card, /const shown = board\.stores\.slice\(0, VISIBLE\)/);
  assert.match(card, /const more = board\.stores\.slice\(VISIBLE\)/);
  assert.equal((card.match(/>Cheapest store</g) ?? []).length, 1, "the badge, on the store ranking only");
  assert.equal((card.match(/\{i \+ 1\}/g) ?? []).length, 1, "one numbered list: the stores");
  // The headline is still the cheapest open offer from anyone.
  assert.match(card, /const lowest = board\.rows\[0\] \?\? null/);
  // A sold-out row has no buy button and no accent price.
  const dead = card.slice(card.indexOf("const dead = "), card.indexOf("const soldOutCount"));
  assert.doesNotMatch(dead, /btn-|text-accent/);
  // The TCGplayer market price is a reference, never drawn as a price to buy at.
  const ref = card.slice(card.indexOf("// A reference, never a price to buy at"), card.indexOf("href: tcgHref"));
  assert.doesNotMatch(ref, /text-accent/);
  // No guarantee copy (EPN), and the marketplaces say they are not ranked.
  assert.doesNotMatch(card, /money.?back|buyer protection/i);
  assert.match(card, /individual sellers · not ranked with the stores · affiliate links/);
});

test("the summary strip: data only, under the intro, stores never counted with eBay or TCGplayer", () => {
  const page = read("src/components/PreorderPage.tsx");
  assert.match(page, /preorderSummary\(mainBoards, country, now\)/);
  const intro = page.indexOf("Prices refresh daily.");
  const strip = page.indexOf("pre-orders at a glance");
  const products = page.indexOf("<PreorderProduct key={s.id}");
  assert.ok(intro > 0 && intro < strip && strip < products, "under the intro, above the products");
  for (const label of ["Stores checked", "Taking pre-orders", "Cheapest box at a store", "Release"]) assert.ok(page.includes(`>${label}</dt>`), label);
  assert.match(page, /Across all six markets: \{summary\.all\.listing\}/);
  assert.match(page, /TCGplayer and eBay are not counted as stores\./);
});
