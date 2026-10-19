import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { BrowseFilters } from "../src/components/BrowseFilters";
import { parseBrowse, runBrowse, QUERY_MAX } from "../src/lib/browse";
import { parseGuide, runGuide } from "../src/lib/price-guide-query";
import type { CardLite, SetLite } from "../src/lib/data";

// ─────────────────────────────────────────────────────────────────────────────
// A SEARCH BOX INSIDE THE CARD FILTERS. Owner, 2026-10-19: "In the database,
// when you have the filters, there should be a search bar in the filters as
// well — a filter by just keywords — so you don't need to use the search bar at
// the top of the website."
//
// The box is BrowseFilters' named `q` field, the same words the header search
// writes, ANDed with every other filter. The URL rules it writes through
// (withKeywords, filterCount, the q chip, clearFilters) are pinned in
// tests/filter-chips.test.ts; this file pins the field itself, the pages that
// show it, and that each page's filter honours q.
// ─────────────────────────────────────────────────────────────────────────────

// The components are JSX compiled for Next; under the test runner the classic
// transform wants a global React.
(globalThis as unknown as { React: typeof React }).React = React;

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const codeOnly = (src: string) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*/gm, "");

const SETS: SetLite[] = [
  { id: 1, slug: "op01-romance-dawn", code: "OP01", name: "Romance Dawn", kind: "booster", releasedOn: "2022-12-02", cardCount: 3, sealedCount: 0 },
  { id: 2, slug: "op02-paramount-war", code: "OP02", name: "Paramount War", kind: "booster", releasedOn: "2023-03-10", cardCount: 3, sealedCount: 0 },
];
const setById = new Map(SETS.map((s) => [s.id, s]));
const card = (id: number, name: string, number: string, setId: number, usLow: number | null, over: Partial<CardLite> = {}): CardLite => ({
  id, slug: `c${id}`, name, number, setId, rarity: "R", variant: null, printing: "standard", colors: ["Red"], cardType: "Character", cost: 1, power: 1000, counter: null, life: null, hasImage: true,
  marketUsd: usLow, low: { US: usLow, AU: null, UK: null, SG: null, CA: null, EU: null }, stores: { US: usLow ? 2 : 0, AU: 0, UK: 0, SG: 0, CA: 0, EU: 0 }, change7d: null, change30d: null, high90Usd: null, ...over,
});
const CARDS = [
  card(1, "Roronoa Zoro", "OP01-025", 1, 500),
  card(2, "Roronoa Zoro", "OP01-025", 1, 9000, { printing: "alt", variant: "Parallel" }),
  card(3, "Nami", "OP01-016", 1, 100),
  card(4, "Roronoa Zoro", "OP02-062", 2, 300, { colors: ["Green"] }),
  card(5, "Portgas.D.Ace", "OP02-013", 2, 2000, { colors: ["Red"] }),
  card(6, "Nami", "OP02-036", 2, 50, { colors: ["Blue"] }),
];

// BrowseFilters is a client component: give it the two contexts Next's hooks read.
const router = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, fastRefresh() {} };
function render(query: string, props: { action?: string; hide?: string[] } = {}): string {
  const usp = new URLSearchParams(query);
  const q = parseBrowse(Object.fromEntries(usp));
  return renderToStaticMarkup(
    React.createElement(
      AppRouterContext.Provider,
      { value: router as never },
      React.createElement(SearchParamsContext.Provider, { value: usp as never }, React.createElement(BrowseFilters, { q, sets: SETS, country: "US", ...props })),
    ),
  ).replace(/<!-- -->/g, "");
}
const searchInput = (html: string) => /<input[^>]*type="search"[^>]*>/.exec(html)?.[0] ?? null;

test("the panel opens with a labelled search box holding the URL's words, a real named field", () => {
  const html = render("q=luffy&color=red&sort=name");
  const input = searchInput(html);
  assert.ok(input, "a type=search input in the panel");
  assert.match(input, /name="q"/, "a named field, so the GET form carries it without JavaScript");
  assert.match(input, /value="luffy"/);
  assert.match(input, /enterKeyHint="search"/i);
  assert.match(input, /placeholder="Card name or number…"/, "what q matches: a name or a card number (lib/search.ts)");
  assert.match(input, new RegExp(`maxLength="${QUERY_MAX}"`), "no more than parseBrowse reads");
  assert.match(input, /class="input"/, "the panel's own input style");
  const id = /id="([^"]+)"/.exec(input)?.[1];
  assert.ok(id);
  assert.match(html, new RegExp(`<label for="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>Search</label>`), "an accessible, visible label");
  assert.equal((html.match(/name="q"/g) ?? []).length, 1, "the hidden copy of q is gone: the box replaces it");
  assert.ok(html.indexOf('type="search"') < html.indexOf("Price ("), "at the top of the panel, above the price section");
  assert.match(html, /role="search"/);
  assert.match(html, /Clear \(2\)/, "the words count as a filter (as on /sealed): luffy + red");
});

