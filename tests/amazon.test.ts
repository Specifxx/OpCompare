// Amazon Associates (owner, 2026-10-29): sealed pages link to the visitor's Amazon (US, AU, UK, CA and EU, tags hard-coded; never SG), a tagged search with a per-placement ascsubtag, no price, the third pinned row of the board (2026-11-03), the statement beside it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AMAZON_REL, AMAZON_STATEMENT, amazonFor, amazonQuery, amazonSearchUrl } from "../src/lib/amazon";
import { MARKETS } from "../src/lib/country";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("where: Amazon US, AU, UK, CA and DE with the owner's hard-coded tags, never Singapore", () => {
  assert.deepEqual(MARKETS.filter((c) => amazonFor(c)), MARKETS.filter((c) => c !== "SG"));
  assert.equal(amazonFor("US")!.tag, "riftcompare-20");
  assert.equal(amazonFor("AU")!.tag, "compareempire-22");
  assert.equal(amazonFor("UK")!.tag, "compareempi03-21");
  assert.equal(amazonFor("CA")!.tag, "compareempire-20");
  assert.equal(amazonFor("EU")!.tag, "compareempire-21");
  assert.equal(amazonFor("EU")!.host, "www.amazon.de");
  assert.equal(amazonFor("SG"), null);
  assert.doesNotMatch(read("src/lib/amazon.ts"), /process\.env/, "no Vercel variable decides a tag (owner, 2026-11-02)");
});

test("the link: a tagged search on the market's Amazon, ascsubtag oc-<market>-<placement>, nothing else", () => {
  const u = new URL(amazonSearchUrl("US", "OP-13 Carrying on His Will Booster Box", "sealed-amazon")!);
  assert.equal(u.origin + u.pathname, "https://www.amazon.com/s");
  assert.equal(u.searchParams.get("k"), "One Piece Card Game OP-13 Carrying on His Will Booster Box");
  assert.equal(u.searchParams.get("tag"), "riftcompare-20");
  assert.equal(u.searchParams.get("ascsubtag"), "oc-us-sealed-amazon");
  assert.deepEqual([...u.searchParams.keys()].sort(), ["ascsubtag", "k", "tag"]);
  assert.equal(new URL(amazonSearchUrl("AU", "x", "sealed-page")!).hostname, "www.amazon.com.au");
  assert.equal(amazonSearchUrl("SG", "x", "sealed-page"), null);
  assert.equal(amazonQuery("Starter Deck [ST-21] - Pre-order"), "One Piece Card Game Starter Deck Pre-order");
  assert.equal(AMAZON_REL, "sponsored nofollow noopener");
});

test("placed on sealed pages only, as the third pinned row after eBay and TCGplayer (owner, 2026-11-03), no Amazon price", () => {
  const sealed = read("src/app/sealed/[slug]/page.tsx");
  assert.match(sealed, /thirdRow=\{<AmazonCheck country=\{country\} name=\{s\.name\} slug=\{s\.slug\} \/>\}/);
  const view = read("src/components/PriceBoardView.tsx");
  assert.match(view, /at === pins\.length - 1 \? <Fragment key="third-row">\{thirdRow\}<\/Fragment>/, "right after the pinned pair");
  assert.match(view, /\{pins\.length \? null : thirdRow\}/, "first of the board when nothing is pinned");
  const comp = read("src/components/AmazonCheck.tsx");
  assert.match(comp, /\{AMAZON_STATEMENT\}/);
  assert.match(comp, />Ad</, "labelled Ad");
  assert.match(comp, /rel=\{AMAZON_REL\}/);
  assert.match(comp, /data-retailer=/, "counted like every outbound link");
  assert.doesNotMatch(comp, /money\(|priceCents|Prime|rating/, "no Amazon price, rating or Prime");
  assert.match(read("src/app/sealed/page.tsx"), /amazonSearchUrl\(country, x\.q, "sealed-page"\)/);
  for (const f of ["src/components/PriceBoard.tsx", "src/components/PriceBoardView.tsx", "src/lib/board-model.ts", "src/lib/alerts.ts", "src/lib/basket.ts"]) assert.doesNotMatch(read(f), /amazon/i, f);
  assert.ok(read("src/components/Footer.tsx").includes(AMAZON_STATEMENT));
});
