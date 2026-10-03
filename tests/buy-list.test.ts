// The Buy List Planner (src/lib/buy-list.ts): store baskets from real stores
// only. eBay rows are many sellers behind one `source`, never one basket.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isBasketSource, planBuyList, type PlanItem } from "../src/lib/buy-list";

const offer = (source: string, priceCents: number) => ({ source, priceCents, url: `https://x/${source}`, inStock: true });

test("the cheapest store wins each item; the single-store list is best-covered first", () => {
  const items: PlanItem[] = [
    { slug: "a", name: "A", offers: [offer("store:one", 500), offer("store:two", 600)] },
    { slug: "b", name: "B", offers: [offer("store:two", 300)] },
    { slug: "c", name: "C", offers: [] },
  ];
  const plan = planBuyList(items);
  assert.equal(plan.splitTotalCents, 800);
  assert.deepEqual(plan.unavailable, ["C"]);
  assert.equal(plan.single[0].source, "store:two");
});

test("eBay rows never become a basket (filtered where the route maps offers)", () => {
  assert.equal(isBasketSource("ebay"), false);
  assert.equal(isBasketSource("ebay_us"), false);
  assert.equal(isBasketSource("store:cherry"), true);
  assert.equal(isBasketSource("tcgplayer"), true);
  const items: PlanItem[] = [
    { slug: "a", name: "A", offers: [offer("ebay", 100), offer("store:one", 500)] },
    { slug: "b", name: "B", offers: [offer("ebay", 100), offer("store:one", 400)] },
  ].map((i) => ({ ...i, offers: i.offers.filter((o) => isBasketSource(o.source)) }));
  const plan = planBuyList(items);
  assert.deepEqual(plan.split.map((b) => b.source), ["store:one"]);
  assert.ok(!plan.single.some((s) => s.source.startsWith("ebay")));
  const route = fs.readFileSync(path.resolve(__dirname, "../src/app/api/buy-list/route.ts"), "utf8");
  assert.match(route, /isBasketSource\(o\.source\)/);
});
