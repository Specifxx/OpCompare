// /card/[slug] is one cached HTML per card (owner, 2026-10-14), rendered on the
// baseline market and localised in the browser by the islands of
// components/card/CardMarket.tsx (RiftCompare's CardMarketSection model). Since
// 2026-10-17 the copy is kept by Vercel's CDN, not ISR (the bill).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_COUNTRY, MARKETS, type Country } from "../src/lib/country";
import type { OfferRow } from "../src/lib/data";
import { boardModel } from "../src/lib/board-model";
import { perMarket, perMarketList, pickMarket, pickMarketList } from "../src/lib/per-market";
import { dynamicApiUses, routeTree, stripComments } from "./helpers/route-tree";

const ROOT = path.resolve(__dirname, "..");
const PAGE = "src/app/card/[slug]/page.tsx";
const ISLANDS = "src/components/card/CardMarket.tsx";
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("the card page renders per request and Vercel's CDN keeps it six hours plus a day stale; no ISR, nothing prewarmed", async () => {
  const src = read(PAGE);
  assert.match(src, /^export const dynamic = "force-dynamic";$/m);
  // An ISR write is billed per 8 KB: a ~520 KB card page was ~65 units every time the 6-hour life or the import's tag purge rewrote it.
  assert.doesNotMatch(src, /^export const revalidate\b|generateStaticParams|export const dynamicParams\b|export const fetchCache\b/m);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const headers = await (require(path.join(ROOT, "next.config.js")) as { headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> }).headers();
  const rule = headers.find((h) => h.source === "/card/:slug");
  assert.deepEqual(rule?.headers, [{ key: "Vercel-CDN-Cache-Control", value: "public, s-maxage=21600, stale-while-revalidate=86400" }]);
});

test("nothing the card page can run reads the request (cookies, headers, getCountry, no-store)", () => {
  const tree = routeTree(PAGE);
  assert.ok(tree.files.includes(ISLANDS), "the walk reaches the market islands");
  assert.ok(tree.files.includes(path.join("src", "lib", "data.ts")), "the walk reaches the loaders");
  // The page's own force-dynamic is the point (the CDN keeps it); nothing else may make it per-visitor.
  assert.deepEqual(dynamicApiUses(tree).filter((u) => u !== `${PAGE}: exports dynamic = "force-dynamic"`), []);
  assert.doesNotMatch(stripComments(read(PAGE)), /searchParams/);
});

test("every cached read under the page is held at least six hours (a shorter one would become the page's life)", () => {
  // Next keeps the lowest revalidate any unstable_cache read in a render declares.
  const data = read("src/lib/data.ts");
  const consts: Record<string, number> = { TTL: 21600, DB_TTL: 43200, IMAGE_TTL: 86400 };
  assert.match(data, /^const TTL = 60 \* 60 \* 6;$/m);
  assert.match(data, /^const DB_TTL = 60 \* 60 \* 12;$/m);
  const ttlOf = (key: string): number => {
    const at = data.indexOf(`["${key}"]`);
    assert.ok(at > 0, key);
    const m = data.slice(at, at + 600).match(/revalidate: (\w+)/);
    assert.ok(m, key);
    return /^\d+$/.test(m[1]) ? Number(m[1]) : consts[m[1]];
  };
  // getCardDetail, getCatalog (core + prices), getProductHistory (the ref), getEmailStatus, getEbayPanel, DecksUsingCard.
  for (const key of ["card-detail-v4", "catalog-core-v2", "catalog-prices-v2", "history-ref-v1", "email-status-v1", "ebay-panel-v2", "decks-using-card-v1"]) {
    assert.ok(ttlOf(key) >= 21600, `${key}: ${ttlOf(key)} s`);
  }
  // A pinned history file is held a month; only the unpinned fallback (no database) is an hour.
  assert.match(data, /next: \{ revalidate: ref === "data" \? 3600 : 30 \* 86400 \}/);
});

test("metadata and JSON-LD state the baseline market the cached HTML is rendered on", () => {
  const src = read(PAGE);
  assert.equal(DEFAULT_COUNTRY, "US");
  assert.match(src, /const BASELINE: Country = DEFAULT_COUNTRY;/);
  assert.match(src, /lowUsCents: lite\?\.low\.US \?\? null/, "the snippet quotes the US listing, as the page does");
  assert.match(src, /const co = COUNTRIES\[BASELINE\];/);
  assert.match(src, /const inBaseline = inMarketOf\(BASELINE\);/);
  assert.match(src, /priceCurrency: co\.currency,/);
  assert.match(src, /eligibleRegion: \{ "@type": "Country", name: isoCountry\(BASELINE\) \}/);
  assert.match(src, /ebayJsonLdOffers\(inBaseline, co\.currency, isoCountry\(BASELINE\)\)/);
  assert.match(src, /<JsonLd data=\{faqLd\(baselineFaqs\)\} \/>/);
});

