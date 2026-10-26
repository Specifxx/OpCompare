import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { derivedRates, type PoolKey } from "../src/lib/box-ev";
import { CARDS_PER_PACK, PACKS_PER_BOX } from "../src/lib/pack-composition";
import { bestPull, canDeal, dealPack, packValueUsdCents, seededRng, simPools, simRates, type SimPools } from "../src/lib/pack-sim";

// The pack simulator deals the Box EV calculator's pack at the Box EV
// calculator's rates (lib/pack-sim.ts), so the two never disagree about a set.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

let nextId = 1;
const cards = (printing: string, rarity: string | null, n: number, usdCents: number | null = 10) =>
  Array.from({ length: n }, () => {
    const id = nextId++;
    return { id, slug: `c-${id}`, name: `Card ${id}`, number: null, printing, rarity, usdCents, hasImage: true };
  });

const fullSet = () =>
  simPools([
    ...cards("standard", "C", 40),
    ...cards("standard", "UC", 30),
    ...cards("standard", "R", 20, 50),
    ...cards("standard", "L", 6, 100),
    ...cards("standard", "SR", 12, 500),
    ...cards("standard", "SEC", 3, 5000),
    ...cards("alt", "SR", 10, 2000),
    ...cards("sp", "SR", 3, 8000),
    ...cards("manga", "SEC", 1, 50000),
    ...cards("promo", "P", 5, 999),
    ...cards("don", null, 5, 999),
  ]);

test("promos and DON!! are not pack pulls; chase printings get their own pools", () => {
  const pools = fullSet();
  assert.equal(pools.Common?.length, 40);
  assert.equal(pools.Parallel?.length, 10);
  assert.equal(pools.Manga?.length, 1);
  assert.equal(Object.values(pools).flat().some((c) => c!.usdCents === 999), false);
});

test("a pack is 12 cards: 7 C, 3 UC, the extra slot, then the rare slot last, with no card twice", () => {
  const pools = fullSet();
  for (let seed = 1; seed <= 200; seed++) {
    const pack = dealPack(pools, PACKS_PER_BOX, seededRng(seed));
    assert.equal(pack.length, CARDS_PER_PACK);
    assert.deepEqual(pack.slice(0, 7).map((c) => c.pool), Array(7).fill("Common"));
    assert.deepEqual(pack.slice(7, 10).map((c) => c.pool), Array(3).fill("Uncommon"));
    assert.ok(["Common", "Leader", "Parallel", "SP", "Treasure", "Manga"].includes(pack[10]!.pool), pack[10]!.pool);
    assert.ok(["Rare", "SuperRare", "SecretRare"].includes(pack[11]!.pool), pack[11]!.pool);
    assert.equal(new Set(pack.map((c) => c.id)).size, pack.length, "no duplicates in one pack");
  }
});

test("the simulator's per-pack rates are the Box EV calculator's", () => {
  const pools = fullSet();
  const counts = new Map(Object.entries(pools).map(([k, v]) => [k as PoolKey, v!.length]));
  assert.deepEqual(simRates(pools, PACKS_PER_BOX), derivedRates({ counts, packs: PACKS_PER_BOX }));
});

test("over many packs, hits land near the community-estimate rates", () => {
  const pools = fullSet();
  const rng = seededRng(42);
  const N = 24 * 2000;
  const seen = new Map<PoolKey, number>();
  for (let i = 0; i < N; i++) for (const c of dealPack(pools, PACKS_PER_BOX, rng)) seen.set(c.pool, (seen.get(c.pool) ?? 0) + 1);
  const rates = simRates(pools, PACKS_PER_BOX);
  for (const k of ["SuperRare", "Leader", "Parallel"] as PoolKey[]) {
    const got = (seen.get(k) ?? 0) / N;
    assert.ok(Math.abs(got - rates[k]) < rates[k] * 0.1, `${k}: ${got} vs ${rates[k]}`);
  }
  assert.equal(seen.get("Treasure") ?? 0, 0, "a pool the set does not have never pays out");
});

test("a set that cannot fill a pack deals nothing", () => {
  const thin: SimPools = simPools([...cards("standard", "C", 3), ...cards("standard", "UC", 3), ...cards("standard", "R", 1)]);
  assert.equal(canDeal(thin), false);
  assert.deepEqual(dealPack(thin, PACKS_PER_BOX, seededRng(1)), []);
});

test("an unpriced card is worth nothing; the best pull is the priciest priced card", () => {
  const pack = [...cards("standard", "C", 2, null), ...cards("standard", "R", 1, 300), ...cards("standard", "SR", 1, 700)];
  assert.equal(packValueUsdCents(pack), 1000);
  assert.equal(bestPull(pack)?.usdCents, 700);
  assert.equal(bestPull(cards("standard", "C", 2, null)), null);
});

test("the set pages are CDN-cached, never ISR or prewarmed, and the hub is ISR like /tools/box-ev", () => {
  const set = read("src/app/tools/pack-sim/[set]/page.tsx");
  assert.match(set, /export const dynamic = "force-dynamic"/);
  assert.doesNotMatch(set, /generateStaticParams|export const revalidate|cookies\(|headers\(|getCountry/);
  assert.match(read("next.config.js"), /"\/tools\/pack-sim\/:set"/);
  assert.match(read("src/app/tools/pack-sim/page.tsx"), /export const revalidate = 86400/);
  for (const f of ["src/app/tools/pack-sim/load.ts", "src/app/tools/pack-sim/view.tsx", "src/components/PackSim.tsx"]) {
    assert.doesNotMatch(read(f), /cookies\(|headers\(|getCountry|@\/lib\/db"/, f);
  }
});

test("the real box link is affiliate-tagged on the server and marked for the buy-click count", () => {
  assert.match(read("src/app/tools/pack-sim/load.ts"), /affiliateUrl\(o\.url, retailer, path\)/);
  const ui = read("src/components/PackSim.tsx");
  assert.match(ui, /rel=\{outboundRel\(\)\}/);
  assert.match(ui, /data-page="pack_sim"/);
});
