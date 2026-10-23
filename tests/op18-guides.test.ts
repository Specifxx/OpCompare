// The growth pack's four OP Compare guides (16 October 2026): the green Luffy,
// Karoo and Saint Gunko Leader guides and the keywords explainer
// (src/lib/blog/posts/{op18-green-luffy,op18-karoo,op18-saint-gunko,keywords-explained}.tsx,
// shared facts in op18-shared.tsx). Each builds from fixtures, prints no price the
// catalogue does not hold (Bandai's US$4.99 MSRP aside), leaves no [VERIFY] or
// [live price] placeholder behind, labels pre-release card text as reported, and
// links only routes that exist. The pages that link them back are pinned at the end.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CardLite, Catalog, SealedLite, SetLite } from "../src/lib/data";
import { MARKETS, type Country } from "../src/lib/country";
import { POSTS, postBySlug, postHref } from "../src/lib/blog";
import type { Post } from "../src/lib/blog/types";
import { leaderSlug } from "../src/lib/facets";
import { money } from "../src/lib/format";
import { usdCentsToCountry } from "../src/lib/fx";
import { KEYWORD_BY_SLUG } from "../src/lib/keywords";
import { guidesForCatalogue, guidesForLeader, guidesForSet, setOwnGuides } from "../src/lib/content/catalogue-guides";

(globalThis as unknown as { React: typeof React }).React = React;

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const SLUGS = ["op18-green-luffy-leader-deck-guide", "karoo-leader-guide-op18", "saint-gunko-leader-guide-op18", "one-piece-tcg-keywords-explained"];
const FILES = ["op18-green-luffy", "op18-karoo", "op18-saint-gunko", "keywords-explained", "op18-shared"].map((f) => `src/lib/blog/posts/${f}.tsx`);
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const none = (): Record<Country, number | null> => ({ US: null, AU: null, UK: null, SG: null, CA: null, EU: null });
const zero = (): Record<Country, number> => ({ US: 0, AU: 0, UK: 0, SG: 0, CA: 0, EU: 0 });

const set = (over: Partial<SetLite> & Pick<SetLite, "id" | "code">): SetLite => ({ slug: over.code.toLowerCase(), name: over.code, kind: "booster", releasedOn: "2025-01-01", cardCount: 0, sealedCount: 0, ...over });
let nextId = 1;
const card = (over: Partial<CardLite> & Pick<CardLite, "name" | "number" | "setId">): CardLite => ({
  id: nextId++,
  slug: `${over.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${over.number!.toLowerCase()}`,
  rarity: "C",
  variant: null,
  printing: "standard",
  colors: ["Red"],
  cardType: "Character",
  cost: 2,
  power: 3000,
  counter: 1000,
  life: null,
  hasImage: false,
  marketUsd: null,
  low: none(),
  stores: zero(),
  change7d: null,
  change30d: null,
  high90Usd: null,
  ...over,
});

const SETS = [
  set({ id: 18, code: "OP18", name: "The Dominance of God", slug: "op18-the-dominance-of-god", releasedOn: day(35) }),
  set({ id: 4, code: "OP04", slug: "op04-kingdoms-of-intrigue" }),
  set({ id: 15, code: "OP15-EB04", slug: "op15-adventure-on-kamis-island" }),
  set({ id: 102, code: "EB02", kind: "extra", slug: "eb02-anime-25th-collection" }),
  set({ id: 201, code: "ST-01", kind: "starter", slug: "st01-straw-hat-crew" }),
];
const leader = (name: string, number: string, colors: string[], life: number, over: Partial<CardLite> = {}) =>
  card({ name, number, setId: 18, rarity: "L", colors, cardType: "Leader", cost: null, power: 5000, counter: null, life, ...over });
