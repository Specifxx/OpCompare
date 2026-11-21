import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buyClickProps, forVercel, VERCEL_MAX_PROPS } from "../src/lib/buy-click";

// Vercel drops a custom event with more than 16 properties (2026-11-20, measured on riftcompare.com).
test("a fully loaded buy_click has at most 16 properties, and forVercel never sends more", () => {
  const props = buyClickProps(
    { retailer: "ebay_us", page: "card", card: "op01-024", surface: "board_pinned", href: "https://www.ebay.com/itm/1" },
    "/card/op01-024",
    { country: "US", paid: true, pos: 1, rank: 2, gap_pct: 5 },
  )!;
  const full = { ...props, dock_arm: "a", ad_look: "b", ebay_btn: "b", ebay_pop: "pop" };
  assert.ok(Object.keys(full).length <= VERCEL_MAX_PROPS, `buy_click has ${Object.keys(full).length} properties`);
  const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, i]));
  assert.equal(Object.keys(forVercel(many)).length, 16);
  assert.match(readFileSync("src/components/ConsentGatedAnalytics.tsx", "utf8"), /track\("buy_click", forVercel\(props\)\)/);
});
