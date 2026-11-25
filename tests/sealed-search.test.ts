// Sealed product is findable by search (owner, 2026-11-26: "you can't search any sealed products on opcompare"):
// by set code ("OP13", "op-13", "ST-15"), set name, kind and synonyms, in the header box AND on /browse's results page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { joinSetCodes, sealedNameMatches, searchSealed, wantsSealed } from "../src/lib/sealed-query";
import type { SealedLite } from "../src/lib/data";

const sets: Record<number, { code: string; name: string; releasedOn: string }> = {
  1: { code: "OP13", name: "Carrying On His Will", releasedOn: "2025-11-07" },
  2: { code: "OP12", name: "Legacy of the Master", releasedOn: "2025-08-22" },
  3: { code: "ST-15", name: "Starter Deck 15: RED Edward.Newgate", releasedOn: "2024-04-26" },
  4: { code: "PRB-01", name: "Premium Booster -The Best-", releasedOn: "2024-11-08" },
};
const row = (id: number, name: string, kind: string, setId: number): SealedLite =>
  ({ id, slug: `p${id}`, name, setId, kind, packCount: null, imageUrl: null, releasedOn: null, presale: false, marketUsd: 1000, low: { US: 100 } as never, stores: {} as never, change7d: null, tcgplayerUrl: "" }) as SealedLite;
const rows = [
  row(1, "Carrying On His Will Booster Box", "Booster Box", 1),
  row(2, "Carrying On His Will Booster Box Case", "Booster Case", 1),
  row(3, "Legacy of the Master Booster Box", "Booster Box", 2),
  row(4, "Legacy of the Master - Release Event Pack", "Promo Pack", 2),
  row(5, "Starter Deck 15: RED Edward.Newgate", "Starter Deck", 3),
  row(6, "Premium Booster -The Best- Booster Box", "Booster Box", 4),
];
const ctx = {
  country: "US" as const,
  setTextOf: (id: number | null) => (id != null && sets[id] ? `${sets[id].code} ${sets[id].name}` : undefined),
  setReleased: (id: number | null) => (id != null ? sets[id]?.releasedOn : undefined),
};
const ids = (q: string) => searchSealed(rows, q, ctx).map((s) => s.id);

test("set codes join however they are typed", () => {
  assert.equal(joinSetCodes("op 13 booster box"), "op13 booster box");
  assert.equal(joinSetCodes("op1"), "op01");
  assert.equal(joinSetCodes("st 15 prb 01"), "st15 prb01");
});

test("a set code finds its products, box before case, and never the set next to it", () => {
  assert.deepEqual(ids("OP13"), [1, 2]);
  assert.deepEqual(ids("op-13 booster box"), [1, 2]);
  assert.deepEqual(ids("op13 bb"), [1, 2]);
  assert.deepEqual(ids("ST-15"), [5]);
  assert.deepEqual(ids("prb01"), [6]);
});

test("names, kinds and synonyms; newest set first; promo packs last unless asked for", () => {
  assert.deepEqual(ids("booster box").slice(0, 3), [1, 3, 6]);
  assert.deepEqual(ids("legacy of the master"), [3, 4]);
  assert.deepEqual(ids("release event"), [4]);
  assert.deepEqual(ids("starter deck"), [5]);
  assert.ok(sealedNameMatches("Paramount War Booster Box", "paramont war"));
  assert.deepEqual(ids("x"), []);
});

test("words that ask for sealed put sealed first in the header box", () => {
  assert.ok(wantsSealed("OP13 booster box"));
  assert.ok(wantsSealed("starter deck"));
  assert.ok(!wantsSealed("luffy"));
});

test("Enter in the header box shows sealed on /browse, and the box keeps sealed rows beside ten cards", () => {
  const browse = readFileSync("src/app/browse/page.tsx", "utf8");
  assert.match(browse, /searchSealed\(sealedCat, asked\.q/);
  assert.match(browse, /data-browse-sealed/);
  const box = readFileSync("src/components/CardSearch.tsx", "utf8");
  assert.match(box, /cap - sealed\.length/);
  assert.match(box, /sealedFirst/);
  assert.match(readFileSync("src/app/sealed/page.tsx", "utf8"), /setTextOf/);
});
