// "Last known price" (lib/last-known.ts; owner, 2026-10-18): where a card has no
// price in a market, the newest price its own published history holds for that
// SAME printing and market, drawn muted and dated where the site would say "No
// price yet" / "—". It is display only: never a sort, filter, ranking, alert,
// basket, value, JSON-LD, metadata, share image or sitemap input.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MARKETS, type Country } from "../src/lib/country";
import type { CardLite, OfferRow, SetLite } from "../src/lib/data";
import { usdCentsToCountry } from "../src/lib/fx";
import { addDays, dayNum, type Point } from "../src/lib/history";
import {
  LAST_KNOWN_DAYS,
  decodeLastKnown,
  decodeLastKnownRow,
  lastKnownFor,
  lastKnownIn,
  lastKnownLabel,
  lastKnownTable,
  lastKnownTuple,
  lastKnownTupleOf,
  needsLastKnown,
  type HistoryDay,
  type LastKnown,
} from "../src/lib/last-known";
import { headline, sortPrice } from "../src/lib/price";
import { lastSeen } from "../src/lib/card-price-state";
import { freshFromSnapshot } from "../src/lib/price-snapshot-read";
import { parseBrowse, runBrowse } from "../src/lib/browse";
import { guideStats, sortGuide } from "../src/lib/price-guide-query";
import { quickViewPayload } from "../src/lib/quick-view";
import { stripComments } from "./helpers/route-tree";

(globalThis as unknown as { React: typeof React }).React = React;

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const markets = <T,>(v: T): Record<Country, T> => ({ US: v, AU: v, UK: v, SG: v, CA: v, EU: v });
/** A history day: [marketUsd, lowUS, lowAU, lowUK, lowSG, lowCA, lowEU]. */
const day = (d: string, marketUsd: number | null, lows: (number | null)[] = []): HistoryDay => ({
  day: d,
  marketUsd,
  lowUsd: lows[0] ?? null,
  lows: MARKETS.map((_, i) => lows[i] ?? null),
});

// ── Selection: the newest priced day, same series as the headline ────────────
test("the newest history day with a price in THAT market, as that day's headline (listing first, else TCGplayer's market converted)", () => {
  const h = [
    day("2026-10-04", 900, [850, 1400]),
    day("2026-10-06", null, [800, null]), // US listing only
    day("2026-10-09", null, []), // nothing anywhere
  ];
  assert.deepEqual(lastKnownIn(h, "US"), { cents: 800, day: "2026-10-06", kind: "listing" });
  // Australia had no listing on the 6th: its newest priced day is the 4th, where its own low wins over the reference.
  assert.deepEqual(lastKnownIn(h, "AU"), { cents: 1400, day: "2026-10-04", kind: "listing" });
  // The UK never had a listing: the 4th's TCGplayer market price, converted at the live headline's rate.
  assert.deepEqual(lastKnownIn(h, "UK"), { cents: usdCentsToCountry(900, "UK"), day: "2026-10-04", kind: "reference" });
  assert.deepEqual(lastKnownTuple(h, "UK"), [20261004, 900, 1], "a reference stays in USD in the snapshot, converted where it is shown");
});

test("another market's listing never fills this market; v1 days (US only) count for the US alone", () => {
  const h = [day("2026-10-05", null, [null, 2000, null, null, null, null])];
  assert.equal(lastKnownIn(h, "UK"), null, "an AU listing is not a UK price");
  assert.deepEqual(lastKnownIn(h, "AU"), { cents: 2000, day: "2026-10-05", kind: "listing" });
  const v1: HistoryDay[] = [{ day: "2026-10-03", marketUsd: null, lowUsd: 650 }];
  assert.deepEqual(lastKnownIn(v1, "US"), { cents: 650, day: "2026-10-03", kind: "listing" });
  assert.equal(lastKnownIn(v1, "AU"), null);
});

