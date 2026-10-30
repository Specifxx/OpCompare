// Amazon Associates (owner, 2026-10-29): sealed pages link to the visitor's Amazon (US and AU by default; UK, CA and EU only with their
// own tag; never SG), a tagged search with a per-placement ascsubtag, no price, never a row of the board, the statement beside it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AMAZON_REL, AMAZON_STATEMENT, amazonFor, amazonQuery, amazonSearchUrl } from "../src/lib/amazon";
import { MARKETS } from "../src/lib/country";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("where: Amazon US and Amazon AU by default, UK/CA/EU only with a tag, never Singapore", () => {
  assert.deepEqual(MARKETS.filter((c) => amazonFor(c, {})), ["US", "AU"]);
  assert.equal(amazonFor("US", {})!.tag, "riftcompare-20");
  assert.equal(amazonFor("US", { AMAZON_ASSOCIATE_TAG: "opcompare-20" })!.tag, "opcompare-20");
  assert.equal(amazonFor("US", { AMAZON_US_TAG: "opcompare-20", AMAZON_ASSOCIATE_TAG: "x-20" })!.tag, "opcompare-20");
  assert.equal(amazonFor("US", { AMAZON_US_TAG: "not a tag" })!.tag, "riftcompare-20", "a malformed tag falls back");
  assert.equal(amazonFor("AU", {})!.tag, "compareempire-22");
  assert.equal(amazonFor("UK", {}), null);
  assert.equal(amazonFor("UK", { AMAZON_UK_TAG: "opcompare-21" })!.host, "www.amazon.co.uk");
  assert.equal(amazonFor("EU", { AMAZON_DE_TAG: "opcompare-21" })!.host, "www.amazon.de");
  assert.equal(amazonFor("SG", { AMAZON_SG_TAG: "x-22" }), null);
});

test("the link: a tagged search on the market's Amazon, ascsubtag oc-<market>-<placement>, nothing else", () => {
  const u = new URL(amazonSearchUrl("US", "OP-13 Carrying on His Will Booster Box", "sealed-amazon", {})!);
  assert.equal(u.origin + u.pathname, "https://www.amazon.com/s");
  assert.equal(u.searchParams.get("k"), "One Piece Card Game OP-13 Carrying on His Will Booster Box");
  assert.equal(u.searchParams.get("tag"), "riftcompare-20");
  assert.equal(u.searchParams.get("ascsubtag"), "oc-us-sealed-amazon");
  assert.deepEqual([...u.searchParams.keys()].sort(), ["ascsubtag", "k", "tag"]);
  assert.equal(new URL(amazonSearchUrl("AU", "x", "sealed-page", {})!).hostname, "www.amazon.com.au");
  assert.equal(amazonSearchUrl("SG", "x", "sealed-page", {}), null);
  assert.equal(amazonQuery("Starter Deck [ST-21] - Pre-order"), "One Piece Card Game Starter Deck Pre-order");
  assert.equal(AMAZON_REL, "sponsored nofollow noopener");
});

test("placed on sealed pages only, above the board (owner, 2026-10-30), beside the statement, never in the board, no Amazon price", () => {
  const sealed = read("src/app/sealed/[slug]/page.tsx");
  assert.match(sealed, /<AmazonCheck country=\{country\} name=\{s\.name\} slug=\{s\.slug\} \/>/);
  assert.ok(sealed.indexOf("<AmazonCheck") < sealed.indexOf("<PriceBoard"), "Amazon is the first row, above the board");
  const comp = read("src/components/AmazonCheck.tsx");
  assert.match(comp, /\{AMAZON_STATEMENT\}/);
  assert.match(comp, /rel=\{AMAZON_REL\}/);
  assert.match(comp, /data-retailer=/, "counted like every outbound link");
  assert.doesNotMatch(comp, /money\(|priceCents|Prime|rating/, "no Amazon price, rating or Prime");
  assert.match(read("src/app/sealed/page.tsx"), /amazonSearchUrl\(country, x\.q, "sealed-page"\)/);
  for (const f of ["src/components/PriceBoard.tsx", "src/lib/board-model.ts", "src/lib/alerts.ts", "src/lib/basket.ts"]) assert.doesNotMatch(read(f), /amazon/i, f);
  assert.ok(read("src/components/Footer.tsx").includes(AMAZON_STATEMENT));
});