const CARDS: CardLite[] = [
  leader("Karoo", "OP18-001", ["Blue", "Red"], 4, { low: { ...none(), US: 999 }, stores: { ...zero(), US: 1 } }),
  leader("Franky", "OP18-021", ["Green", "Purple"], 4),
  leader("Monkey.D.Luffy", "OP18-022", ["Green"], 5, { marketUsd: 1049, low: { ...none(), US: 999, AU: 2150 }, stores: { ...zero(), US: 2, AU: 1 } }),
  leader("Ms. All Sunday", "OP18-041", ["Blue"], 5),
  leader("Saint Gunko", "OP18-060", ["Purple", "Black"], 4, { marketUsd: 1199 }),
  leader("Spandam", "OP18-079", ["Black", "Yellow"], 4),
  card({ name: "Gonbe", number: "OP18-025", setId: 18, colors: ["Green"], cost: 1, power: 0, low: { ...none(), US: 399 }, stores: { ...zero(), US: 1 } }),
  card({ name: "Kokoro", number: "OP18-024", setId: 18, colors: ["Green"], cost: 2, power: 0, hasImage: true }),
  card({ name: "Chimney", number: "OP18-028", setId: 18, colors: ["Green"], cost: 2, power: 0 }),
  card({ name: "Nico Robin", number: "OP18-031", setId: 18, rarity: "SR", colors: ["Green"], cost: 4, power: 5000, marketUsd: 2999, low: { ...none(), US: 2999, EU: 2750 }, stores: { ...zero(), US: 1, EU: 1 } }),
  card({ name: "Nico Robin", number: "OP18-031", setId: 18, rarity: "SR", variant: "Manga", printing: "manga", slug: "nico-robin-op18-031-manga", colors: ["Green"], cost: 4, power: 5000 }),
  card({ name: "Saint Shamrock", number: "OP18-119", setId: 18, rarity: "SEC", colors: ["Black"], cost: 8, power: 9000, counter: null, low: { ...none(), US: 9999 }, stores: { ...zero(), US: 1 } }),
  card({ name: "Cerberus", number: "OP18-085", setId: 18, rarity: "UC", colors: ["Black"], cost: 1, power: 0 }),
  card({ name: "Shark Submerge 3", number: "OP18-076", setId: 18, rarity: "UC", colors: ["Purple"], cardType: "Stage", cost: 5, power: null, counter: null }),
  card({ name: "Sea Cat", number: "OP18-003", setId: 18, cost: 5, power: 6000 }),
  card({ name: "Tony Tony.Chopper", number: "OP18-010", setId: 18, rarity: "UC", cost: 4, power: 5000 }),
  card({ name: "Monkey.D.Luffy", number: "OP18-016", setId: 18, cost: 6, power: 7000 }),
  card({ name: "Roronoa Zoro", number: "OP18-017", setId: 18, cost: 4, power: 4000 }),
  card({ name: "Karoo", number: "OP04-004", setId: 4, cost: 1, power: 2000, hasImage: true, marketUsd: 14, low: { ...none(), US: 25, UK: 9 }, stores: { ...zero(), US: 3, UK: 1 } }),
  card({ name: "Kung Fu Jugon", number: "OP04-005", setId: 4, cost: 1, power: 1000, marketUsd: 12 }),
  card({ name: "Karoo", number: "EB02-001", setId: 102, cost: 5, power: 7000, marketUsd: 27, low: { ...none(), AU: 120 }, stores: { ...zero(), AU: 2 } }),
  card({ name: "Pincers", number: "OP15-013", setId: 15, cost: 4, power: 2000 }),
  card({ name: "Karoo", number: "ST01-003", setId: 201, cost: 1, power: 3000 }),
  card({ name: "Big Purple", number: "OP09-070", setId: 4, colors: ["Purple"], cost: 9, power: 10000 }),
];
const SEALED: SealedLite[] = [
  {
    id: 900, slug: "the-dominance-of-god-booster-box", name: "The Dominance of God Booster Box", setId: 18, kind: "Booster Box", packCount: 24, imageUrl: null, releasedOn: null, presale: true,
    marketUsd: 35850, low: { ...none(), US: 28499, UK: 19999, EU: 24990 }, stores: { ...zero(), US: 3, EU: 2 }, change7d: null, tcgplayerUrl: "https://www.tcgplayer.com/product/1",
  },
];

