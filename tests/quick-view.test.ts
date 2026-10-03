// The card QuickView's payload and the card page's phone buy path
// (src/lib/quick-view.ts, GET /api/card/[slug], CardQuickLink, CardTopBuy,
// CardStickyBuyBar): the board's ranking, every market, tagged links, and the
// wiring rules (provider in the layout, no session, links everywhere).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { CardDetail, OfferRow } from "../src/lib/data";
import { cardDisplayName, cheapestBuyRow, isPreRelease, marketRows, quickViewPayload, QUICKVIEW_ROWS } from "../src/lib/quick-view";
import { tagPlanLinks, planBuyList } from "../src/lib/buy-list";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

const offer = (o: Partial<OfferRow> & Pick<OfferRow, "source" | "market" | "priceCents">): OfferRow => ({
  currency: { US: "USD", AU: "AUD", UK: "GBP", SG: "SGD", CA: "CAD", EU: "EUR" }[o.market] ?? "USD",
  url: `https://shop.example/${o.source}`,
  inStock: true,
  condition: null,
  shippingCents: null,
  updatedAt: "2026-10-03T00:00:00.000Z",
  ...o,
});

function card(offers: OfferRow[], over: Partial<CardDetail> = {}): CardDetail {
  return {
    id: 453506,
    slug: "shanks-op01-120-parallel",
    name: "Shanks",
    tcgName: "Shanks (Parallel)",
    number: "OP01-120",
    rarity: "SEC",
    variant: "Parallel",
    printing: "alt",
    colors: ["Red"],
    cardType: "Character",
    cost: 10,
    power: 12000,
    counter: null,
    life: null,
    attribute: "Slash",
    subtypes: ["Red-Haired Pirates"],
    effect: "Long effect text that the popup never needs.",
    finish: null,
    hasImage: true,
    tcgplayerUrl: "https://www.tcgplayer.com/product/453506",
    marketUsd: 9999,
    change7d: 4.2,
    change30d: null,
    set: { id: 1, slug: "romance-dawn", code: "OP01", name: "Romance Dawn", kind: "booster", releasedOn: "2022-12-02", cardCount: 121, sealedCount: 4 },
    offers,
    ...over,
  };
}

test("marketRows: in stock, the market's own currency, cheapest by item price (the board's rule)", () => {
  const rows = marketRows(
    [
      offer({ source: "store:a", market: "AU", priceCents: 900 }),
      offer({ source: "store:b", market: "AU", priceCents: 700, inStock: false }),
      offer({ source: "store:c", market: "AU", priceCents: 500, currency: "USD" }),
      offer({ source: "ebay", market: "AU", priceCents: 800, shippingCents: 900 }),
      offer({ source: "store:d", market: "US", priceCents: 100 }),
    ],
    "AU",
  );
  assert.deepEqual(rows.map((r) => r.source), ["ebay", "store:a"]);
});

