import { test } from "node:test";
import assert from "node:assert/strict";
import { numberQuery, searchCards } from "../src/lib/search";
import { parseBrowse } from "../src/lib/browse";
import type { CardLite, SetLite } from "../src/lib/data";

const low = { US: null, AU: null, UK: null, SG: null, CA: null, EU: null };
const stores = { US: 0, AU: 0, UK: 0, SG: 0, CA: 0, EU: 0 };
const mk = (id: number, name: string, number: string, printing = "standard", marketUsd = 100): CardLite => ({
  id, slug: `s${id}`, name, number, setId: 1, rarity: "SR", variant: printing === "standard" ? null : "Parallel", printing, colors: ["Red"], cardType: "Character",
  cost: 1, power: 1000, counter: null, life: null, hasImage: true, marketUsd, low, stores, change7d: null, change30d: null, high90Usd: null,
});
const cards = [mk(1, "Monkey.D.Luffy", "OP01-024"), mk(2, "Monkey.D.Luffy", "OP01-024", "alt", 9000), mk(3, "Roronoa Zoro", "OP01-025"), mk(4, "Nami", "OP01-016")];
const sets = new Map<number, SetLite>([[1, { id: 1, slug: "op01-romance-dawn", code: "OP01", name: "Romance Dawn", kind: "booster", releasedOn: "2022-12-02", cardCount: 4, sealedCount: 0 }]]);

test("card number queries", () => {
  assert.equal(numberQuery("op01 024"), "OP01-024");
  assert.equal(numberQuery("OP01024"), "OP01-024");
  assert.equal(numberQuery("p-011"), "P-011");
  assert.equal(numberQuery("luffy"), null);
  assert.deepEqual(searchCards(cards, sets, "OP01-024").map((c) => c.id), [1, 2]);
});

test("name search: every word must match, dots ignored", () => {
  assert.deepEqual(searchCards(cards, sets, "monkey d luffy").map((c) => c.id).sort(), [1, 2]);
  assert.deepEqual(searchCards(cards, sets, "zoro romance").map((c) => c.id), [3]);
  assert.deepEqual(searchCards(cards, sets, "kaido"), []);
});

test("browse params", () => {
  const q = parseBrowse({ color: ["red", "Blue"], min: "1.50", sort: "nope", per: "100", page: "-3" });
  assert.deepEqual(q.colors, ["Red", "Blue"]);
  assert.equal(q.min, 150);
  assert.equal(q.sort, "value");
  assert.equal(q.per, 100);
  assert.equal(q.page, 1);
});
