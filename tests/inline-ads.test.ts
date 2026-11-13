import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const tile = (i: number, withListing = true) => ({
  id: i,
  slug: `c${i}`,
  name: `Card ${i}`,
  number: null,
  variant: null,
  marketUsd: 100 - i,
  imageUrl: `https://img/${i}.jpg`,
  listings: withListing ? { US: { url: `https://www.ebay.com/itm/${i}`, imageUrl: `https://i.ebayimg.com/${i}.jpg`, priceCents: 1000 + i, shippingCents: 0, currency: "USD" } } : {},
});

test("the block takes up to three live eBay listings, then TCGplayer's to fill six, and drops a side with fewer than two", async () => {
  const { inlineTiles } = await import("../src/components/InlineAds");
  const many = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => tile(i));
  const r = inlineTiles(many as never, "US");
  assert.equal(r.ebay.length, 3);
  assert.equal(r.tcg.length, 3);
  assert.equal(r.ebay[0].retailer, "ebay_inline");
  assert.equal(r.tcg[0].retailer, "tcgplayer_inline");
  // No live eBay listing in this market: eBay searches are not tiles, TCGplayer fills the row.
  const none = inlineTiles(many as never, "UK");
  assert.equal(none.ebay.length, 0);
  assert.equal(none.tcg.length, 6);
  assert.deepEqual(inlineTiles([tile(1), tile(2)] as never, "UK"), { ebay: [], tcg: [] }, "fewer than three tiles show nothing");
});

test("the block is eBay and TCGplayer only, labelled, sponsored, ad-free aware, browser only", () => {
  const s = code("src/components/InlineAds.tsx");
  assert.match(s, /^"use client";/);
  assert.match(s, /data-ad-placement="inline-ads"/, "hidden under the ad-free hint, and the phone dock yields to it");
  assert.match(s, /hasAttribute\("data-adfree"\)/);
  assert.match(s, />Ad<\/span>/);
  assert.match(s, /data-surface="inline_ads"/);
  assert.match(s, /outboundRel\(\)/);
  assert.doesNotMatch(s, /amazon|fetch ?tcg|\bfixed\b|sticky/i, "no Amazon, no Fetch, nothing floating");
  assert.ok(s.indexOf('brand: "eBay"') < s.indexOf('brand: "TCGplayer"'), "eBay first");
  assert.match(s, /minHeight: BLOCK_MIN_H/, "height reserved (CLS 0)");
  assert.match(s, /fetch\("\/api\/chase"\)/);
});

test("the side rails and the small strips are gone; the phone dock stays", () => {
  assert.ok(!fs.existsSync(path.join(ROOT, "src/components/SideRails.tsx")));
  assert.ok(!fs.existsSync(path.join(ROOT, "src/components/MiniChaseAds.tsx")));
  assert.match(read("src/app/layout.tsx"), /<PhoneDockAds \/>/);
  assert.doesNotMatch(read("src/app/globals.css"), /rail-scroll|side-rail/);
  for (const f of ["src/components/QuickView.tsx", "src/components/SealedQuickView.tsx"]) assert.doesNotMatch(code(f), /MiniChaseAds|InlineAds/, `${f}: no ad in a quick view`);
});

test("one block per page, in the right place, never on an article", async () => {
  const once = (f: string) => assert.equal(code(f).match(/<InlineAds\b/g)?.length, 1, f);
  for (const f of ["src/app/page.tsx", "src/app/card/[slug]/page.tsx", "src/app/sealed/[slug]/page.tsx", "src/app/sealed/page.tsx", "src/app/sets/page.tsx", "src/app/sets/[slug]/page.tsx", "src/app/browse/page.tsx", "src/app/price-guide/page.tsx", "src/app/movers/page.tsx", "src/app/market/page.tsx"]) {
    once(f);
    assert.doesNotMatch(code(f), /<(EbayChase|EbayPicks|MiniChaseAds)\b/, `${f}: the old strips are replaced`);
  }
  assert.doesNotMatch(code("src/components/blog/ArticleView.tsx"), /<InlineAds\b/, "no new block on articles");
  const card = read("src/app/card/[slug]/page.tsx");
  assert.ok(card.indexOf("<InlineAds") > card.indexOf("<MarketTiles"), "below the price tiles on the card page");
  const sealed = read("src/app/sealed/[slug]/page.tsx");
  assert.ok(sealed.indexOf("<InlineAds") > sealed.indexOf("<PriceBoard"), "below the price board on the sealed page");
  const { footerMiniAllowed } = await import("../src/components/FooterMiniChase");
  for (const p of ["/", "/au", "/card/x", "/sealed/x", "/sets/x", "/browse", "/blog/x", "/guides/x", "/account"]) assert.equal(footerMiniAllowed(p), false, p);
  for (const p of ["/trade", "/tools/best-basket"]) assert.equal(footerMiniAllowed(p), true, p);
});

test("the old footer leaderboards are gone: the footer zone holds only the one InlineAds block", () => {
  const src = code("src/components/AffiliateAds.tsx");
  assert.doesNotMatch(src, /AdBox|ebay_search|tcgplayer_footer|ebaySearchUrl|affiliateUrl/, "no eBay or TCGplayer leaderboard box in the footer zone");
  assert.match(src, /<FooterMiniChase\b/, "the zone still places the block on pages that do not mount it");
  assert.match(src, /BANNER_FREE/, "the policy and trust pages stay ad-free");
  assert.match(src, /data-ad-placement="footer"/, "ad-free members still hide the zone");
});
