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

test("never matched: foreign, graded, playsets, wrong names, unknown printings", () => {
  assert.equal(id("Shanks OP01-120 (Japanese)"), "foreign");
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