function catalog(cards: CardLite[], sets: SetLite[]): Catalog {
  return { cards, sets, setById: new Map(sets.map((s) => [s.id, s])), setBySlug: new Map(sets.map((s) => [s.slug, s])), bySlug: new Map(cards.map((c) => [c.slug, c])), byId: new Map(cards.map((c) => [c.id, c])), pricesAt: new Date().toISOString() };
}
const ctx = (country: Country, cards = CARDS, sets = SETS, sealed = SEALED) => ({ cat: catalog(cards, sets), sealed, stats: { lastImportAt: null, storeOffers: [], ebayLive: false }, index: [], country });
const post = (slug: string): Post => postBySlug(slug)!;

function render(p: Post, c: ReturnType<typeof ctx>): string {
  const b = p.build(c);
  return renderToStaticMarkup(
    React.createElement(React.Fragment, null, ...b.summary.map((s, i) => React.createElement("li", { key: i }, s)), b.lede, ...b.sections.map((s) => React.createElement("section", { key: s.id }, s.title, s.body))),
  );
}

/** Every figure the fixtures can print in a market: a listing, TCGplayer's market (US$), its converted reference; plus Bandai's MSRP. */
function allowedPrices(country: Country, cards = CARDS, sealed = SEALED): Set<string> {
  const out = new Set(["US$4.99"]);
  for (const x of [...cards, ...sealed]) {
    if (x.low[country] != null) out.add(money(x.low[country], country));
    if (x.marketUsd != null) {
      out.add(money(x.marketUsd, "US"));
      out.add(money(usdCentsToCountry(x.marketUsd, country), country));
    }
  }
  return out;
}
const PRICE = /(?:US\$|A\$|C\$|S\$|£|€)[\d,]+(?:\.\d+)?/g;

