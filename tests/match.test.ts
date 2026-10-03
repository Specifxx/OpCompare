import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bestVariant,
  buildCardIndex,
  buildNameIndex,
  cardNumbersIn,
  conditionRank,
  matchByName,
  matchCardTitle,
  matchSealedTitle,
  plausibleSinglePrice,
  setCodesIn,
  type SealedRef,
} from "../src/lib/match";

// A slice of the real catalogue: OP01-120 Shanks's three printings, a release-
// event reprint, a Premium Booster alt art and promo prints that share a number.
const idx = buildCardIndex([
  { id: 1, name: "Shanks", number: "OP01-120", variant: null, setCode: "OP01", setName: "Romance Dawn" },
  { id: 2, name: "Shanks", number: "OP01-120", variant: "Parallel", setCode: "OP01", setName: "Romance Dawn" },
  { id: 3, name: "Shanks", number: "OP01-120", variant: "Parallel · Manga · Alternate Art", setCode: "OP01", setName: "Romance Dawn" },
  { id: 4, name: "Shanks", number: "OP01-120", variant: "Alternate Art", setCode: "PRB-01", setName: "Premium Booster -The Best-" },
  { id: 10, name: "Curiel", number: "OP16-004", variant: null, setCode: "OP16", setName: "The Time of Battle" },
  { id: 11, name: "Curiel", number: "OP16-004", variant: "Release Event", setCode: "OP16 RE", setName: "The Time of Battle Release Event Cards" },
  { id: 20, name: "Franky", number: "OP01-021", variant: null, setCode: "OP01", setName: "Romance Dawn" },
  { id: 21, name: "Franky", number: "OP01-021", variant: "Tournament Pack Vol. 2", setCode: "OP-PR", setName: "One Piece Promotion Cards" },
  { id: 22, name: "Franky", number: "OP01-021", variant: "Tournament Pack Vol. 2 · Winner", setCode: "OP-PR", setName: "One Piece Promotion Cards" },
  { id: 30, name: "Portgas.D.Ace", number: "OP13-119", variant: "Super Alternate Art", setCode: "OP13", setName: "Carrying On His Will" },
  { id: 31, name: "Portgas.D.Ace", number: "OP13-119", variant: "Red Super Alternate Art", setCode: "OP13", setName: "Carrying On His Will" },
  { id: 40, name: "Luffy", number: "OP01-024", variant: null, setCode: "OP01", setName: "Romance Dawn" },
  { id: 41, name: "Luffy", number: "OP01-024", variant: null, setCode: "OP-DD", setName: "One Piece Demo Deck Cards" },
  { id: 50, name: "Gecko Moria", number: "ST03-004", variant: "SP", setCode: "OP08", setName: "Two Legends" },
]);
const id = (t: string) => {
  const r = matchCardTitle(t, idx);
  return "id" in r ? r.id : r.miss;
};

test("card numbers are normalised", () => {
  assert.deepEqual(cardNumbersIn("Shanks [OP-01-120] SEC"), ["OP01-120"]);
  assert.deepEqual(cardNumbersIn("Uta (p-011)"), ["P-011"]);
  assert.deepEqual(cardNumbersIn("One Piece OP-13 Booster Box"), []);
});

test("the printing words decide which Shanks", () => {
  assert.equal(id("Shanks - OP01-120 - SEC"), 1);
  assert.equal(id("Shanks (Parallel) OP01-120"), 2);
  assert.equal(id("[ALTERNATE ART] Shanks (OP01-120) SEC"), 2);
  assert.equal(id("Shanks (Parallel) (Manga) (Alternate Art) OP01-120"), 3);
  assert.equal(id("Shanks OP01-120 Alternate Art PRB-01 The Best"), 4);
});

test("event prints need their stamp in the title", () => {
  assert.equal(id("Curiel OP16-004 Common"), 10);
  assert.equal(id("Curiel (Release Event) OP16-004"), 11);
});

test("the most specific promo wins when it is unique", () => {
  assert.equal(id("Franky OP01-021"), 20);
  assert.equal(id("Franky - OP01-021 - Tournament Pack Vol. 2"), 21);
  assert.equal(id("Franky - OP01-021 - Tournament Pack Vol. 2 [Winner]"), 22);
});

test("leftover words in a printing token are required", () => {
  assert.equal(id("Portgas.D.Ace OP13-119 Super Alternate Art"), 30);
  assert.equal(id("Portgas.D.Ace OP13-119 Red Super Alternate Art"), 31);
});

test("with no other signal, the number's home set wins", () => {
  assert.equal(id("Luffy OP01-024 Super Rare"), 40);
});

test("Special Card means SP", () => {
  assert.equal(id("One Piece - Two Legends - Gecko Moria (Special Card) - ST03-004"), 50);
});