test("nothing from an empty history, zero prices or bad days; order of the input does not matter", () => {
  assert.equal(lastKnownIn([], "US"), null);
  assert.equal(lastKnownIn([day("2026-10-05", 0, [0])], "US"), null);
  assert.equal(lastKnownIn([{ day: "not a day", marketUsd: 500, lowUsd: 500 }], "US"), null);
  const shuffled = [day("2026-10-10", null, [300]), day("2026-10-02", null, [100]), day("2026-10-07", null, [200])];
  assert.equal(lastKnownIn(shuffled, "US")?.day, "2026-10-10");
});

// ── The snapshot's table: one row per unpriced card, its own series only ─────
const TODAY = 20261018;
const pt = (d: number, marketUsd: number | null, ...lows: (number | null)[]): Point => [d, marketUsd, ...MARKETS.map((_, i) => lows[i] ?? null)];

test("the table fills only markets with no live headline, from each card's OWN series, within the chart's year", () => {
  const series: Record<number, Point[]> = {
    1: [pt(20261010, null, 500, 900)], // printing 1: US and AU lows on the 10th
    2: [pt(20261012, 4000)], // printing 2 (same card number, another printing): TCGplayer market only
    4: [pt(addDays(TODAY, -(LAST_KNOWN_DAYS + 5)), null, 700)], // older than the chart's year
  };
  const cards = [
    { id: 1, marketUsd: null, low: [null, 1200, null, null, null, null] }, // AU has a live listing
    { id: 2, marketUsd: 4100, low: MARKETS.map(() => null) }, // a live reference everywhere
    { id: 3, marketUsd: null, low: MARKETS.map(() => null) }, // no history at all
    { id: 4, marketUsd: null, low: MARKETS.map(() => null) },
  ];
  const table = lastKnownTable(cards, (id) => series[id], TODAY);
  assert.deepEqual(Object.keys(table), ["1"], "card 2 is priced, 3 has no history, 4's only price is over a year old");
  // AU is live (0); US gets its own low; the others had nothing on any day (no reference that day either).
  assert.deepEqual(table["1"], [[20261010, 500], 0, 0, 0, 0, 0]);
  assert.equal(needsLastKnown(cards[1]), false);
  assert.equal(needsLastKnown(cards[0]), true);
  // Printing 2's TCGplayer price never reaches printing 1 (or 3): each id reads its own series.
  assert.equal(JSON.stringify(table).includes("4000"), false);
  const row = decodeLastKnownRow(table["1"]);
  assert.deepEqual(row, { US: { cents: 500, day: "2026-10-10", kind: "listing" } });
  assert.equal(decodeLastKnownRow(undefined), undefined);
  assert.equal(decodeLastKnownRow([0, 0, 0, 0, 0, 0]), undefined);
});

// ── One figure with the card page: its "Last seen" row beats an older history point ──
const ago = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
const row = (o: Partial<OfferRow> & Pick<OfferRow, "source" | "market" | "priceCents">): OfferRow => ({
  currency: { US: "USD", AU: "AUD", UK: "GBP", SG: "SGD", CA: "CAD", EU: "EUR" }[o.market as Country],
  url: `https://s.test/${o.source}`,
  inStock: false,
  condition: null,
  shippingCents: null,
  updatedAt: ago(2),
  ...o,
});
const isoDay = (iso: string) => iso.slice(0, 10);