/** Does an internal href land on a real route of this site, for the fixtures' catalogue? */
function resolves(href: string, cat: Catalog): boolean {
  const p = href.split(/[?#]/)[0];
  const posts = new Set(POSTS.map((x) => postHref(x)));
  if (/^\/(blog|guides)\/[^/]+$/.test(p)) return posts.has(p);
  let m = /^\/leaders\/([^/]+)$/.exec(p);
  if (m) return cat.cards.some((c) => c.cardType === "Leader" && leaderSlug(c.name, c.number) === m![1]);
  m = /^\/card\/([^/]+)$/.exec(p);
  if (m) return cat.bySlug.has(m[1]);
  m = /^\/sets\/([^/]+)$/.exec(p);
  if (m) return cat.setBySlug.has(m[1]);
  m = /^\/keywords\/([^/]+)$/.exec(p);
  if (m) return KEYWORD_BY_SLUG.has(m[1]);
  return fs.existsSync(path.join(ROOT, "src/app", p, "page.tsx"));
}

test("the four are published as guides at /guides/<slug>, dated 16 October 2026, newest first, titles kept whole", () => {
  // Newest first: posts dated after 16 October 2026 come ahead of the four, which sit together.
  const four = POSTS.filter((p) => p.date <= "2026-10-16");
  assert.deepEqual(four.slice(0, 4).map((p) => p.slug).sort(), [...SLUGS].sort());
  assert.ok(POSTS.slice(0, POSTS.length - four.length).every((p) => p.date > "2026-10-16"));
  for (const slug of SLUGS) {
    const p = post(slug);
    assert.equal(p.category, "guide", slug);
    assert.equal(p.date, "2026-10-16", slug);
    assert.equal(postHref(p), `/guides/${slug}`);
    const title = p.title(ctx("US"));
    assert.ok(title.length <= 60, `${slug}: "${title}" would be cut by articleMetadata`);
    assert.ok(p.description.length >= 100 && p.description.length <= 160, `${slug}: description length ${p.description.length}`);
    assert.ok((p.faq?.length ?? 0) >= 4, `${slug}: FAQ`);
  }
  assert.match(post(SLUGS[0]).title(ctx("US")), /Green Luffy/);
  assert.match(post(SLUGS[1]).description, /Carue/, "the Carue spelling is targeted");
  assert.match(post(SLUGS[3]).title(ctx("US")), /^What Is Rush in One Piece TCG\?/);
});

test("no placeholder survives: no [VERIFY], no [live price], no guessed slug, in the sources or the rendered posts", () => {
  for (const f of FILES) {
    const src = read(f);
    assert.doesNotMatch(src, /\[VERIFY|VERIFY-slug|\[live price|TODO|TBC/i, f);
    assert.doesNotMatch(src, /\/blog\/(karoo-leader-guide-op18|saint-gunko-leader-guide-op18|op18-green-luffy-leader-deck-guide|one-piece-tcg-keywords-explained|one-piece-rarities-explained|op17-chase-cards|one-piece-cheaper-abroad)\b/, `${f}: a guessed pack URL`);
  }
  for (const slug of SLUGS) {
    for (const country of ["US", "UK"] as Country[]) {
      const html = render(post(slug), ctx(country));
      assert.doesNotMatch(html, /VERIFY|live price from site|\[slug\]/i, `${slug} ${country}`);
    }
    for (const f of post(slug).faq ?? []) assert.doesNotMatch(f.a, /VERIFY|live price/i, f.q);
  }
});

test("every price printed is one the catalogue holds, or Bandai's US$4.99 MSRP, in every market", () => {
  for (const slug of SLUGS) {
    for (const country of MARKETS) {
      const html = render(post(slug), ctx(country));
      const allowed = allowedPrices(country);
      for (const p of html.match(PRICE) ?? []) assert.ok(allowed.has(p), `${slug} (${country}) prints ${p}, which the catalogue does not hold`);
    }
    for (const f of post(slug).faq ?? []) for (const p of f.a.match(PRICE) ?? []) assert.equal(p, "US$4.99", `${slug} FAQ: ${f.q}`);
  }
  // The live figures do appear where the pack had [live price from site].
  const luffyUs = render(post(SLUGS[0]), ctx("US"));
  assert.match(luffyUs, /cheapest OP18 booster box pre-order we track in the United States today is <strong>US\$284\.99<\/strong>/);
  assert.match(luffyUs, /The cheapest Luffy OP18-022 listing we track in the United States is <strong>US\$9\.99<\/strong>/);
  const karooUk = render(post(SLUGS[1]), ctx("UK"));
  assert.match(karooUk, /£199\.99<\/strong> \(an eBay listing; no tracked store has one yet\)/, "an eBay-only low is labelled, never counted as a store");
  assert.match(karooUk, /No seller we track lists Karoo OP18-001 in the United Kingdom yet/);
  const gunkoAu = render(post(SLUGS[2]), ctx("AU"));
  assert.match(gunkoAu, /No seller we track in Australia has listed an OP18 booster box yet/);
});

test("pre-release card text is labelled reported and dated; Bandai's facts are stated as Bandai's", () => {
  for (const slug of SLUGS.slice(0, 3)) {
    const html = render(post(slug), ctx("US"));
    assert.match(html, /reported pre-release text, as TCGplayer listed it on 16 October 2026/, slug);
    assert.match(html, /Bandai&#x27;s official card list has no OP18 cards\s+yet/, slug);
    assert.match(html, /Reported text \(16 October 2026\)/, slug);
    assert.doesNotMatch(html, /official (card )?text|Bandai&#x27;s text/i, `${slug}: reported text is never called official`);
  }
  const luffy = render(post(SLUGS[0]), ctx("US"));
  assert.match(luffy, /20 November 2026/);
  assert.match(luffy, /21 November 2026/);
  assert.match(luffy, /&ldquo;127\+1 types in total&rdquo;|“127\+1 types in total”/);
  const keywords = render(post(SLUGS[3]), ctx("US"));
  assert.match(keywords, /version 1\.2\.1, last updated 28 August 2026/);
});

test("the keywords guide cites Comprehensive Rules 1.2.1's numbers, and links each keyword's own page", () => {
  const html = render(post(SLUGS[3]), ctx("US"));
  const RULES: [string, string][] = [
    ["rush", "10-1-1"],
    ["rush-character", "10-1-6"],
    ["double-attack", "10-1-2"],
    ["banish", "10-1-3"],
    ["blocker", "10-1-4"],
    ["trigger", "10-1-5"],
    ["unblockable", "10-1-7"],
    ["on-play", "10-2-6"],
    ["when-attacking", "10-2-5"],
    ["activate-main", "10-2-2"],
    ["counter", "10-2-4"],
    ["once-per-turn", "10-2-13"],
    ["don-x", "10-2-9"],
  ];
  for (const [slug, rule] of RULES) {
    assert.ok(KEYWORD_BY_SLUG.has(slug), slug);
    assert.match(html, new RegExp(`href="/keywords/${slug}">\\[[^\\]]+\\]</a></td><td[^>]*>[^<]*</td><td[^>]*>${rule}</td>`), `${slug} is rule ${rule}`);
  }
  assert.match(html, /DON!! −N<\/td><td[^>]*>[^<]*<\/td><td[^>]*>10-2-10<\/td>/);
});

test("every internal link resolves: post bodies, FAQ answers and the related strip", () => {
  for (const slug of SLUGS) {
    const c = ctx("US");
    const html = render(post(slug), c);
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(hrefs.length >= 8, `${slug}: ${hrefs.length} links`);
    for (const f of post(slug).faq ?? []) for (const m of f.a.matchAll(/\]\(([^)]*)\)/g)) hrefs.push(m[1]);
    for (const r of post(slug).related) hrefs.push(r.href);
    for (const h of hrefs) {
      assert.match(h, /^\/(?!\/)/, `${slug}: ${h} is not internal`);
      assert.ok(resolves(h, c.cat), `${slug} links ${h}, which is not a page`);
    }
  }
  // The four link each other where the pack did.
  const luffy = render(post(SLUGS[0]), ctx("US"));
  for (const h of ["/guides/karoo-leader-guide-op18", "/guides/saint-gunko-leader-guide-op18", "/guides/one-piece-tcg-keywords-explained", "/op18-preorders", "/sets/op18-the-dominance-of-god", "/leaders/monkey-d-luffy-op18-022"]) assert.ok(luffy.includes(`href="${h}"`), h);
  const keywords = render(post(SLUGS[3]), ctx("US"));
  for (const h of ["/guides/karoo-leader-guide-op18", "/guides/saint-gunko-leader-guide-op18", "/guides/op18-green-luffy-leader-deck-guide", "/keywords"]) assert.ok(keywords.includes(`href="${h}"`), h);
  assert.ok(render(post(SLUGS[1]), ctx("US")).includes('href="/leaders/karoo-op18-001"'), "the [VERIFY-slug] leader link is the route's own");
  assert.ok(render(post(SLUGS[2]), ctx("US")).includes('href="/leaders/saint-gunko-op18-060"'));
});

test("only cards the catalogue holds are named as cards: no unverified numbers, a missing card simply drops out", () => {
  for (const slug of SLUGS) {
    const html = render(post(slug), ctx("US"));
    const src = FILES.map(read).join("\n");
    for (const gone of ["OP18-084", "OP18-065", "OP18-061", "OP18-078", "OP18-034", "Iceburg", "Mini Merry"]) {
      assert.ok(!html.includes(gone), `${slug} names ${gone}`);
      assert.ok(!src.split("\n").some((l) => l.includes(gone) && !l.trim().startsWith("//")), `${gone} appears outside a comment`);
    }
  }
  const withoutChimney = CARDS.filter((c) => c.number !== "OP18-028");
  const html = render(post(SLUGS[0]), ctx("US", withoutChimney));
  assert.doesNotMatch(html, /href="\/card\/chimney-op18-028"/);
  assert.match(html, /Reported so far, 3 green OP18 cards set the Leader active again: Gonbe, Kokoro and Nico Robin\./);
  assert.match(render(post(SLUGS[0]), ctx("US")), /href="\/card\/nico-robin-op18-031-manga"/, "the Manga printing is named from the catalogue");
  const karoo = render(post(SLUGS[1]), ctx("US"));
  assert.match(karoo, /7 Character card numbers are typed both Animal and Alabasta, every one red/, "the dual-typed pool, counted from the catalogue");
  assert.match(karoo, /which matters for the 2 OP04 Characters above/, "the Block Number caveat names the OP04 cards");
  const gunko = render(post(SLUGS[2]), ctx("US"));
  assert.match(gunko, /only Saint Shamrock has 8000 power or more/);
  assert.match(gunko, /2 purple or black Character card numbers in our catalogue have 8000 printed power or more/);
  assert.match(gunko, /TCGplayer lists 1 printing of the Saint Gunko Leader so far/, "no alternate art is claimed");
});

test("degrades: no OP18 set, no cards, no sealed product: still builds, no figure but the MSRP", () => {
  for (const slug of SLUGS) {
    const html = render(post(slug), ctx("US", [], [], []));
    for (const p of html.match(PRICE) ?? []) assert.equal(p, "US$4.99", `${slug}: ${p}`);
    assert.doesNotMatch(html, /href="\/(card|sets)\//, `${slug}: no link to a card or set that does not exist`);
    assert.equal(post(slug).build(ctx("US", [], [], [])).heroCards.length, 0);
  }
  assert.match(render(post(SLUGS[0]), ctx("US", [], [], [])), /No OP18 booster box is in our catalogue yet/);
  assert.match(render(post(SLUGS[1]), ctx("US", [], [], [])), /Karoo OP18-001 is not in our catalogue yet/);
});

test("hero cards are real catalogue cards with art, the Leader first when it has some; none without art", () => {
  assert.deepEqual(post(SLUGS[0]).build(ctx("US")).heroCards.map((c) => c.number), ["OP18-024"], "only Kokoro has art in the fixtures");
  // An older Karoo printing never stands in for the OP18 Leader.
  assert.deepEqual(post(SLUGS[1]).build(ctx("US")).heroCards, []);
  const arty = CARDS.map((c) => (c.number === "OP18-001" ? { ...c, hasImage: true } : c));
  assert.equal(post(SLUGS[1]).build(ctx("US", arty)).heroCards[0]?.number, "OP18-001");
});

test("linked from the pages a reader of OP18 lands on: the set page, the pre-order board, the Leader pages, the keyword pages", () => {
  const own = setOwnGuides("OP18").map((g) => g.href);
  assert.deepEqual(own, ["/guides/op18-green-luffy-leader-deck-guide", "/guides/karoo-leader-guide-op18", "/guides/saint-gunko-leader-guide-op18"]);
  assert.deepEqual(guidesForSet("OP18").map((g) => g.href), own);
  assert.deepEqual(guidesForSet("OP16"), guidesForCatalogue("sets"), "a set without its own guides keeps the generic list");
  assert.equal(guidesForSet("OP17")[0].href, "/guides/op17-booster-box-price");
  assert.deepEqual(setOwnGuides("EB05"), []);
  assert.equal(guidesForLeader("OP18-001")[0]?.href, "/guides/karoo-leader-guide-op18");
  assert.equal(guidesForLeader("OP18-022")[0]?.href, "/guides/op18-green-luffy-leader-deck-guide");
  assert.equal(guidesForLeader("OP18-060")[0]?.href, "/guides/saint-gunko-leader-guide-op18");
  assert.deepEqual(guidesForLeader("OP01-001"), []);
  assert.deepEqual(guidesForLeader(null), []);
  assert.match(read("src/app/sets/[slug]/page.tsx"), /guidesForSet\(set\.code\)/);
  assert.match(read("src/components/PreorderPage.tsx"), /<RelatedGuides guides=\{setOwnGuides\(SET_CODE\)\}/);
  assert.match(read("src/app/leaders/[slug]/page.tsx"), /<RelatedGuides guides=\{guidesForLeader\(base\.number\)\}/);
  assert.match(read("src/app/keywords/page.tsx"), /href="\/guides\/one-piece-tcg-keywords-explained"/);
  assert.match(read("src/app/keywords/[slug]/page.tsx"), /href="\/guides\/one-piece-tcg-keywords-explained"/);
});