test("every market-dependent part is drawn by an island from all markets' data", () => {
  const src = stripComments(read(PAGE));
  for (const island of ["MarketTiles", "MarketTopBuy", "MarketAlertCta", "MarketNoListings", "MarketBoard", "MarketReference", "MarketHistory", "MarketParagraphs", "MarketFaq", "MarketTable", "MarketEbayPanel", "MarketStickyBuyBar", "MarketPlace"]) {
    assert.match(src, new RegExp(`<${island}\\b`), island);
  }
  // The server-side, single-market versions are gone from the page.
  for (const gone of ["<PriceBoard", "<CardTopBuy", "<CardStickyBuyBar", "<PriceDropAlertCta", "<CardNoListings", "<TcgMarketPrice", "<EbayCardBanner", "<TcgplayerBanner", "<CardMarketsTable", "<EbayCardPanel", "<LineChart"]) {
    assert.ok(!src.includes(`${gone} `) && !src.includes(`${gone}\n`), `${gone} renders one market on the server`);
  }
  assert.doesNotMatch(src, /country=\{country\}/);
  // Tiles take the visitor's market from CountryProvider.
  assert.doesNotMatch(src, /<CardTile[^>]*country=/);
});

test("the islands are client code that never reaches the store registry, the loaders or the database", () => {
  const src = read(ISLANDS);
  assert.match(src, /^"use client";/);
  const files = routeTree(ISLANDS).files;
  for (const f of ["src/lib/stores.ts", "src/lib/data.ts", "src/lib/db.ts", "src/lib/quick-view.ts", "src/lib/board-model.ts", "src/lib/market-comparison.ts"]) {
    assert.ok(!files.includes(f), `${ISLANDS} pulls ${f} into the browser bundle`);
  }
  // Each island picks the market CountryProvider resolved.
  assert.match(src, /const useMarket = \(\): Country => useCountry\(\)\.country;/);
});

test("perMarket: one value per market, identical values shared; pickMarket falls back to the baseline", () => {
  const pm = perMarket((m) => (m === "UK" ? { p: 2 } : { p: 1 }));
  assert.equal(pm.values.length, 2);
  for (const m of MARKETS) assert.deepEqual(pickMarket(pm, m), m === "UK" ? { p: 2 } : { p: 1 });
  const nulls = perMarket(() => null);
  assert.deepEqual(nulls.values, [null]);
  assert.equal(pickMarket(nulls, "EU"), null);
  assert.deepEqual(pickMarket(pm, "XX" as Country), { p: 1 });
});

test("perMarketList: a pool of distinct items, each market an ordered list into it", () => {
  const pl = perMarketList((m) => ["same opening", `price in ${m === "US" ? "the US" : "elsewhere"}`, "same closing"]);
  assert.equal(pl.pool.length, 4);
  assert.deepEqual(pickMarketList(pl, "US"), ["same opening", "price in the US", "same closing"]);
  assert.deepEqual(pickMarketList(pl, "AU"), ["same opening", "price in elsewhere", "same closing"]);
});

// ── The board's model: the rows PriceBoard drew, resolved on the server ──
const fresh = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
const older = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
const offer = (o: Partial<OfferRow> & Pick<OfferRow, "source" | "market" | "priceCents">): OfferRow => ({
  currency: { US: "USD", AU: "AUD", UK: "GBP", SG: "SGD", CA: "CAD", EU: "EUR" }[o.market as Country],
  url: `https://shop.example/${o.source}`,
  inStock: true,
  condition: null,
  shippingCents: null,
  updatedAt: fresh,
  ...o,
});

test("boardModel: open rows cheapest first with labels, tagged hrefs, eBay and paid flags; one sold-out row per store", () => {
  const offers = [
    offer({ source: "tcgplayer", market: "US", priceCents: 1200, url: "https://www.tcgplayer.com/product/1" }),
    offer({ source: "ebay", market: "US", priceCents: 900, url: "https://www.ebay.com/itm/1", shippingCents: 150 }),
    offer({ source: "store:a", market: "US", priceCents: 1000, condition: "LP" }),
    offer({ source: "store:a", market: "US", priceCents: 1100, condition: "NM" }),
    offer({ source: "store:b", market: "US", priceCents: 950, inStock: false, updatedAt: older }),
    offer({ source: "store:b", market: "US", priceCents: 960, inStock: false }),
    offer({ source: "store:c", market: "UK", priceCents: 700 }),
  ];
  const m = boardModel(offers, "US", { page: "card", ebayQuery: "One Piece Teach OP16-119" });
  assert.deepEqual(m.rows.map((r) => [r.source, r.priceCents]), [["ebay", 900], ["store:a", 1000], ["store:a", 1100], ["tcgplayer", 1200]]);
  const [ebay, , , tcg] = m.rows;
  assert.equal(ebay.ebay, true);
  assert.equal(ebay.paid, true);
  assert.match(ebay.href, /campid=/);
  assert.equal(ebay.retailer, "ebay_us");
  assert.match(tcg.href, /partner\.tcgplayer\.com/);
  assert.equal(m.rows[1].href, "https://shop.example/store:a", "a store's own URL, untagged");
  assert.equal(m.rows[1].ebay, undefined, "empty flags are left out of the payload");
  assert.match(m.rows[1].played ?? "", /under the cheapest NM here/);
  assert.deepEqual(m.sold.map((s) => [s.source, s.priceCents]), [["store:b", 960]]);
  assert.deepEqual(m.elsewhere, [{ m: "UK", cents: 700 }]);
  assert.match(m.ebaySearch, /ebay\.com\/sch\/.*card-board/);
  const uk = boardModel(offers, "UK", { page: "card", ebayQuery: "x" });
  assert.deepEqual(uk.rows.map((r) => r.source), ["store:c"]);
  assert.match(uk.ebaySearch, /ebay\.co\.uk/);
});