test("a sold-out store row from yesterday (the card page's 'Last seen') beats an older history point: same figure, its own day", () => {
  const yesterday = ago(24);
  const offers = [
    row({ source: "store:a", market: "US", priceCents: 2950, updatedAt: yesterday }), // the page's "Last seen" in the US
    row({ source: "store:b", market: "US", priceCents: 3100, updatedAt: ago(30) }), // older sold-out row: not the newest
    row({ source: "ebay", market: "AU", priceCents: 4000, updatedAt: yesterday }), // eBay "sold out" means nothing
    row({ source: "store:c", market: "UK", priceCents: 1800, currency: "USD", updatedAt: yesterday }), // not in the UK's currency
  ];
  const history = [pt(addDays(TODAY, -8), null, 5840, 9000, 4400)];
  const seenOf = (_id: number, m: Country) => lastSeen(offers, m);
  const table = lastKnownTable([{ id: 9, marketUsd: null, low: MARKETS.map(() => null) }], () => history, TODAY, seenOf);
  const [us, au, uk] = table["9"];
  assert.deepEqual(us, [dayNum(yesterday), 2950, 2], "the US gets the page's Last seen row, not the history's US$58.40");
  assert.deepEqual(au, [addDays(TODAY, -8), 9000], "no sold-out store row in Australia: the newest history day stands in");
  assert.deepEqual(uk, [addDays(TODAY, -8), 4400], "a row in another currency is not the UK's Last seen");
  const lk = decodeLastKnown(us, "US")!;
  assert.deepEqual(lk, { cents: 2950, day: isoDay(yesterday), kind: "seen" });
  assert.match(lastKnownLabel(lk), /^Last known price · \d{1,2} [A-Z][a-z]{2} \d{4}$/);
  // The card page's own rule, unchanged: lastSeen picks the newest sold-out store row in the market's currency.
  assert.deepEqual(lastSeen(offers, "US"), { priceCents: 2950, at: yesterday, source: "store:a" });
  // A store row still "in stock" but 80 hours old is sold out on the page (freshFromSnapshot), so it counts here too.
  const stale = freshFromSnapshot([row({ source: "store:d", market: "CA", priceCents: 1234, inStock: true, updatedAt: ago(80) })]);
  const caTuple = lastKnownTupleOf(lastSeen(stale, "CA"), [], "CA");
  assert.deepEqual(caTuple === 0 ? null : caTuple.slice(1), [1234, 2]);
  // Without a seen row or history: nothing.
  assert.equal(lastKnownTupleOf(null, [], "US"), 0);
});

test("the builder answers with the card page's own lastSeen, over the rows it writes, after the page's freshFromSnapshot", () => {
  const build = stripComments(read("src/lib/price-snapshot-build.ts"));
  assert.match(build, /import \{ lastSeen \} from "\.\/card-price-state";/);
  assert.match(build, /import \{ freshFromSnapshot \} from "\.\/price-snapshot-read";/);
  assert.match(build, /freshFromSnapshot\(byRange\.get\(rangeOf\(id\)\)\?\.\[id\] \?\? \[\], now\)/);
  assert.match(build, /\(id, m\) => lastSeen\(rowsOf\(id\), m\)/);
  // The card page still answers "Last seen" from lastSeen itself, and only falls back to history without it.
  const page = stripComments(read("src/app/card/[slug]/page.tsx"));
  assert.match(page, /const seen = h\.kind === "none" \? lastSeen\(card\.offers, m\) : null;/);
  // No second copy of the rule: lastSeen is defined once.
  const defs = ["src/lib/card-price-state.ts", "src/lib/last-known.ts", "src/lib/price-snapshot-build.ts", "src/lib/quick-view.ts"].filter((f) => /function lastSeen\b/.test(read(f)));
  assert.deepEqual(defs, ["src/lib/card-price-state.ts"]);
});

// ── Shown only where there is no price ───────────────────────────────────────
const lk = (cents: number, d = "2026-09-12", kind: LastKnown["kind"] = "listing"): LastKnown => ({ cents, day: d, kind });
const card = (over: Partial<CardLite> & Pick<CardLite, "id" | "name">): CardLite => ({
  slug: `card-${over.id}`,
  number: `OP01-${String(over.id).padStart(3, "0")}`,
  setId: 1,
  rarity: "R",
  variant: null,
  printing: "standard",
  colors: ["Red"],
  cardType: "Character",
  cost: 1,
  power: 1000,
  counter: null,
  life: null,
  hasImage: false,
  marketUsd: null,
  low: markets<number | null>(null),
  stores: markets(0),
  change7d: null,
  change30d: null,
  high90Usd: null,
  ...over,
});

