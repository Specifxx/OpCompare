// The released-Leader guides (src/lib/blog/posts/leader-guides.tsx, site review OP-1, 2026-11-10).
import test from "node:test";
import assert from "node:assert/strict";
import { LEADER_GUIDE_POSTS, coreCost, poolOf } from "../src/lib/blog/posts/leader-guides";
import { LEADER_GUIDES } from "../src/lib/content/catalogue-guides";
import { POSTS } from "../src/lib/blog";

const card = (number: string, over: Record<string, unknown> = {}) =>
  ({ id: number.length, slug: number.toLowerCase(), name: "X", number, setId: 1, rarity: null, variant: null, printing: "standard", colors: ["Blue"], cardType: "Event", cost: 1, power: null, counter: null, life: null, hasImage: true, marketUsd: 100, low: { US: 120, AU: null, UK: null, CA: null, EU: null, SG: null }, stores: {}, change7d: null, change30d: null, high90Usd: null, ...over }) as never;

test("a pool is exactly what the effect names, one printing per number, and its core cost counts priced cards only", () => {
  const cat = { cards: [card("OP12-059"), card("OP12-059", { printing: "parallel", low: { US: 900 } }), card("OP12-060", { cost: 3, low: { US: 300, AU: 500 } }), card("OP12-061", { cost: 4 }), card("OP12-070", { colors: ["Red"] }), card("OP12-071", { cardType: "Character" })] } as never;
  const text = { types: ["Straw Hat Crew"], kws: [], rows: ["OP12-059", "OP12-060", "OP12-061", "OP12-070", "OP12-071"].map((n) => [n, [0], []]) } as never;
  const sanji = LEADER_GUIDE_POSTS.find((p) => p.slug === "sanji-leader-guide-op12")!;
  assert.ok(sanji);
  const pool = poolOf(cat, text, { label: "", test: (c, types) => c.cardType === "Event" && (c.cost ?? 99) <= 3 && c.colors.includes("Blue") && types.includes("Straw Hat Crew") }, "OP12-041");
  assert.deepEqual(pool.map((c) => c.number), ["OP12-059", "OP12-060"]);
  assert.deepEqual(coreCost(pool, "US"), { priced: 2, one: 420 }, "the standard print's price, not the parallel's");
  assert.deepEqual(coreCost(pool, "AU"), { priced: 1, one: 500 });
  assert.deepEqual(poolOf(cat, undefined, { label: "", test: () => true }, "X"), [], "no type data, no pool (never a guess)");
});

test("each guide is published as a guide and linked from its Leader page", () => {
  for (const p of LEADER_GUIDE_POSTS) {
    assert.equal(p.category, "guide", p.slug);
    assert.ok(POSTS.includes(p), p.slug);
    assert.ok(Object.values(LEADER_GUIDES).some((g) => g.slug === p.slug), `${p.slug}: linked from its Leader page`);
  }
});