test("the payload covers all six markets, top rows only, with tagged links and per-market eBay searches", () => {
  const offers = [
    ...Array.from({ length: 8 }, (_, i) => offer({ source: `store:s${i}`, market: "US", priceCents: 1000 + i * 10 })),
    offer({ source: "tcgplayer", market: "US", priceCents: 950, url: "https://www.tcgplayer.com/product/453506" }),
    offer({ source: "ebay", market: "UK", priceCents: 4000, url: "https://www.ebay.co.uk/itm/123", shippingCents: 250 }),
  ];
  const p = quickViewPayload(card(offers), "2026-10-03");
  assert.deepEqual(Object.keys(p.markets).sort(), ["AU", "CA", "EU", "SG", "UK", "US"]);
  const us = p.markets.US;
  assert.equal(us.count, 9);
  assert.equal(us.rows.length, QUICKVIEW_ROWS);
  assert.equal(us.rows[0].source, "tcgplayer");
  assert.equal(us.rows[0].label, "TCGplayer");
  assert.match(us.rows[0].href, /^https:\/\/partner\.tcgplayer\.com\/.*sharedid=oc-tcgplayer-card/);
  assert.equal(us.rows[1].href, "https://shop.example/store:s0", "a store's own URL is untouched");
  assert.equal(us.ebayRow, false);
  const uk = p.markets.UK;
  assert.equal(uk.ebayRow, true);
  assert.equal(uk.rows[0].retailer, "ebay_uk");
  assert.equal(uk.rows[0].postage, "+ £2.50 postage · ≈ £42.50 delivered");
  assert.match(uk.rows[0].href, /campid=/);
  assert.equal(new URL(p.markets.AU.ebaySearch).hostname, "www.ebay.com.au");
  assert.equal(new URL(p.markets.EU.ebaySearch).hostname, "www.ebay.es");
  assert.match(new URL(p.markets.AU.ebaySearch).searchParams.get("customid") ?? "", /^oc-au-quickview-search$/);
  assert.equal(new URL(p.markets.AU.ebaySearch).searchParams.get("_nkw"), "One Piece Shanks OP01-120 Parallel");
  assert.equal(p.markets.AU.count, 0);
  assert.match(p.tcgHref, /^https:\/\/partner\.tcgplayer\.com\//);
  assert.equal(p.preRelease, false);
});

test("the payload is small: no card text, no stale or out-of-stock rows", () => {
  const offers = Array.from({ length: 40 }, (_, i) => offer({ source: `store:s${i}`, market: (["US", "AU", "UK", "SG", "CA", "EU"] as const)[i % 6], priceCents: 500 + i }));
  const p = quickViewPayload(card([...offers, offer({ source: "store:gone", market: "US", priceCents: 1, inStock: false })]));
  const json = JSON.stringify(p);
  assert.ok(!json.includes("Long effect text"));
  assert.ok(!json.includes("store:gone"));
  assert.ok(json.length < 16_000, `payload ${json.length} B`);
});

test("pre-release: a set dated after today", () => {
  assert.equal(isPreRelease("2026-11-07", "2026-10-03"), true);
  assert.equal(isPreRelease("2026-10-03", "2026-10-03"), false);
  assert.equal(isPreRelease(null, "2026-10-03"), false);
  const p = quickViewPayload(card([], { set: { id: 9, slug: "op-14", code: "OP14", name: "Next", kind: "booster", releasedOn: "2026-11-07", cardCount: 0, sealedCount: 0 } }), "2026-10-03");
  assert.equal(p.preRelease, true);
});

test("cheapestBuyRow is the board's #1 row (CardTopBuy and the sticky bar agree with the comparison)", () => {
  const offers = [offer({ source: "store:a", market: "CA", priceCents: 1200 }), offer({ source: "ebay_us", market: "CA", priceCents: 1100 })];
  const best = cheapestBuyRow(offers, "CA", "/card/x");
  assert.equal(best?.source, "ebay_us");
  assert.equal(best?.label, "eBay US");
  assert.equal(best?.retailer, "ebay_us");
  assert.equal(best?.ebay, true);
  assert.equal(cheapestBuyRow(offers, "SG", "/card/x"), null);
  assert.equal(cardDisplayName({ name: "Shanks", variant: "Parallel", number: "OP01-120" }), "Shanks (Parallel) OP01-120");
});

test("Buy List Planner links: TCGplayer through Impact, stores untouched", () => {
  const plan = tagPlanLinks(
    planBuyList([
      { slug: "a", name: "A", offers: [{ source: "tcgplayer", priceCents: 100, url: "https://www.tcgplayer.com/product/1", inStock: true }] },
      { slug: "b", name: "B", offers: [{ source: "store:x", priceCents: 200, url: "https://x.example/p/b", inStock: true }] },
    ]),
  );
  const urls = plan.split.flatMap((b) => b.picks.map((p) => p.url));
  assert.ok(urls.some((u) => /^https:\/\/partner\.tcgplayer\.com\/.*sharedid=oc-tcgplayer-tools/.test(u)));
  assert.ok(urls.includes("https://x.example/p/b"));
  assert.ok(plan.single.every((b) => b.picks.every((p) => b.source !== "tcgplayer" || p.url.includes("partner.tcgplayer.com"))));
});

test("wiring: the provider sits in the root layout, which still reads no session", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /<QuickViewProvider>/);
  assert.doesNotMatch(layout, /getCurrentUser|cookies\(\)/);
  const provider = read("src/components/QuickViewProvider.tsx");
  assert.doesNotMatch(provider, /useMe|\/api\/me|document\.cookie/);
  assert.match(provider, /history\.pushState/);
  assert.match(read("src/app/api/card/[slug]/route.ts"), /getCardDetail/);
});

test("wiring: every card surface this track owns links through CardQuickLink", () => {
  for (const f of [
    "src/components/CardTile.tsx",
    "src/components/MoverList.tsx",
    "src/app/price-guide/page.tsx",
    "src/app/sets/[slug]/page.tsx",
    "src/app/cards/all/page.tsx",
  ]) {
    const src = read(f);
    assert.match(src, /<CardQuickLink/, f);
    assert.doesNotMatch(src, /href=\{`\/card\/\$\{/, `${f} still has a plain /card/ link`);
  }
});

test("outbound links on the card page carry affiliate tagging and the click attributes", () => {
  const page = read("src/app/card/[slug]/page.tsx");
  assert.doesNotMatch(page, /href=\{card\.tcgplayerUrl\}/, "the card-details TCGplayer link goes through affiliateUrl");
  for (const f of ["src/components/TcgMarketPrice.tsx", "src/components/EbayCardBanner.tsx", "src/components/CardTopBuy.tsx", "src/components/CardStickyBuyBar.tsx", "src/components/QuickView.tsx", "src/components/EbayBuyCta.tsx", "src/app/price-guide/GuideBuyLinks.tsx"]) {
    const src = read(f);
    const anchors = src.match(/<a\s[^>]*target="_blank"[^>]*>/gs) ?? [];
    assert.ok(anchors.length > 0, f);
    for (const a of anchors) {
      assert.match(a, /rel=\{outboundRel\(\)\}/, `${f}: ${a.slice(0, 60)}`);
      assert.match(a, /data-retailer=/, f);
      assert.match(a, /data-page=/, f);
    }
  }
  assert.match(read("src/components/EbayCardBanner.tsx"), /data-ad-placement/);
  assert.match(read("src/components/EbayCardBanner.tsx"), />Ad</);
});
