import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cardIsThin, movedCardSlug, thinCardIds, upcomingSetIds } from "../src/lib/card-index";
import type { CardLite } from "../src/lib/data";

const c = (id: number, number: string | null, over: Partial<CardLite> = {}): CardLite => ({
  id, slug: `c${id}`, name: "X", number, setId: 1, rarity: "C", variant: null, printing: "standard", colors: [], cardType: "Character", cost: null, power: null, counter: null, life: null, hasImage: true,
  marketUsd: 10, low: { US: null } as never, stores: { US: 0 } as never, change7d: null, change30d: null, high90Usd: null, ...over,
});

test("no price and no stock anywhere is thin", () => {
  assert.equal(cardIsThin(c(1, "OP01-001", { marketUsd: null }), []), true);
  assert.equal(cardIsThin(c(1, "OP01-001", { marketUsd: null, stores: { US: 2 } as never }), []), false);
});

test("a cheap non-standard printing of a shared number is thin; the standard one is not", () => {
  const std = c(1, "OP01-010");
  const promo = c(2, "OP01-010", { printing: "promo", marketUsd: 40 });
  const pricey = c(3, "OP01-010", { printing: "alt", marketUsd: 2500 });
  const thin = thinCardIds([std, promo, pricey]);
  assert.deepEqual([...thin], [2]);
});

test("an only printing, a Leader and a US$1+ variant stay indexable", () => {
  assert.equal(cardIsThin(c(1, "P-050", { printing: "promo", marketUsd: 5 }), [c(1, "P-050")]), false);
  const leader = c(2, "ST01-001", { printing: "reprint", cardType: "Leader", marketUsd: 5 });
  assert.equal(cardIsThin(leader, [leader, c(3, "ST01-001")]), false);
  const foil = c(4, "OP02-002", { printing: "foil", marketUsd: 100 });
  assert.equal(cardIsThin(foil, [foil, c(5, "OP02-002")]), false);
});

test("a moved card URL redirects only to a sure printing", () => {
  const cards = [
    { slug: "roronoa-zoro-op01-025", number: "OP01-025", printing: "standard" },
    { slug: "roronoa-zoro-op01-025-parallel", number: "OP01-025", printing: "alt" },
    { slug: "nami-op01-016", number: "OP01-016", printing: "standard" },
  ];
  assert.equal(movedCardSlug("roronoa-zoro-op01-025-alternate-art", cards), "roronoa-zoro-op01-025");
  assert.equal(movedCardSlug("nami-op01-016-2", cards), "nami-op01-016");
  assert.equal(movedCardSlug("sanji-op01-025", cards), null); // the name does not match: no guess
  assert.equal(movedCardSlug("nothing-here", cards), null);
});

test("the card page and the sitemap both apply the rule; galleries point at their set", () => {
  assert.match(readFileSync("src/app/card/[slug]/page.tsx", "utf8"), /cardIsThin\(/);
  assert.match(readFileSync("src/app/sitemap.ts", "utf8"), /thinCardIds\(/);
  assert.doesNotMatch(readFileSync("src/app/sitemap.ts", "utf8"), /\/gallery`/);
  assert.match(readFileSync("src/app/sets/[slug]/gallery/page.tsx", "utf8"), /canonical: `\/sets\/\$\{s\.slug\}` \}/);
});

test("a revealed card of an unreleased set stays indexable with no price (spoiler season)", () => {
  const spoiler = c(9, "OP18-001", { setId: 18, marketUsd: null });
  const up = upcomingSetIds([{ id: 18, releasedOn: "2026-11-20" }, { id: 1, releasedOn: "2022-12-02" }], "2026-11-02");
  assert.deepEqual([...up], [18]);
  assert.equal(cardIsThin(spoiler, [spoiler], up), false);
  assert.equal(thinCardIds([spoiler], up).size, 0);
  assert.equal(cardIsThin(spoiler, [spoiler], upcomingSetIds([{ id: 18, releasedOn: "2026-11-20" }], "2026-11-21")), true);
});