test("a title naming a stamp, promo or reprint the printing lacks is skipped", () => {
  const ix = buildCardIndex([
    { id: 60, name: "Koala", number: "OP13-081", variant: null, setCode: "OP13", setName: "Carrying On His Will" },
    { id: 61, name: "Silvers Rayleigh", number: "OP14-108", variant: null, setCode: "OP14", setName: "The Azure Sea's Seven" },
    { id: 62, name: "Silvers Rayleigh", number: "OP14-108", variant: "Dash Pack", setCode: "OP14", setName: "The Azure Sea's Seven" },
    { id: 63, name: "Boa Marigold", number: "OP07-052", variant: null, setCode: "OP07", setName: "500 Years in the Future" },
    { id: 64, name: "Baby 5", number: "OP04-032", variant: null, setCode: "OP04", setName: "Kingdoms of Intrigue" },
    { id: 65, name: "Brannew", number: "OP03-089", variant: null, setCode: "OP03", setName: "Pillars of Strength" },
    { id: 66, name: "Vinsmoke Judge", number: "OP11-044", variant: null, setCode: "OP11", setName: "A Fist of Divine Speed" },
    { id: 67, name: "Alvida", number: "OP15-003", variant: null, setCode: "OP15", setName: "Adventure on Kami's Island" },
    { id: 68, name: "Concelot", number: "OP08-024", variant: null, setCode: "OP08", setName: "Two Legends" },
    { id: 69, name: "Concelot", number: "OP08-024", variant: "Pre-Release", setCode: "OP08 PRE", setName: "Two Legends Pre-Release Cards" },
    { id: 70, name: "Adio", number: "P-078", variant: null, setCode: "PRB-02", setName: "Premium Booster -The Best- Vol. 2" },
    { id: 74, name: "Uta", number: "ST08-002", variant: null, setCode: "ST-08", setName: "Starter Deck 8: Monkey.D.Luffy" },
    { id: 71, name: "Sabo", number: "ST13-007", variant: null, setCode: "ST-13", setName: "Ultra Deck: The Three Brothers" },
    { id: 72, name: "Sabo", number: "ST13-007", variant: "Reprint", setCode: "PRB-02", setName: "Premium Booster -The Best- Vol. 2" },
    { id: 73, name: "Sabo", number: "ST13-007", variant: "Pirate Foil", setCode: "PRB-02", setName: "Premium Booster -The Best- Vol. 2" },
  ]);
  const m = (t: string) => {
    const r = matchCardTitle(t, ix);
    return "id" in r ? r.id : r.miss;
  };
  // Real titles whose printing TCGplayer doesn't list: once priced as the plain card.
  assert.equal(m("Koala (3rd Anniversary Stamp) - C - OP13-081"), "no-printing");
  assert.equal(m("Silvers Rayleigh (OP14-108) (V.2) - Unnumbered Promos (Rare) [UP-OP14-108]"), "no-printing");
  assert.equal(m("Boa Marigold [OP07 PRE - OP07-052 - Common] - 500 Years in the Future Pre-Release Cards"), "no-printing");
  assert.equal(m("Baby 5 (OP04-032) (V.2) PRB01 Uncommon Near Mint Englisch"), "no-printing");
  assert.equal(m("Brannew (OP03-089) (V.2) - The Best (Rare) [OP03-089]"), "no-printing");
  // Still matched: the word is the card's own name, its set, its tag or a P- promo.
  assert.equal(m("Vinsmoke Judge [OP11 - OP11-044]"), 66);
  assert.equal(m("Alvida (OP15-003) (V.1) - Adventure on Kami’s Island (Rare) [OP15-003]"), 67);
  assert.equal(m("Concelot [Two Legends Pre-Release Cards] OP08-024"), 69);
  assert.equal(m("Concelot OP08-024"), 68);
  assert.equal(m("Adio (P-078) (Promo)"), 70);
  assert.equal(m("Uta - ST08-002 - Starter Deck 8: Monkey.D.Luffy Promo"), 74);
  assert.equal(m("Uta (ST08-002) - Unnumbered Promos"), "no-printing");
  // A Premium Booster title with no printing words is the booster's reprint.
  assert.equal(m("One Piece - Premium Booster 02 - Sabo (Common) - ST13-007"), 72);
  assert.equal(m("Sabo (ST13-007) [PRB02 Foil]"), 72);
  assert.equal(m("Sabo - ST13-007 (Pirate Foil) [Premium Booster -The Best- Vol. 2]"), 73);
  assert.equal(m("Sabo ST13-007"), 71);
});