test("the box is there with no words yet, and empty", () => {
  const input = searchInput(render("color=red"));
  assert.ok(input);
  assert.match(input, /value=""/);
});

test("hide={['q']} drops the box, carries the words as a hidden field and leaves them out of the count", () => {
  const html = render("q=luffy&color=red", { action: "/price-guide", hide: ["q"] });
  assert.equal(searchInput(html), null);
  assert.match(html, /<input type="hidden" name="q" value="luffy"\/>/);
  assert.match(html, /Clear \(1\)/);
  assert.doesNotMatch(render("color=red", { hide: ["q"] }), /name="q"/);
});

test("the pages: /browse and every set page show the box; the price guide's toolbar owns q there", () => {
  const filtersOf = (path: string) => {
    const m = [...codeOnly(read(path)).matchAll(/<BrowseFilters\b[^>]*\/>/g)].map((x) => x[0]);
    assert.equal(m.length, 1, `${path} renders BrowseFilters once`);
    return m[0];
  };
  for (const path of ["src/app/browse/page.tsx", "src/app/sets/[slug]/page.tsx"]) {
    const el = filtersOf(path);
    assert.doesNotMatch(el, /hide=\{[^}]*"q"/, `${path} keeps the search box`);
  }
  const guide = filtersOf("src/app/price-guide/page.tsx");
  assert.match(guide, /hide=\{\["q"\]\}/, "two boxes for one q on one screen would be one too many");
  assert.match(read("src/components/price-guide/PriceGuideToolbar.tsx"), /<input type="search" name="q"/, "the guide's own box, which the panel defers to");
  assert.match(codeOnly(read("src/app/price-guide/page.tsx")), /<PriceGuideToolbar[^>]*q=\{gq\.browse\.q\}/);
});

test("the box writes through the shared URL rules: withKeywords, canonical (page dropped), Enter, blur and a pause", () => {
  const src = codeOnly(read("src/components/BrowseFilters.tsx"));
  assert.match(src, /go\(withKeywords\(sp, words\)\)/);
  assert.match(src, /const qs = canonical\(next\)\.toString\(\);/, "every change goes through canonical(), which drops `page`");
  assert.match(src, /onKeyDown=\{onSearchKey\}/);
  assert.match(src, /onBlur=\{applySearch\}/);
  assert.match(src, /setTimeout\(\(\) => latestApply\.current\(\), 350\)/, "as you type, after /sealed's pause");
  assert.match(src, /filterCount\(sp, \{ search: showSearch \}\)/);
  assert.match(src, /clearFilters\(sp, showSearch \? \[\] : \["q"\]\)/);
});

test("/browse honours q, ANDed with the other filters", () => {
  const ids = (sp: Record<string, string>) => runBrowse(CARDS, SETS, setById, parseBrowse(sp), "US").items.map((c) => c.id).sort((a, b) => a - b);
  assert.deepEqual(ids({ q: "zoro" }), [1, 2, 4]);
  assert.deepEqual(ids({ q: "zoro", color: "green" }), [4]);
  assert.deepEqual(ids({ q: "zoro", printing: "alt" }), [2]);
  assert.deepEqual(ids({ q: "OP01-025" }), [1, 2], "a card number");
  assert.deepEqual(ids({ q: "nami", max: "0.75" }), [6]);
});

test("a set page honours q inside its own set (the page's own query shape)", () => {
  // As src/app/sets/[slug]/page.tsx builds it: the URL's filters, the set fixed.
  const page = codeOnly(read("src/app/sets/[slug]/page.tsx"));
  assert.match(page, /const bq = \{ \.\.\.parseBrowse\(searchParams\), sets: \[set\.slug\] \};/);
  assert.match(page, /runBrowse\(cat\.cards, cat\.sets, cat\.setById, \{ \.\.\.bq, per: bq\.per \}, country\)/);
  const ids = (slug: string, sp: Record<string, string>) =>
    runBrowse(CARDS, SETS, setById, { ...parseBrowse(sp), sets: [slug] }, "US").items.map((c) => c.id).sort((a, b) => a - b);
  assert.deepEqual(ids("op01-romance-dawn", { q: "zoro" }), [1, 2]);
  assert.deepEqual(ids("op02-paramount-war", { q: "zoro" }), [4]);
  assert.deepEqual(ids("op02-paramount-war", { q: "nami", color: "blue" }), [6]);
  assert.deepEqual(ids("op01-romance-dawn", { q: "ace" }), []);
});

test("the price guide honours q (its toolbar's box), with its own sort", () => {
  const r = runGuide(CARDS, SETS, setById, parseGuide({ q: "zoro" }), "US");
  assert.deepEqual(r.items.map((c) => c.id), [2, 1, 4], "dearest first, the guide's default");
  assert.deepEqual(runGuide(CARDS, SETS, setById, parseGuide({ q: "zoro", set: "op02-paramount-war" }), "US").items.map((c) => c.id), [4]);
});
