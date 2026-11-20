import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buyClickProps, clickContext, marketOf, networkOf, pageFromPath, type ClickEl } from "../src/lib/buy-click";

const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("a buy link becomes a small, lower-cased event with the seller kind", () => {
  assert.deepEqual(buyClickProps({ retailer: "store:Cherry", page: "card", card: "Monkey-D-Luffy-OP16-015", surface: "price-board" }, "/card/x"), {
    retailer: "store:cherry", network: "store", page: "card", link_type: "product", card: "monkey-d-luffy-op16-015", surface: "price-board",
  });
  assert.deepEqual(buyClickProps({ retailer: "ebay_search", page: null, card: null, surface: null }, "/price-guide"), { retailer: "ebay_search", network: "ebay", page: "price-guide", link_type: "product" });
  assert.equal(buyClickProps({ retailer: "tcgplayer", page: "deal-finder", card: "", surface: " " }, "/")?.network, "tcgplayer");
});

test("no retailer, no event; the page falls back to the path", () => {
  assert.equal(buyClickProps({ retailer: null, page: "card", card: null, surface: null }, "/card/x"), null);
  assert.equal(buyClickProps({ retailer: "  ", page: "card", card: null, surface: null }, "/card/x"), null);
  assert.equal(pageFromPath("/"), "home");
  assert.equal(pageFromPath("/tools/best-basket"), "tools");
  assert.equal(networkOf("ebay_us"), "ebay");
  assert.equal(networkOf("tcgplayer_banner"), "tcgplayer");
});

test("values are clipped, so a long slug can never exceed Vercel's property limit", () => {
  const p = buyClickProps({ retailer: "store:x", page: "card", card: "a".repeat(400), surface: null }, "/card/x");
  assert.ok(p && p.card && p.card.length <= 160);
});

test("the listener sits inside the consent gate and sends only to Vercel", () => {
  const src = read("src/components/ConsentGatedAnalytics.tsx");
  assert.match(src, /track\("buy_click", forVercel\(props\)\)/);
  assert.match(src, /if \(!analytics\) return null;/);
  assert.doesNotMatch(src, /fetch\(|sendBeacon|\/api\//, "no request to our own server");
  assert.match(src, /startsWith\("\/admin"\)/);
});

// A just-enough DOM: a link inside a row inside a list.
function rows(spec: { cents?: number; paid?: 0 | 1 }[]) {
  const kids: ClickEl[] = [];
  const parent = { children: kids };
  return spec.map((r) => {
    const attrs: Record<string, string> = { "data-price-row": "" };
    if (r.cents != null) attrs["data-cents"] = String(r.cents);
    if (r.paid != null) attrs["data-paid"] = String(r.paid);
    const row: ClickEl = {
      parentElement: parent,
      hasAttribute: (n) => n in attrs,
      getAttribute: (n) => attrs[n] ?? null,
      closest: (sel) => (sel === "[data-price-row]" ? row : null),
    };
    kids.push(row);
    return row;
  });
}

test("the click log: market, paid, row position, item-price rank and the gap to the cheapest", () => {
  const list = rows([{ cents: 5000, paid: 1 }, { cents: 4000, paid: 0 }, { cents: 4000, paid: 0 }, { paid: 0 }, { cents: 4400, paid: 1 }]);
  assert.deepEqual(clickContext(list[0], "/au/card/x", null, "ebay"), { country: "AU", paid: true, pos: 1, rank: 4, gap_pct: 25 });
  assert.deepEqual(clickContext(list[1], "/card/x", "UK", "store"), { country: "UK", paid: false, pos: 2, rank: 1, gap_pct: 0 });
  assert.deepEqual(clickContext(list[3], "/card/x", "gb", "store"), { country: "UK", paid: false, pos: 4 }, "a row with no price has a position only");
  assert.deepEqual(clickContext(list[4], "/card/x", undefined, "store"), { country: "US", paid: true, pos: 5, rank: 3, gap_pct: 10 });
  assert.equal(marketOf("/sealed/x", "AU"), "AU");
  assert.equal(marketOf("/eu/sealed/x", "AU"), "EU", "the path wins over the cookie");
});

test("a link outside a row: paid from its seller kind, and the page's own rank and gap when it carries them", () => {
  const attrs: Record<string, string> = { "data-gap": "7", "data-paid": "1" };
  const a: ClickEl = { parentElement: null, hasAttribute: (n) => n in attrs, getAttribute: (n) => attrs[n] ?? null, closest: () => null };
  assert.deepEqual(clickContext(a, "/card/x", null, "store"), { country: "US", paid: true, gap_pct: 7 });
  const bare: ClickEl = { parentElement: null, hasAttribute: () => false, getAttribute: () => null, closest: () => null };
  assert.equal(clickContext(bare, "/", null, "tcgplayer").paid, true);
  assert.equal(clickContext(bare, "/", null, "store").paid, false);
  assert.equal(clickContext(bare, "/", null, "other", "amazon_au").paid, true);
});

test("buyClickProps adds the log fields only when given a context", () => {
  const p = buyClickProps({ retailer: "ebay", page: "card", card: "x", surface: "board_row" }, "/au/card/x", { country: "AU", paid: true, pos: 1, rank: 2, gap_pct: 3.5 });
  assert.deepEqual(p, { retailer: "ebay", network: "ebay", page: "card", link_type: "product", card: "x", surface: "board_row", country: "AU", paid: true, pos: 1, rank: 2, gap_pct: 3.5 });
});

test("the board and the sealed page: rows carry their item price, the page says when prices were checked, an empty sealed page is noindex", () => {
  const board = read("src/components/PriceBoardView.tsx");
  assert.match(board, /data-price-row=""[^>]*data-cents=\{o\.priceCents > 0 \? o\.priceCents : undefined\}/);
  assert.match(board, /prices checked <Ago at=\{newest\}/);
  assert.match(read("src/app/sealed/[slug]/page.tsx"), /s\.offers\.length === 0 && !s\.presale \? \{ robots: \{ index: false, follow: true \} \}/);
  assert.match(read("src/app/methodology/page.tsx"), /What we do not track/);
});