test("lastKnownFor: only when the market has no listing AND no TCGplayer market price", () => {
  const withLk = { lastKnown: { US: lk(999), AU: lk(1500) } };
  assert.deepEqual(lastKnownFor(card({ id: 1, name: "a", ...withLk }), "US"), lk(999));
  assert.equal(lastKnownFor(card({ id: 1, name: "a", ...withLk }), "UK"), null, "no entry for that market");
  assert.equal(lastKnownFor(card({ id: 2, name: "b", ...withLk, low: { ...markets<number | null>(null), US: 400 } }), "US"), null, "a live listing wins");
  assert.equal(lastKnownFor(card({ id: 3, name: "c", ...withLk, marketUsd: 300 }), "AU"), null, "a live reference wins");
  assert.equal(lastKnownLabel(lk(1, "2026-09-12")), "Last known price · 12 Sep 2026", "a fixed 3-letter month: server and browser ICU disagree on 'Sept'");
  assert.equal(lastKnownLabel(lk(1, "2026-10-01")), "Last known price · 1 Oct 2026");
});

// ── Never a price for anything that ranks, filters, counts or claims ─────────
test("headline, sortPrice, browse filters and sorts, the price guide's sort and stats all ignore it", () => {
  const ghost = card({ id: 10, name: "Ghost", lastKnown: { US: lk(99_999) } });
  const cheap = card({ id: 11, name: "Cheap", low: { ...markets<number | null>(null), US: 100 } });
  const dear = card({ id: 12, name: "Dear", low: { ...markets<number | null>(null), US: 5000 } });
  assert.deepEqual(headline(ghost, "US"), { kind: "none", cents: null, stores: 0 });
  assert.equal(sortPrice(ghost, "US"), null);
  const sets: SetLite[] = [{ id: 1, slug: "op01", code: "OP01", name: "Romance Dawn", kind: "booster", releasedOn: "2022-12-02", cardCount: 3, sealedCount: 0 }];
  const setById = new Map(sets.map((s) => [s.id, s]));
  const run = (sp: Record<string, string>) => runBrowse([ghost, cheap, dear], sets, setById, parseBrowse(sp), "US").items.map((c) => c.name);
  assert.deepEqual(run({ sort: "price-desc" }), ["Dear", "Cheap", "Ghost"], "an unpriced card sorts last, whatever it last cost");
  assert.deepEqual(run({ sort: "price-asc" }), ["Cheap", "Dear", "Ghost"]);
  assert.deepEqual(run({ min: "40" }), ["Dear"], "a price filter (US$40+) never matches a last known price (US$999.99)");
  assert.deepEqual(run({ priced: "1", sort: "name" }), ["Cheap", "Dear"]);
  assert.deepEqual(sortGuide([ghost, cheap, dear], "price-desc", "US").map((c) => c.name), ["Dear", "Cheap", "Ghost"]);
  const stats = guideStats([ghost, cheap, dear], "US");
  assert.equal(stats.priced, 2);
  assert.equal(stats.medianCents, 2550);
});

// Every file that may name the field. Anything else naming it is a new reader:
// a sort, a ranking, an alert, a JSON-LD block or a share image would start
// treating a last known price as a price. Add a file here only for DISPLAY.
const ALLOWED = new Set([
  "src/lib/last-known.ts", // the rule
  "src/lib/price-snapshot-build.ts", // writes the table (prices.json.gz, additive)
  "src/lib/data.ts", // decodes it into CardLite.lastKnown (the pages' catalogue, never the images')
  "src/lib/quick-view.ts", // the popup's payload
  "src/components/LastKnownPrice.tsx", // the muted, labelled drawing
  "src/components/CardTileClient.tsx", // the card tile
  "src/components/CardTile.tsx", // PriceLine (the card link grids)
  "src/components/QuickView.tsx", // the popup's price line
  "src/components/card/CardMarket.tsx", // the card page's tile island
  "src/app/card/[slug]/page.tsx", // computes each market's tile
  "src/app/price-guide/page.tsx", // the guide's price cell
]);

