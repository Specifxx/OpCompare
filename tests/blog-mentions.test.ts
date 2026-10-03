import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h, Fragment } from "react";
import { collectMentions } from "../src/components/blog/mentions";

const card = (id: number, slug: string) => ({ id, slug, name: slug, setId: 1, marketUsd: 100, low: {} });
function Table(_: { cards: unknown[] }) {
  return null;
}
function CardLink(_: { c: unknown }) {
  return null;
}

test("collects cards from props and links, in order of first mention", () => {
  const tree = [
    h("p", null, "Intro ", h(CardLink, { c: card(1, "luffy") }), " and ", h("a", { href: "/card/zoro" }, "Zoro")),
    h(Fragment, null, h(Table, { cards: [card(2, "nami"), card(1, "luffy")] })),
    h("div", null, h("a", { href: "/sealed/op01-booster-box" }, "box"), h("a", { href: "/sets/op01" }, "set"), h("a", { href: "https://example.com/card/x" }, "x")),
  ];
  const m = collectMentions(tree);
  assert.deepEqual(m.cards, ["luffy", "zoro", "nami"]);
  assert.deepEqual(m.sealed, ["op01-booster-box"]);
});

test("ignores plain text, nulls and lookalike objects", () => {
  assert.deepEqual(collectMentions(null), { cards: [], sealed: [] });
  assert.deepEqual(collectMentions(h("p", { data: { slug: "nope" } }, "text", false, 3)), { cards: [], sealed: [] });
});
