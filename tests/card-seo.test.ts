import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCardFaqs, cardMetaDescription, cardTitle, TITLE_MAX } from "../src/lib/card-seo";

const t = (over: Partial<Parameters<typeof cardTitle>[0]> = {}) =>
  cardTitle({ name: "Monkey.D.Luffy", variant: null, number: "OP01-003", setName: "Romance Dawn", setCode: "OP01", printing: "standard", hasPrice: true, ...over });

test("a short card keeps the set name and is within 60", () => {
  const s = t({ name: "Nami", number: "OP01-016" });
  assert.match(s, /Nami OP01-016 Price/);
  assert.ok(s.length <= TITLE_MAX, s);
});

test("the set name is dropped first, the number and printing word never", () => {
  const s = t({ name: "Monkey.D.Luffy", variant: "Manga · Alternate Art", number: "OP05-119", printing: "manga", setName: "Awakening of the New Era", setCode: "OP05" });
  assert.ok(s.length <= TITLE_MAX, `${s} (${s.length})`);
  assert.match(s, /OP05-119/);
  assert.match(s, /Manga/);
  assert.doesNotMatch(s, /Awakening/);
});

test("titles of a Parallel and its standard print differ", () => {
  const a = t({ name: "Marshall.D.Teach", number: "OP09-081", variant: "Parallel", printing: "alt", setName: "Emperors in the New World" });
  const b = t({ name: "Marshall.D.Teach", number: "OP09-081", variant: null, printing: "standard", setName: "Emperors in the New World" });
  assert.notEqual(a, b);
  assert.match(a, /Parallel/);
});

test("when nothing fits the shortest rung ships", () => {
  const s = t({ name: "Charlotte Linlin Mother Carmel Big Mom Pirates Captain", variant: "Manga · Alternate Art", number: "OP03-099", printing: "manga", setName: "Pillars of Strength", setCode: "OP03" });
  assert.match(s, /OP03-099/);
  assert.ok(!s.includes("Alternate Art"));
});

test("an unpriced card advertises the card, not a price", () => {
  assert.doesNotMatch(t({ hasPrice: false }), /Price/);
});

test("the description carries the printing, text and price", () => {
  const d = cardMetaDescription({
    displayName: "Monkey.D.Luffy (Parallel) OP01-003", number: "OP01-003", setName: "Romance Dawn", setCode: "OP01", printing: "alt", rarity: "L", cardType: "Leader",
    colors: ["Red"], textBit: "[Activate: Main] Give 1 rested DON!!.", marketUsd: 12000, lowUsCents: 11000,
  });
  assert.match(d, /Parallel \(alternate-art\) printing/);
  assert.match(d, /US\$120/);
  assert.match(d, /DON!!/);
});

const faqBase = {
  name: "Nami", displayName: "Nami (Parallel) OP01-016", number: "OP01-016", setName: "Romance Dawn", setCode: "OP01", rarity: "R", cardType: "Character", colors: ["Red"],
  printing: "alt", country: "US" as const, lowest: 4500, stores: 3, printingCount: 1, marketUsd: 5000, baseMarketUsd: 300, currencyAnswer: "US$45.00 in the United States and A$80.00 in Australia", preRelease: false,
};

test("FAQ: printing question only for specials, currency question only with an answer, no empty answers", () => {
  const f = buildCardFaqs(faqBase);
  assert.ok(f.some((x) => /worth it/.test(x.q)));
  assert.ok(f.some((x) => /other currencies/.test(x.q)));
  const g = buildCardFaqs({ ...faqBase, printing: "standard", currencyAnswer: null, printingCount: 0 });
  assert.ok(!g.some((x) => /worth it|other currencies|other printings/.test(x.q)));
  assert.ok(g.every((x) => x.a.length > 0));
});

test("FAQ: no claim about a price when there is none, and pre-release is honest", () => {
  const f = buildCardFaqs({ ...faqBase, lowest: null, stores: 0, marketUsd: null, baseMarketUsd: null, preRelease: true });
  assert.match(f[0].a, /not been released/);
  assert.doesNotMatch(f[0].a, /US\$/);
  assert.ok(!f.some((x) => /worth it/.test(x.q)));
});

// ── Unique titles for printings of one card number (2026-10-25 audit) ────────
// The live site had 332 groups (938 pages) sharing a title, almost all promos whose long variant fell
// off the length ladder and left the generic word "Promo". These are real cards of the catalogue.
import { cardTitle as titleOf, PROMO_TITLE_MAX } from "../src/lib/card-seo";
const promo = (variant: string, o: Record<string, unknown> = {}) => ({ name: "Tony Tony.Chopper", variant, number: "ST01-006", setName: "One Piece Promotion Cards", setCode: "OP-PR", printing: "promo", hasPrice: true, ...o });

test("promo printings of one number each keep their variant, so no two share a title", () => {
  const variants = ["Super Pre-Release", "Alternate Art", "3-on-3 Cup · Participant", "3-on-3 Cup · Finalist", "Offline Regional 2024 Vol. 2 · Participant", "Offline Regional 2024 Vol. 2 · Winner"];
  const titles = variants.map((v) => titleOf(promo(v)));
  assert.equal(new Set(titles).size, variants.length, titles.join("\n"));
  for (const t of titles) assert.ok(t.length <= PROMO_TITLE_MAX + 5, `${t.length} ${t}`);
  assert.ok(titles[5].includes("Winner") && titles[4].includes("Participant"), "the end of a long variant, which separates the two, survives");
});

test("a card reprinted in another set (Premium Booster, Revision Pack) names that set in its title", () => {
  const base = { name: "Charlotte Cracker", variant: "Alternate Art", number: "OP03-108", printing: "alt", hasPrice: true };
  const home = titleOf({ ...base, setName: "Pillars of Strength", setCode: "OP03" });
  const prb = titleOf({ ...base, setName: "Premium Booster -The Best-", setCode: "PRB-01" });
  assert.notEqual(home, prb);
  assert.ok(prb.includes("PRB-01"));
  assert.ok(!home.includes("PRB"));
  // ST-04 and ST04 are the same set: no suffix for a card in its own set.
  assert.ok(!titleOf({ name: "Sasaki", variant: null, number: "ST04-006", setName: "Starter Deck 4", setCode: "ST-04", printing: "standard", hasPrice: true }).includes("ST-04"));
});

test("DON!! cards with different variants have different titles", () => {
  const don = (variant: string) => titleOf({ name: "DON!! Card", variant, number: null, setName: "One Piece Promotion Cards", setCode: "OP-PR", printing: "don", hasPrice: true });
  assert.notEqual(don("Special DON!! Card Pack - Color"), don("Special DON!! Card Pack - Black and White"));
});