test("only the display surfaces name the field: no sort, ranking, alert, basket, collection, eBay, JSON-LD, metadata, sitemap or share image reads it", () => {
  const walk = (d: string): string[] =>
    fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
  const files = [...walk("src"), ...walk("scripts")].filter((f) => /\.(ts|tsx)$/.test(f));
  const naming = files.filter((f) => /\blastKnown|LastKnown|last-known\b/.test(read(f)));
  assert.deepEqual(naming.filter((f) => !ALLOWED.has(f)), [], "a new reader of the last known price");
  for (const f of ALLOWED) assert.ok(naming.includes(f), `${f} is listed but no longer names it (trim the list)`);
  // The private-data and public-data readers of the snapshot never see it: the seed, the alerts' rows, the admin.
  for (const f of ["src/lib/pub-seed.ts", "src/lib/public-data.ts", "src/lib/public-db.ts", "src/lib/price-snapshot-read.ts", "src/lib/price.ts", "src/lib/jsonld.ts", "src/lib/card-seo.ts", "src/app/sitemap.ts"]) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), f);
    assert.doesNotMatch(read(f), /lastKnown|LastKnown/, f);
  }
});

test("the card page: never in its JSON-LD, metadata, FAQ or prose; only the tile, where it would say '—'", () => {
  const src = stripComments(read("src/app/card/[slug]/page.tsx"));
  const meta = src.slice(src.indexOf("export async function generateMetadata"), src.indexOf("export default async function CardPage"));
  assert.ok(meta.length > 200);
  assert.doesNotMatch(meta, /lastKnown/i, "titles and descriptions never quote it");
  const ld = src.slice(src.indexOf("<JsonLd"), src.indexOf("<Breadcrumbs"));
  assert.match(ld, /"@type": "AggregateOffer"/);
  assert.doesNotMatch(ld, /lastKnown/i, "the Product JSON-LD's offers are live US offers only");
  for (const fn of ["const faqsIn", "const narrativeIn"]) {
    const at = src.indexOf(fn);
    assert.ok(at > 0, fn);
    assert.doesNotMatch(src.slice(at, at + 2500), /lastKnown/i, `${fn} never reads it`);
  }
  // Exactly one use: the tile, when there is no headline and no sold-out row to show.
  assert.deepEqual(src.match(/lastKnown\w*\(/g), ["lastKnownIn("]);
  assert.match(src, /lastKnown: h\.kind === "none" && !seen \? lastKnownIn\(history, m\) : null,/);
  const island = stripComments(read("src/components/card/CardMarket.tsx"));
  assert.match(island, /const lk = t\.kind === "none" && !t\.seen \? t\.lastKnown : null;/);
  // Never as "Cheapest": the tile's heading changes with it.
  assert.match(island, /No live price · \{co\.place\}/);
});

test("the share images never see it: their catalogue is decoded without it", () => {
  const data = read("src/lib/data.ts");
  assert.match(data, /loadCoreForImages\(\), loadPricesForImages\(\)\]\);\n\s+const value = catalogOf\(core, pr, false\);/);
  assert.match(data, /loadCore\(\), loadPrices\(\)\]\);\n\s+const value = catalogOf\(core, pr, true\);/);
});

