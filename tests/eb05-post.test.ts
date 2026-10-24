// The "where to buy EB05" post (src/lib/blog/posts/where-to-buy-eb05.tsx): every
// price it prints comes from the sealed catalogue it is handed, a product nobody
// lists says so instead of showing a number, it links the pages a buyer needs,
// and its title survives the metadata truncation (src/lib/blog/metadata.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CardLite, Catalog, SealedLite, SetLite } from "../src/lib/data";
import type { Country } from "../src/lib/country";
import { POSTS, postBySlug } from "../src/lib/blog";
import { PREORDER_PAGES } from "../src/lib/preorders";

// The posts are JSX compiled for Next; under the test runner the classic
// transform wants a global React.
(globalThis as unknown as { React: typeof React }).React = React;

const SLUG = "where-to-buy-one-piece-eb05";
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const markets = <T,>(v: T): Record<Country, T> => ({ US: v, AU: v, UK: v, SG: v, CA: v, EU: v });

const set = (over: Partial<SetLite> & Pick<SetLite, "id" | "code" | "name">): SetLite => ({
  slug: over.code.toLowerCase(),
  kind: "booster",
  releasedOn: null,
  cardCount: 0,
  sealedCount: 0,
  ...over,
});
const product = (over: Partial<SealedLite> & Pick<SealedLite, "id" | "kind">): SealedLite => ({
  slug: `eb05-${over.kind.toLowerCase().replace(/\W+/g, "-")}`,
  name: `Extra Booster: One Piece Heroines Edition Vol.2 - ${over.kind}`,
  setId: 5,
  packCount: null,
  imageUrl: null,
  releasedOn: null,
  presale: true,
  marketUsd: null,
  low: markets<number | null>(null),
  stores: markets(0),
  change7d: null,
  tcgplayerUrl: "https://www.tcgplayer.com/product/1",
  ...over,
});

function ctx(eb05Release: string | null, sealed: SealedLite[], withSet = true) {
  const sets = [
    ...(withSet ? [set({ id: 5, code: "EB05", name: "Extra Booster: One Piece Heroines Edition Vol. 2", kind: "extra", releasedOn: eb05Release, slug: "eb-05-heroines-vol-2" })] : []),
    set({ id: 3, code: "EB03", name: "Extra Booster: One Piece Heroines Edition", kind: "extra", releasedOn: "2026-02-20", slug: "eb-03-heroines" }),
    set({ id: 18, code: "OP18", name: "The Dominance of God", releasedOn: day(37), slug: "op18-the-dominance-of-god" }),
  ];
  const cards: CardLite[] = [];
  const cat: Catalog = {
    cards,
    sets,
    setById: new Map(sets.map((s) => [s.id, s])),
    setBySlug: new Map(sets.map((s) => [s.slug, s])),
    bySlug: new Map(),
    byId: new Map(),
    pricesAt: new Date().toISOString(),
  };
  return { cat, sealed, stats: { lastImportAt: null, storeOffers: [], ebayLive: false }, index: [], country: "US" as Country };
}

function render(c: ReturnType<typeof ctx>): string {
  const post = postBySlug(SLUG)!;
  const b = post.build(c);
  return renderToStaticMarkup(
    React.createElement(React.Fragment, null, ...b.summary.map((s, i) => React.createElement("li", { key: i }, s)), b.lede, ...b.sections.map((s) => React.createElement("section", { key: s.id }, s.title, s.body))),
  );
}

const SEALED = [
  product({ id: 1, kind: "Booster Box", low: { ...markets<number | null>(null), US: 29999, EU: 28800 }, stores: { ...markets(0), US: 3, EU: 1 } }),
  product({ id: 2, kind: "Booster Pack", low: { ...markets<number | null>(null), US: 1299 }, stores: markets(0) }),
  product({ id: 3, kind: "Sleeved Booster Pack" }),
];

test("registered as a dated blog post (not a guide), newest first, with a title the metadata keeps whole", () => {
  const post = postBySlug(SLUG)!;
  assert.ok(post, "published");
  assert.equal(post.category, "blog");
  assert.equal(post.date, "2026-10-14");
  // Newest first (later posts, such as the 24 October set reveals, sit above it).
  for (let i = 1; i < POSTS.length; i++) assert.ok(POSTS[i - 1].date >= POSTS[i].date, `${POSTS[i - 1].slug} is listed before ${POSTS[i].slug}`);
  const c = ctx(day(16), SEALED);
  const title = post.title(c);
  // articleMetadata: over 60 characters, the text before the colon is the <title>.
  const meta = title.length <= 60 ? title : title.replace(/:.*$/, "").slice(0, 60);
  assert.equal(meta, "Where to Buy One Piece EB05 (Heroines Edition Vol. 2)");
  assert.doesNotMatch(title, /\d+\s+stores?/i, "no store count in the title");
  for (const f of post.faq ?? []) assert.doesNotMatch(f.a, /\]\(\/blog\/|https?:/, f.q);
});

test("every price printed is one the catalogue holds (or Bandai's MSRP); an unlisted product says so", () => {
  const html = render(ctx(day(16), SEALED));
  const allowed = new Set(["US$299.99", "€288.00", "US$12.99", "US$4.99"]);
  const printed = [...html.matchAll(/(?:US\$|A\$|C\$|S\$|£|€)[\d,]+(?:\.\d+)?/g)].map((m) => m[0]);
  assert.ok(printed.length >= 4, "the prices are printed");
  for (const p of printed) assert.ok(allowed.has(p), `${p} is not a catalogue price`);
  assert.match(html, /US\$12\.99 \(eBay only\)/, "an eBay-only low is labelled, never counted as a store");
  assert.match(html, /No store we track has listed the EB05 sleeved booster pack in any market yet\./);
  assert.match(html, /None of the \d+ stores we track in the United Kingdom has listed an EB05 product yet\./);
  assert.match(html, /Cheapest EB05 booster box pre-order in the United States today: US\$299\.99/);
});

test("it links the live board, the set, the release dates, sealed and the OP18 board", () => {
  const html = render(ctx(day(16), SEALED));
  for (const href of [PREORDER_PAGES.EB05, PREORDER_PAGES.OP18, "/release-dates", "/sealed", "/sets/eb-05-heroines-vol-2", "/sealed/eb05-booster-box", "/guides/where-to-buy-one-piece-cards"]) {
    assert.ok(html.includes(`href="${href}"`), href);
  }
  assert.doesNotMatch(html, /href="\/blog\/where-to-buy-one-piece-cards"/, "a guide is linked at /guides/");
});

test("degrades: no sealed product, no set, and after release it stops saying pre-order", () => {
  const empty = render(ctx(day(16), []));
  assert.doesNotMatch(empty, /(?:US\$|€|£)[\d]+\.\d\d \(/, "no invented price cells");
  assert.match(empty, /No EB05 sealed product is in the catalogue yet/);
  const none = render(ctx(day(16), [], false));
  assert.match(none, /EB05 is not in the catalogue yet/);
  const out = render(ctx(day(-1), SEALED));
  assert.match(out, /cheapest listing in each market/);
  assert.doesNotMatch(out, /cheapest pre-order in each market/);
});
