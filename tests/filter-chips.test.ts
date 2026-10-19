import { test } from "node:test";
import assert from "node:assert/strict";
import { withArticle, activeChips, canonical, clearFilters, filterCount, priceInput, removeChip, toggle, values, withKeywords } from "../src/lib/filter-chips";

const sp = (s: string) => new URLSearchParams(s);
const labels = { set: (s: string) => ({ "op01-romance-dawn": "Romance Dawn (OP01)" })[s], symbol: "A$", adjective: "Australian" };

test("values merge CSV and repeated keys", () => {
  assert.deepEqual(values(sp("color=red&color=blue,green&color=red"), "color"), ["red", "blue", "green"]);
  assert.deepEqual(values(sp(""), "set"), []);
});

test("canonical: fixed order, CSV, defaults and page dropped, unknown keys kept", () => {
  const c = canonical(sp("page=3&sort=value&per=48&color=red&color=blue&q=luffy&utm_source=x&min="));
  assert.equal(c.toString(), "q=luffy&color=red%2Cblue&utm_source=x");
  assert.equal(canonical(sp("sort=price-asc&per=100")).toString(), "sort=price-asc&per=100");
  // The search words are one value: a comma in them is not a list separator.
  assert.equal(canonical(sp("q=luffy,%20zoro&color=red")).get("q"), "luffy, zoro");
  assert.equal(canonical(sp("q=%20%20&color=red")).toString(), "color=red");
});

test("toggle a value on and off (colours case-insensitively)", () => {
  assert.equal(toggle(sp("color=red"), "color", "blue").get("color"), "red,blue");
  assert.equal(toggle(sp("color=Red,blue"), "color", "red").get("color"), "blue");
  assert.equal(toggle(sp("rarity=SEC"), "rarity", "SEC").has("rarity"), false);
});

test("chips: one per value, labelled, price as a range, the search words first and quoted", () => {
  const chips = activeChips(sp("q=luffy&set=op01-romance-dawn&color=red&rarity=SEC&printing=manga&type=Leader&priced=1&min=5"), labels);
  assert.deepEqual(
    chips.map((c) => c.label),
    ["“luffy”", "Romance Dawn (OP01)", "Red", "Secret Rare (SEC)", "Leader", "Manga", "Has an Australian listing", "From A$5"],
  );
  assert.equal(activeChips(sp("max=20"), labels)[0].label, "Up to A$20");
  assert.equal(activeChips(sp("min=5&max=20"), labels)[0].label, "A$5–A$20");
  assert.deepEqual(activeChips(sp("q=zoro&sort=name"), labels), [{ key: "q", value: "", label: "“zoro”" }]);
  assert.deepEqual(activeChips(sp("q=%20&sort=name"), labels), [], "blank words are no filter");
  assert.equal(activeChips(sp("set=op99-unknown"), labels)[0].label, "OP99-UNKNOWN");
});

test("removing chips and clearing", () => {
  assert.equal(canonical(removeChip(sp("color=red,blue&rarity=SR"), { key: "color", value: "red" })).toString(), "color=blue&rarity=SR");
  assert.equal(removeChip(sp("min=5&max=10&color=red"), { key: "price", value: "" }).toString(), "color=red");
  assert.equal(removeChip(sp("priced=1&color=red"), { key: "priced", value: "" }).toString(), "color=red");
  assert.equal(canonical(removeChip(sp("q=luffy&color=red&page=3"), { key: "q", value: "" })).toString(), "color=red");
  // "Clear" and "Clear all" empty the search words too, as /sealed's Clear does; sort and page size stay.
  assert.equal(clearFilters(sp("q=luffy&color=red&sort=name&per=24&page=2")).toString(), "sort=name&per=24");
  // A panel that does not show the box (the price guide's: its toolbar owns q) keeps them.
  assert.equal(clearFilters(sp("q=luffy&color=red&sort=name&per=24&page=2"), ["q"]).toString(), "q=luffy&sort=name&per=24");
});

test("the panel's search box: trimmed words, every other param kept, the page reset", () => {
  const before = sp("set=op01-romance-dawn&color=red,blue&rarity=SEC&priced=1&min=5&max=20&sort=name&per=24&page=4&utm_source=x");
  assert.equal(
    canonical(withKeywords(before, "  monkey d luffy ")).toString(),
    "q=monkey+d+luffy&set=op01-romance-dawn&color=red%2Cblue&rarity=SEC&priced=1&min=5&max=20&sort=name&per=24&utm_source=x",
  );
  assert.equal(canonical(withKeywords(sp("q=zoro&color=red&page=2"), "OP01-025")).toString(), "q=OP01-025&color=red");
  // Empty (or only spaces) removes q and nothing else.
  assert.equal(canonical(withKeywords(sp("q=zoro&color=red&page=2"), "   ")).toString(), "color=red");
  assert.equal(withKeywords(sp("q=zoro"), "").has("q"), false);
});

test("the panel's Clear count: one per value, one for the price range, one for the words when the box is shown", () => {
  const s = sp("q=luffy&set=op01,op02&color=red&priced=1&min=5&max=20&sort=name&per=24&page=2");
  assert.equal(filterCount(s), 1 + 2 + 1 + 1 + 1);
  assert.equal(filterCount(s, { search: false }), 2 + 1 + 1 + 1);
  assert.equal(filterCount(sp("q=%20&sort=name")), 0);
  assert.equal(filterCount(sp("q=zoro")), 1);
});

test("price boxes", () => {
  assert.equal(priceInput(""), "");
  assert.equal(priceInput(" 5 "), "5");
  assert.equal(priceInput("A$12.499"), "12.5");
  assert.equal(priceInput("abc"), null);
  assert.equal(priceInput("-3"), null);
});

test("market adjectives take the right article", () => {
  assert.deepEqual(["US", "Australian", "UK", "Singapore", "Canadian", "European"].map(withArticle), ["a US", "an Australian", "a UK", "a Singapore", "a Canadian", "a European"]);
});
