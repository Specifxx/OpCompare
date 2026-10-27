// eBay rows on the price board (src/lib/board.ts, components/PriceBoard.tsx,
// lib/stores.ts sourceLabel): never re-ranked, honest postage, EPN-tagged links.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { compareBoardRows, ebayJsonLdOffers, ebayRetailer, postageLine, retailerSubId } from "../src/lib/board";
import { affiliateUrl } from "../src/lib/affiliate";
import { sourceLabel } from "../src/lib/stores";
import { SOURCE_RE } from "../src/lib/inbox-rules";

const row = (source: string, priceCents: number, shippingCents: number | null = null) => ({ source, priceCents, shippingCents });

test("rows rank by item price; eBay is never moved up or down for being eBay", () => {
  const rows = [row("store:a", 1200), row("ebay", 1000, 900), row("store:b", 1100)].sort(compareBoardRows);
  assert.deepEqual(rows.map((r) => r.source), ["ebay", "store:b", "store:a"]);
  const tie = [row("ebay", 1000, 500), row("store:a", 1000, null), row("ebay_us", 1000, 0)].sort(compareBoardRows);
  assert.deepEqual(tie.map((r) => r.source), ["store:a", "ebay_us", "ebay"]);
});

test("postage: unknown is never 'delivered'", () => {
  assert.equal(postageLine(row("ebay", 1000, null), "UK"), "postage at checkout");
  assert.equal(postageLine(row("ebay", 1000, 0), "UK"), "free postage");
  assert.equal(postageLine(row("ebay", 1000, 250), "UK"), "+ £2.50 postage · ≈ £12.50 delivered");
  assert.equal(postageLine(row("ebay_us", 1370, null), "CA"), "ships from the US · postage at checkout");
  assert.equal(postageLine(row("store:a", 1000, null), "US"), "postage at checkout");
});

test("labels name the market's eBay; derived CA rows say eBay US", () => {
  assert.equal(sourceLabel("ebay", "US"), "eBay");
  assert.equal(sourceLabel("ebay", "AU"), "eBay Australia");
  assert.equal(sourceLabel("ebay", "UK"), "eBay UK");
  assert.equal(sourceLabel("ebay", "CA"), "eBay Canada");
  assert.equal(sourceLabel("ebay", "EU"), "eBay Spain");
  assert.equal(sourceLabel("ebay_us", "CA"), "eBay US");
  assert.equal(sourceLabel("tcgplayer"), "TCGplayer");
  assert.notEqual(sourceLabel("ebay"), "ebay");
  assert.match("ebay", SOURCE_RE);
  assert.match("ebay_us", SOURCE_RE);
});

test("links re-tag at render as oc-<mkt>-ebay-<page>-product", () => {
  const stored = "https://www.ebay.co.uk/itm/123?mkevt=1&mkcid=1&mkrid=710-53481-19255-0&campid=5339155912&customid=oc-uk-product&toolid=10001";
  const uk = new URL(affiliateUrl(stored, retailerSubId("ebay"), "card"));
  assert.equal(uk.searchParams.get("customid"), "oc-uk-ebay-card-product");
  assert.equal(uk.searchParams.get("campid"), "5339155912");
  const us = new URL(affiliateUrl("https://www.ebay.com/itm/9", retailerSubId("ebay"), "sealed"));
  assert.equal(us.searchParams.get("customid"), "oc-us-ebay-sealed-product");
  const ca = new URL(affiliateUrl("https://www.ebay.com/itm/9", retailerSubId("ebay_us"), "card"));
  assert.equal(ca.searchParams.get("customid"), "oc-us-ebay_us-card-product");
  assert.equal(ebayRetailer("ebay", "UK"), "ebay_uk");
  assert.equal(ebayRetailer("ebay_us", "CA"), "ebay_us");
});

test("the board: eBay button, basis line, search strip relabel, disclosure on first paint", () => {
  // The markup is PriceBoardView's; the rows are resolved in lib/board-model.ts.
  const src = fs.readFileSync(path.resolve(__dirname, "../src/components/PriceBoardView.tsx"), "utf8");
  const model = fs.readFileSync(path.resolve(__dirname, "../src/lib/board-model.ts"), "utf8");
  assert.match(src, /btn-ebay/);
  assert.match(src, /Buy on eBay →/);
  assert.match(src, /Cheapest matching listing we found/);
  assert.match(src, /More listings on \$\{ebayLabel\(country\)\} →/);
  // The search leads the board when there is no eBay row (2026-10-27).
  assert.match(src, /data-surface="ebay_fallback"[^>]*>\s*Search eBay →/);
  assert.ok(src.indexOf('data-retailer="ebay_no_listing"') < src.indexOf("{ordered.map("), "the eBay search sits above the ranked rows");
  assert.match(model, /isPaidLink\(o\.url\)/);
  assert.match(src, /\{o\.paid \? <span[^>]*>Paid link<\/span> : null\}/);
  assert.match(src, /eBay Partner Network affiliate/);
  const disc = src.indexOf("eBay Partner Network affiliate");
  const openDetails = src.lastIndexOf("<details", disc);
  assert.ok(openDetails < 0 || src.lastIndexOf("</details>", disc) > openDetails, "the EPN disclosure is never inside <details>");
  assert.match(src, /rel=\{outboundRel\(\)\}/);
});

test("the board pins eBay and TCGplayer (the cheaper on top), keeps price ranks, and labels the pin", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../src/components/PriceBoardView.tsx"), "utf8");
  assert.match(src, /const pins = pinnedOrder\(pinEbay, pinTcg\);/);
  assert.match(src, /const ordered = \[\.\.\.pins, \.\.\.open\.filter/);
  assert.match(src, /const i = open\.indexOf\(o\);/);
  assert.match(src, /\{pinned \? <ShownFirst \/> : null\}/);
  assert.match(src, /% vs cheapest/);
  assert.match(src, /TCGplayer may not ship to your country/);
});

test("JSON-LD: eBay offers carry seller eBay, shipping only when known", () => {
  const ld = ebayJsonLdOffers([{ ...row("ebay", 1000, 250), url: "u" }, { ...row("ebay", 1100, null), url: "u" }, { ...row("store:a", 900), url: "u" }], "GBP", "GB");
  assert.equal(ld.length, 2);
  assert.deepEqual(ld[0].seller, { "@type": "Organization", name: "eBay" });
  assert.ok("shippingDetails" in ld[0]);
  assert.ok(!("shippingDetails" in ld[1]));
});
