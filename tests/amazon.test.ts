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
  assert.equal(amazonFor("AU")!.tag, "opcompare-22");
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

test("placed on sealed pages only, as the second row right under eBay (owner, 2026-11-06); Amazon's own price only through the live slot", () => {
  const sealed = read("src/app/sealed/[slug]/page.tsx");
  assert.match(sealed, /thirdRow=\{<AmazonCheck country=\{country\} name=\{s\.name\} slug=\{s\.slug\} \/>\}/);
  const view = read("src/components/PriceBoardView.tsx");
  assert.match(view, /o === pinEbay \? <Fragment key="third-row">\{thirdRow\}<\/Fragment>/, "right after the eBay row");
  assert.match(view, /\{hasEbayRow \? null : thirdRow\}/, "right after eBay's search row when eBay has no listing");
  const comp = read("src/components/AmazonCheck.tsx");
  assert.match(comp, /\{AMAZON_STATEMENT\}/);
  assert.match(comp, />Ad</, "labelled Ad");
  const slot = read("src/components/AmazonLiveSlot.tsx");
  assert.match(slot, /rel=\{AMAZON_REL\}/);
  assert.match(slot, /"data-retailer":/, "counted like every outbound link");
  assert.doesNotMatch(comp + slot, /money\(|Prime|rating/, "no Amazon price computed here (the route answers it formatted), no rating or Prime");
  // The route's own cents go only to the cart list's line (owner, 2026-11-06), which drops them after 24 hours.
  const relayed = (comp + slot).replace(/priceCents\?: number|live\.priceCents|priceCents=\{live\.priceCents\}/g, "");
  assert.doesNotMatch(relayed, /priceCents/, "priceCents only relayed to the cart");
  assert.match(slot, /\/api\/amazon\/sealed\//, "the price comes from the CDN-cached route (2026-11-05)");
  assert.match(read("src/app/sealed/page.tsx"), /amazonSearchUrl\(country, x\.q, "sealed-page"\)/);
  for (const f of ["src/components/PriceBoard.tsx", "src/components/PriceBoardView.tsx", "src/lib/board-model.ts", "src/lib/alerts.ts", "src/lib/basket.ts"]) assert.doesNotMatch(read(f), /amazon/i, f);
  assert.ok(read("src/components/Footer.tsx").includes(AMAZON_STATEMENT));
});

test("the sealed quick view's Amazon row is the page's tagged search, never Amazon's price (owner, 2026-11-06)", () => {
  const qv = readFileSync("src/components/SealedQuickView.tsx", "utf8");
  assert.match(qv, /amazonSearchUrl\(country as Country, data\.name, "sealed-quickview-amazon"\)/);
  assert.match(qv, /rel=\{AMAZON_REL\}/);
  assert.doesNotMatch(qv, /AmazonLiveSlot|\/api\/amazon\//, "the price stays on the sealed page");
});