test("the snapshot: an additive field of prices.json.gz, from the import's history, carried over by the eBay pass", () => {
  const build = read("src/lib/price-snapshot-build.ts");
  assert.match(build, /write\("prices\.json\.gz", \{ \.\.\.prices, \.\.\.\(lastKnown \? \{ lastKnown \} : \{\}\) \}\)/);
  assert.match(build, /const carried = hasLocalHistory\(\) \? null : await previousLastKnown\(log\);\n\s+await fs\.rm\(outDir/, "the previous table is read before the output is cleared");
  assert.match(build, /snapshotFile<\{ lastKnown\?: LastKnownFile \}>\("prices\.json\.gz"\)/);
  // The loaders' type keeps the field optional (a snapshot written before it still reads).
  assert.match(read("src/lib/data.ts"), /lastKnown\?: LastKnownFile/);
});

// ── How it looks ─────────────────────────────────────────────────────────────
test("drawn muted and labelled in words: never the price accent, a link, a buy button, 'from' or 'cheapest'", async () => {
  const { LastKnownPrice } = await import("../src/components/LastKnownPrice");
  const listing = renderToStaticMarkup(React.createElement(LastKnownPrice, { lk: lk(1234, "2026-09-12"), country: "AU" }));
  assert.match(listing, />A\$12\.34</);
  assert.match(listing, />Last known price · 12 Sep 2026</);
  assert.match(listing, /data-last-known="listing"/);
  assert.match(listing, /text-slate-400/);
  assert.match(listing, /title="No live price right now\. The last price we recorded, on 12 September 2026: the lowest listing we recorded in Australia that day\. Not a current price\."/);
  const ref = renderToStaticMarkup(React.createElement(LastKnownPrice, { lk: lk(990, "2026-10-01", "reference"), country: "UK", noteFirst: true }));
  assert.match(ref, /Last known price · 1 Oct 2026<\/span><span[^>]*>≈ £9\.90</, "a reference keeps its ≈; the note can sit above, as the tiles' labels do");
  const seen = renderToStaticMarkup(React.createElement(LastKnownPrice, { lk: lk(2950, "2026-10-17", "seen"), country: "US" }));
  assert.match(seen, />US\$29\.50</);
  assert.match(seen, /a store&#x27;s listing in the United States, sold out when we last saw it\. Not a current price\./);
  for (const html of [listing, ref, seen]) {
    assert.doesNotMatch(html, /text-accent|<a\b|<button|href=|[Cc]heapest|\bfrom\b/);
  }
  const { PriceLine } = await import("../src/components/CardTile");
  const line = renderToStaticMarkup(React.createElement(PriceLine, { card: card({ id: 1, name: "a", lastKnown: { US: lk(500) } }), country: "US" }));
  assert.match(line, /Last known price · 12 Sep 2026/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(PriceLine, { card: card({ id: 1, name: "a" }), country: "US" })), /Last known/);
  const live = renderToStaticMarkup(React.createElement(PriceLine, { card: card({ id: 1, name: "a", marketUsd: 300, lastKnown: { US: lk(500) } }), country: "US" }));
  assert.doesNotMatch(live, /Last known/, "a live reference is shown instead");
});

// ── The quick view (the popup a tile opens) agrees with the tile ─────────────
test("the quick view carries it only for markets with no open row and no TCGplayer market price", () => {
  const fresh = new Date().toISOString();
  const offer = (market: Country, priceCents: number): OfferRow => ({
    source: "store:a", market, priceCents, currency: { US: "USD", AU: "AUD", UK: "GBP", SG: "SGD", CA: "CAD", EU: "EUR" }[market], url: "https://s.test/a", inStock: true, condition: null, shippingCents: null, updatedAt: fresh,
  });
  const detail = {
    id: 7, slug: "zoro-op01-025", name: "Zoro", tcgName: "Zoro", number: "OP01-025", rarity: "SR", variant: null, printing: "standard", colors: ["Red"],
    cardType: "Character", cost: 3, power: 5000, counter: null, life: null, attribute: null, subtypes: [], effect: null, finish: null, hasImage: false,
    tcgplayerUrl: "https://www.tcgplayer.com/product/7", marketUsd: null as number | null, change7d: null, change30d: null,
    set: { id: 1, slug: "op01", code: "OP01", name: "Romance Dawn", kind: "booster", releasedOn: "2022-12-02", cardCount: 1, sealedCount: 0 },
    offers: [offer("US", 700), { ...offer("AU", 950), inStock: false, updatedAt: new Date(Date.now() - 24 * 3600e3).toISOString() }],
  };
  const history = [{ day: "2026-10-05", marketUsd: 650, lowUsd: 600, lows: [600, 1100, null, null, null, null] }];
  const p = quickViewPayload(detail, "2026-10-18", history);
  assert.equal(p.lastKnown?.US, undefined, "the US has an open row");
  assert.deepEqual(p.lastKnown?.AU, { cents: 950, day: new Date(Date.now() - 24 * 3600e3).toISOString().slice(0, 10), kind: "seen" }, "the card page's Last seen row beats the AU history point (A$11.00)");
  assert.deepEqual(p.lastKnown?.UK, { cents: usdCentsToCountry(650, "UK"), day: "2026-10-05", kind: "reference" });
  assert.equal(quickViewPayload({ ...detail, marketUsd: 640 }, "2026-10-18", history).lastKnown, undefined, "a live TCGplayer price fills every market");
  assert.deepEqual(Object.keys(quickViewPayload(detail, "2026-10-18", []).lastKnown ?? {}), ["AU"], "without history, only the sold-out row's market");
  assert.equal(quickViewPayload({ ...detail, offers: [offer("US", 700)] }, "2026-10-18", []).lastKnown, undefined, "no sold-out row and no history: nothing");
  void dayNum;
});

// ── The chart's summary line: "Now" only where the market has a live price ──
test("the price-history chart says 'Last recorded price', muted and dated, where the market has no live price; 'Now' otherwise", async () => {
  const { LineChartInteractive } = await import("../src/components/LineChartInteractive");
  const { buildChartData } = await import("../src/components/LineChart");
  const data = buildChartData(
    [{ label: "Cheapest US listing", color: "#f00", points: [{ x: "2026-10-06", y: 6200 }, { x: "2026-10-10", y: 5840 }, { x: "2026-10-12", y: null }] }],
    (v) => `US$${(v / 100).toFixed(2)}`,
  )!;
  assert.ok(data);
  const dead = renderToStaticMarkup(React.createElement(LineChartInteractive, { data, live: false })).replace(/<!-- -->/g, "");
  assert.match(dead, /Last recorded price <span class="num font-semibold text-slate-400">US\$58\.40<\/span> · 10 Oct 2026/);
  assert.doesNotMatch(dead, /\bNow\b/);
  assert.doesNotMatch(dead.slice(0, dead.indexOf("Low")), /text-accent/, "never the price accent");
  const liveHtml = renderToStaticMarkup(React.createElement(LineChartInteractive, { data })).replace(/<!-- -->/g, "");
  assert.match(liveHtml, /Now <span class="num font-bold text-accent">US\$58\.40<\/span>/, "unchanged where a live price exists (the default)");
  assert.doesNotMatch(liveHtml, /Last recorded/);
  // Wired per market on the card page (a listing or a TCGplayer price is live), and for the QuickView's US chart.
  const page = stripComments(read("src/app/card/[slug]/page.tsx"));
  assert.match(page, /const liveIn = perMarket\(\(m\) => headlineIn\(m\)\.kind !== "none"\);/);
  assert.match(page, /<MarketHistory history=\{historyTuples\} live=\{liveIn\} \/>/);
  assert.match(read("src/components/card/CardMarket.tsx"), /<LineChartInteractive key=\{country\} data=\{data\} live=\{pickMarket\(live, country\)\} \/>/);
  assert.match(read("src/components/QuickView.tsx"), /live=\{data\.marketUsd != null \|\| data\.markets\.US\.count > 0\}/);
});