test("never matched: foreign, graded, playsets, wrong names, unknown printings", () => {
  assert.equal(id("Shanks OP01-120 (Japanese)"), "foreign");
  assert.equal(id("Shanks (OP01-120) (V.1) - The Best (Non-English) (Secret Rare) [OP01-120]"), "foreign");
  assert.equal(id("PSA 10 Shanks OP01-120 Parallel"), "not-single");
  assert.equal(id("Playset (4) 4x Shanks OP01-120"), "not-single");
  assert.equal(id("Kaido OP01-120"), "name");
  assert.equal(id("Shanks OP01-120 Jolly Roger Foil"), "no-printing");
  assert.equal(id("Shanks OP01-120 / Shanks OP01-121"), "many-numbers");
});

test("the TCGplayer-name path", () => {
  const n = buildNameIndex([
    { id: 7, tcgName: "Arlong (Alternate Art)", setNames: ["A Fist of Divine Speed", "A Fist of Divine Speed"] },
    { id: 8, tcgName: "Monet", setNames: ["Legacy of the Master Release Event Cards", "Legacy of the Master Release Event Cards"] },
    { id: 9, tcgName: "DON!! Card (Alternate Art)", setNames: ["Kingdoms of Intrigue", "Kingdoms of Intrigue"] },
    { id: 10, tcgName: "DON!! Card (Alternate Art)", setNames: ["Kingdoms of Intrigue", "Kingdoms of Intrigue"] },
  ]);
  assert.equal(matchByName("Arlong (Alternate Art) [A Fist of Divine Speed]", n), 7);
  assert.equal(matchByName("Monet - Legacy of the Master Release Event Cards Foil", n), 8);
  assert.equal(matchByName("DON!! Card (Alternate Art) [Kingdoms of Intrigue]", n), null);
  assert.equal(matchByName("Arlong (Alternate Art) [A Fist of Divine Speed] (Japanese)", n), null);
});

const sealed: SealedRef[] = [
  { id: 100, name: "Carrying On His Will Booster Box", kind: "Booster Box", setCode: "OP13", setName: "Carrying On His Will" },
  { id: 101, name: "Carrying On His Will Booster Pack", kind: "Booster Pack", setCode: "OP13", setName: "Carrying On His Will" },
  { id: 102, name: "Romance Dawn - Booster Box (Wave 1 - Blue)", kind: "Booster Box", setCode: "OP01", setName: "Romance Dawn" },
  { id: 103, name: "Romance Dawn - Booster Box (Wave 2 - White)", kind: "Booster Box", setCode: "OP01", setName: "Romance Dawn" },
  { id: 104, name: "Starter Deck 36: YELLOW Eustass\"Captain\"Kid", kind: "Starter Deck", setCode: "ST-36", setName: "Starter Deck 36: YELLOW Eustass\"Captain\"Kid" },
];
const sid = (t: string) => {
  const r = matchSealedTitle(t, sealed);
  return "id" in r ? r.id : r.miss;
};

test("sealed titles", () => {
  assert.deepEqual(setCodesIn("[OP-13] Box"), ["OP13"]);
  assert.equal(sid("One Piece Card Game: Booster Box – Carrying On His Will [OP-13]"), 100);
  assert.equal(sid("One Piece OP13 Display (24 Packs) EN"), 100);
  assert.equal(sid("One Piece Card Game [OP-13] Carrying On His Will Booster Pack"), 101);
  assert.equal(sid("One Piece Romance Dawn Booster Box"), "ambiguous");
  assert.equal(sid("One Piece Romance Dawn Booster Box Wave 2"), 103);
  assert.equal(sid("One Piece Starter Deck ST36 - Eustass Captain Kid"), 104);
  assert.equal(sid("One Piece OP-13 Booster Box (Japanese)"), "foreign");
  assert.equal(sid("Koala (Alternate Art) [Premium Booster -The Best-]"), "no-kind");
  assert.equal(sid("One Piece OP-13 Booster Box - Empty"), "not-sealed");
});

test("conditions and variants", () => {
  assert.equal(conditionRank("Near Mint"), 0);
  assert.equal(conditionRank("Lightly Played"), 1);
  assert.equal(conditionRank("Moderately Played"), 2);
  assert.equal(conditionRank("Heavily Played"), 3);
  assert.equal(conditionRank("Damaged"), 4);
  assert.deepEqual(
    bestVariant([
      { title: "Lightly Played", price: "8.00", available: true },
      { title: "Near Mint", price: "10.00", available: true },
      { title: "Near Mint Japanese", price: "2.00", available: true },
      { title: "Near Mint", price: "9.00", available: false },
    ]),
    { priceCents: 1000, condition: "NM" },
  );
  assert.equal(bestVariant([{ title: "Near Mint", price: "9.00", available: false }]), null);
});

test("prices far from market are treated as mismatches", () => {
  assert.equal(plausibleSinglePrice(1000, 10000), false);
  assert.equal(plausibleSinglePrice(9000, 10000), true);
  assert.equal(plausibleSinglePrice(50000, 1000), false);
  assert.equal(plausibleSinglePrice(25, 10), true);
});
