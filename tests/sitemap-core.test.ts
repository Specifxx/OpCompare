import { test } from "node:test";
import assert from "node:assert/strict";
import { SITEMAP_TOP_CARDS, sitemapCards, sitemapSealed } from "../src/lib/sitemap-core";

const card = (id: number, marketUsd: number | null, setId = 1) => ({ id, slug: `c${id}`, setId, marketUsd });

test("the sitemap lists the most valuable cards, demand and spoilers, never a thin printing", () => {
  const cards = Array.from({ length: SITEMAP_TOP_CARDS + 50 }, (_, i) => card(i + 1, (i + 1) * 10));
  cards.push(card(9001, null, 2), card(9002, 5)); // a spoiler with no price yet; a cheap card visitors open
  const out = sitemapCards(cards, { thin: new Set([SITEMAP_TOP_CARDS + 50]), upcoming: new Set([2]), demandIds: [9002, 9002] });
  const ids = out.map((c) => c.id);
  assert.equal(ids[0], 9002);
  assert.ok(ids.includes(9001));
  assert.ok(!ids.includes(SITEMAP_TOP_CARDS + 50), "thin is never listed");
  assert.ok(!ids.includes(1), "the cheapest cards are left out");
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(out.length, SITEMAP_TOP_CARDS + 2);
});

test("sealed: two stores in one market or still to release; promo packs never", () => {
  const s = (kind: string, stores: Record<string, number>, presale = false, releasedOn: string | null = null) => ({ kind, stores, presale, releasedOn });
  const list = [s("Booster Box", { US: 2 }), s("Booster Box", { US: 1, AU: 1 }), s("Booster Box", {}, true), s("Booster Box", {}, false, "2026-12-01"), s("Promo Pack", { US: 9 })];
  assert.deepEqual(sitemapSealed(list as never, "2026-11-07").map((x) => list.indexOf(x as never)), [0, 2, 3]);
});
