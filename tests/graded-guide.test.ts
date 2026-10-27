import test from "node:test";
import assert from "node:assert/strict";
import { gradeKey, gradedGuideRows } from "../src/lib/graded-guide";

const slab = (over: Record<string, unknown>) => ({ market: "US", itemId: "1", priceCents: 10000, shippingCents: null, currency: "USD", url: "https://www.ebay.com/itm/1", title: "t", imageUrl: null, grader: "PSA", grade: "10", ...over });

test("gradeKey names a grade or nothing", () => {
  assert.equal(gradeKey("psa", "10"), "PSA 10");
  assert.equal(gradeKey("BGS", "9.5"), "BGS 9.5");
  assert.equal(gradeKey("", "10"), null);
  assert.equal(gradeKey("CGC", "x"), null);
});

test("the graded guide keeps the market's cheapest slab per grade, priciest top grade first", () => {
  const now = Date.UTC(2026, 9, 27);
  const cards = new Map([
    [1, { id: 1, slug: "luffy", name: "Luffy", number: "OP01-001", variant: null, marketUsd: 500 }],
    [2, { id: 2, slug: "zoro", name: "Zoro", number: "OP01-025", variant: "Alternate Art", marketUsd: 1000 }],
  ]);
  const graded = {
    "1": [slab({ priceCents: 9000 }), slab({ priceCents: 8000 }), slab({ market: "AU", priceCents: 1, currency: "AUD" }), slab({ grade: "9", priceCents: 4000 })],
    "2": [slab({ grader: "BGS", grade: "10", priceCents: 50000 }), slab({ priceCents: 99999, u: now - 100 * 3_600_000 })],
    "3": [slab({})],
  } as never;
  const rows = gradedGuideRows(graded, cards, "US", now);
  assert.deepEqual(rows.map((r) => r.slug), ["zoro", "luffy"]);
  assert.deepEqual(rows[1].prices, { "PSA 10": 8000, "PSA 9": 4000 });
  assert.equal(rows[0].top.grade, "BGS 10", "a stale PSA 10 is dropped");
  assert.equal(gradedGuideRows(graded, cards, "UK", now).length, 0);
});
