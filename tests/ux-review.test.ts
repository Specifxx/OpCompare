// The owner's 2026-11-23 UX review, ported from DexCompare (DECISIONS.md, 2026-11-24).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSealedQuery, perPack, sealedNameMatches, sortSealed, underMarket, type SealedCtx } from "../src/lib/sealed-query";
import { evalSnapshotAge, JOBS } from "../src/lib/health";
import type { SealedLite } from "../src/lib/data";

const read = (f: string) => fs.readFileSync(f, "utf8");
const S = (id: number, name: string, usLow: number | null, over: Partial<SealedLite> = {}): SealedLite => ({
  id, slug: `s${id}`, name, setId: null, kind: "Booster Box", packCount: 24, imageUrl: null, releasedOn: null, presale: false, marketUsd: null,
  low: { US: usLow, AU: null, UK: null, SG: null, CA: null, EU: null }, stores: { US: 1, AU: 0, UK: 0, SG: 0, CA: 0, EU: 0 }, change7d: null, tcgplayerUrl: "", ...over,
});
const ctx: SealedCtx = { country: "US", setSlugOf: () => undefined, setReleased: () => undefined };

test("P0 3: sort by price per pack and by % under TCGplayer's market; unknowns last", () => {
  const rows = [S(1, "A", 24000, { marketUsd: 24000 }), S(2, "B", 12000, { packCount: 6, marketUsd: 20000 }), S(3, "C", 9600, { marketUsd: 8000 }), S(4, "D", null, { marketUsd: 1 })];
  assert.equal(perPack(rows[0], "US"), 1000);
  assert.equal(perPack(rows[3], "US"), null);
  assert.deepEqual(sortSealed(rows, parseSealedQuery({ sort: "per-pack" }).sort, ctx).map((r) => r.id), [3, 1, 2, 4]);
  assert.ok(Math.abs((underMarket(rows[1], "US") ?? 0) - 0.4) < 1e-9);
  assert.deepEqual(sortSealed(rows, parseSealedQuery({ sort: "under-market" }).sort, ctx).map((r) => r.id), [2, 1, 3, 4]);
});

test("P0 5: sealed search takes BB / SD / DP and one-letter typos, and never matches a different word", () => {
  assert.ok(sealedNameMatches("Romance Dawn Booster Box", "romance dawn bb"));
  assert.ok(sealedNameMatches("Starter Deck 01: Straw Hat Crew", "sd straw hat"));
  assert.ok(sealedNameMatches("Paramount War Booster Box", "paramont war"));
  assert.ok(sealedNameMatches("Paramount War Booster Box", "Paramount"));
  assert.ok(sealedNameMatches("Double Pack Set Vol. 1", "double pack"));
  assert.ok(!sealedNameMatches("Paramount War Booster Box", "romance"));
  assert.ok(!sealedNameMatches("Romance Dawn Booster Box", "war"));
});

test("P0 5: the card list answers a typo with the nearest real name, says so, and never dead-ends", () => {
  const page = read("src/app/browse/page.tsx");
  assert.match(page, /suggestNames\(cat\.cards\.map/);
  assert.match(page, /Showing results for/);
  assert.match(page, /Popular cards right now/);
  assert.match(read("src/app/api/search/route.ts"), /sealedNameMatches\(s\.name, q\)/);
});

test("P0 1: self-opening cards wait while the visitor types and share one prompt a visit; the floating ad card is off", () => {
  const rate = read("src/components/site-reviews/RateCard.tsx");
  assert.match(rate, /visitorBusy\(\)/);
  assert.match(rate, /claimPromptSlot\("rate-card"\)/);
  assert.doesNotMatch(read("src/app/layout.tsx"), /<ReturnNudge \/>/);
  const busy = read("src/lib/visitor-busy.ts");
  assert.match(busy, /QUIET_MS = 5000/);
});

test("P0 2: the snapshot is red past 16 hours, amber past 12, and Price freshness is a watched job that restarts the import", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  const at = (h: number) => new Date(now.getTime() - h * 3_600_000);
  assert.equal(evalSnapshotAge(at(11), now).status, "ok");
  assert.equal(evalSnapshotAge(at(12), now).status, "warn");
  assert.equal(evalSnapshotAge(at(16), now).status, "fail");
  assert.ok(JOBS.some((j) => j.file === "price-freshness.yml"));
  const wf = read(".github/workflows/price-freshness.yml");
  assert.match(wf, /gh workflow run import-prices\.yml -f stores=true -f alerts=none/);
  assert.match(wf, /for wf in import-prices\.yml ebay-prices\.yml/, "never while the import or eBay pass is queued or running");
  assert.match(wf, /-ge 13 \]; then/);
});

test("P0 6 and P1 13: the promo line closes; sealed and card pages carry jump links", () => {
  assert.match(read("src/components/HolidayStrip.tsx"), /<StripClose id=/);
  assert.match(read("src/app/sealed/[slug]/page.tsx"), /<MarketSectionNav sections=/);
  assert.match(read("src/app/card/[slug]/page.tsx"), /<MarketSectionNav sections=/);
});
