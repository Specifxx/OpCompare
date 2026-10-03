// Pure helpers behind the tools track's pages: the selling-fee maths and
// schedules, the Buy List Planner's condition floor, keyword extraction and the
// SEO facet vocabulary.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFees, defaultScheduleFor, FEE_SCHEDULES, parseRate } from "../src/lib/selling-fees";
import { meetsMinCondition, parseMinCondition, planTotal } from "../src/lib/buy-list-condition";
import { cardKeywords, KEYWORDS } from "../src/lib/keywords";
import { facetBySlug, leaderSlug, paginate, PRINTING_FACETS, RARITY_FACETS, TYPE_FACETS, UNFACETED_PRINTINGS } from "../src/lib/facets";
import { PRINTINGS, RARITIES, CARD_TYPES } from "../src/lib/constants";

const sched = (id: string) => FEE_SCHEDULES.find((s) => s.id === id)!;
const run = (id: string, price: number, shipCharged = 0, shipCost = 0) => {
  const s = sched(id);
  return computeFees({ price, shipCharged, shipCost, commissionPct: s.commissionPct, commissionBase: s.commissionBase, commissionCap: s.commissionCap, tier: s.tier, processingPct: s.processingPct, fixedFee: s.fixedFee, fixedFeeOver: s.fixedFeeOver });
};

test("TCGplayer: 10.75% on the item, 2.5% + $0.30 on item + postage", () => {
  const r = run("tcgplayer", 40, 1, 0.8);
  assert.equal(r.commission, 4.3);
  assert.equal(r.processing, 1.03); // 2.5% of 41 = 1.025
  assert.equal(r.fixedFee, 0.3);
  assert.ok(Math.abs(r.net - 34.575) <= 0.006, String(r.net));
  assert.ok(r.complete);
});

test("TCGplayer's commission is capped at $75 an item", () => {
  assert.equal(run("tcgplayer", 1000).commission, 75);
});

test("eBay US: 13.25% of item + postage, 2.35% above $7,500, $0.30/$0.40 per order", () => {
  const small = run("ebay-us", 8, 1);
  assert.equal(small.commission, 1.19); // 13.25% of 9
  assert.equal(small.fixedFee, 0.3);
  const big = run("ebay-us", 10000);
  assert.equal(big.commission, Math.round((0.1325 * 7500 + 0.0235 * 2500) * 100) / 100);
  assert.equal(big.fixedFee, 0.4);
});

test("eBay UK private sellers pay no final value fee", () => {
  const r = run("ebay-uk-private", 20, 2, 1.5);
  assert.equal(r.totalFees, 0);
  assert.equal(r.net, 20.5);
});

test("an unconfirmed rate is blank, and a blank commission is never a payout", () => {
  for (const id of ["ebay-au", "ebay-ca", "cardmarket", "custom"]) assert.equal(sched(id).commissionPct, null, id);
  assert.equal(run("cardmarket", 10).complete, false);
  assert.equal(parseRate(""), null);
  assert.equal(parseRate("abc"), null);
  assert.equal(parseRate("5.5"), 5.5);
});

test("every schedule is dated and sourced; each market starts on its own", () => {
  for (const s of FEE_SCHEDULES) {
    assert.match(s.checked, /^\d{4}-\d{2}-\d{2}$/);
    if (s.id !== "custom") assert.match(s.source.url, /^https:\/\//);
  }
  assert.equal(defaultScheduleFor("US"), "tcgplayer");
  assert.equal(defaultScheduleFor("UK"), "ebay-uk-private");
  assert.equal(defaultScheduleFor("EU"), "cardmarket");
  assert.ok(FEE_SCHEDULES.some((s) => s.id === defaultScheduleFor("SG")));
});

test("condition floor: store rows by grade, unstated = NM; TCGplayer only with no floor", () => {
  const store = (condition: string | null) => ({ source: "store:x", condition });
  assert.ok(meetsMinCondition(store(null), "nm"));
  assert.ok(meetsMinCondition(store("NM"), "nm"));
  assert.ok(!meetsMinCondition(store("LP"), "nm"));
  assert.ok(meetsMinCondition(store("LP"), "lp"));
  assert.ok(!meetsMinCondition(store("MP"), "lp"));
  assert.ok(meetsMinCondition(store("DMG"), "any"));
  assert.ok(!meetsMinCondition({ source: "tcgplayer", condition: null }, "lp"));
  assert.ok(meetsMinCondition({ source: "tcgplayer", condition: null }, "any"));
  assert.equal(parseMinCondition("lp"), "lp");
  assert.equal(parseMinCondition("mint"), "any");
});

test("planTotal keeps only the total and counts", () => {
  const t = planTotal({ split: [{ totalCents: 500, picks: [1, 2] }, { totalCents: 100, picks: [3] }], splitTotalCents: 600, unavailable: ["x"] });
  assert.deepEqual(t, { splitTotalCents: 600, stores: 2, priced: 3, unavailable: 1 });
  assert.deepEqual(Object.keys(t).sort(), ["priced", "splitTotalCents", "stores", "unavailable"]);
});

test("cardKeywords reads bracketed keywords, Activate:Main both ways, DON!! ×N folded", () => {
  assert.deepEqual(cardKeywords("[Blocker]\n[On Play] Draw 1 card."), ["blocker", "on-play"]);
  assert.deepEqual(cardKeywords("[Activate:Main] [Once Per Turn] Rest this."), ["activate-main", "once-per-turn"]);
  assert.deepEqual(cardKeywords("[DON!! x1] [When Attacking] ..."), ["when-attacking", "don-x"]);
  assert.deepEqual(cardKeywords("[Rush: Character]"), ["rush-character"]);
  assert.deepEqual(cardKeywords("If your Leader has the \"Blackbeard Pirates\" type, this Character gains [Blocker] and +4 cost."), ["blocker"]);
  assert.deepEqual(cardKeywords("add up to 1 [Trafalgar Law] from your trash"), []);
  assert.deepEqual(cardKeywords(null), []);
  assert.equal(new Set(KEYWORDS.map((k) => k.slug)).size, KEYWORDS.length);
});

test("facets cover every printing, rarity and card type, with unique slugs", () => {
  assert.deepEqual(UNFACETED_PRINTINGS, []);
  assert.deepEqual(RARITY_FACETS.map((f) => f.key).sort(), Object.keys(RARITIES).sort());
  assert.deepEqual(TYPE_FACETS.map((f) => f.key), [...CARD_TYPES]);
  for (const list of [PRINTING_FACETS, RARITY_FACETS, TYPE_FACETS]) {
    assert.equal(new Set(list.map((f) => f.slug)).size, list.length);
    for (const f of list) assert.match(f.slug, /^[a-z0-9-]+$/);
  }
  assert.equal(facetBySlug(PRINTING_FACETS, "Parallel")?.key, "alt");
  assert.equal(facetBySlug(RARITY_FACETS, "secret-rare")?.key, "SEC");
  assert.equal(facetBySlug(TYPE_FACETS, "nope"), undefined);
  assert.ok(Object.keys(PRINTINGS).length >= PRINTING_FACETS.length);
});

test("leaderSlug and paginate", () => {
  assert.equal(leaderSlug("Monkey.D.Luffy", "OP05-060"), "monkey-d-luffy-op05-060");
  const p = paginate([1, 2, 3, 4, 5], "9", 2);
  assert.deepEqual([p.page, p.pages, p.slice], [3, 3, [5]]);
  assert.equal(paginate([], undefined, 10).pages, 1);
});
