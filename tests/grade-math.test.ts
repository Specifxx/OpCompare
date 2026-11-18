import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeMath, gradeRows } from "../src/lib/grade-math";

test("expected value mixes PSA 10 and PSA 9 at the visitor's odds", () => {
  const r = gradeMath({ raw: 2000, psa10: 10000, psa9: 4000, p10: 0.5, cost: 2500 });
  assert.equal(r.expected, 7000);
  assert.equal(r.breakEven, 5000);
  assert.equal(r.gain, 2500);
  assert.equal(r.verdict, "grade");
});

test("a miss is valued at raw when no PSA 9 is listed (never a guessed price)", () => {
  const r = gradeMath({ raw: 2000, psa10: 6000, psa9: null, p10: 0.25, cost: 2000 });
  assert.equal(r.expected, 3000);
  assert.equal(r.breakEven, 1000);
  assert.equal(r.verdict, "keep-raw");
});

test("no cost typed: shows the break-even, no verdict", () => {
  const r = gradeMath({ raw: 1000, psa10: 5000, psa9: 2000, p10: 0.4, cost: null });
  assert.equal(r.verdict, "need-cost");
  assert.equal(r.gain, null);
});

test("slabs worth less than raw at these odds: never grade", () => {
  assert.equal(gradeMath({ raw: 5000, psa10: 6000, psa9: 3000, p10: 0.2, cost: 0 }).verdict, "never");
});

test("odds are clamped to 0..1", () => {
  assert.equal(gradeMath({ raw: 0, psa10: 100, psa9: 50, p10: 7, cost: null }).expected, 100);
  assert.equal(gradeMath({ raw: 0, psa10: 100, psa9: 50, p10: -1, cost: null }).expected, 50);
});

test("rows: US dollars only, raw price and a PSA 10 required", () => {
  const rows = gradeRows([
    { slug: "a", name: "A", number: "OP01-001", variant: null, marketUsd: 1000, currency: "USD", prices: { "PSA 10": 5000, "PSA 9": 2000 } },
    { slug: "b", name: "B", number: null, variant: null, marketUsd: 1000, currency: "AUD", prices: { "PSA 10": 5000 } },
    { slug: "c", name: "C", number: null, variant: null, marketUsd: null, currency: "USD", prices: { "PSA 10": 5000 } },
    { slug: "d", name: "D", number: null, variant: null, marketUsd: 1000, currency: "USD", prices: { "PSA 9": 2000 } },
  ]);
  assert.deepEqual(rows.map((r) => r.slug), ["a"]);
  assert.equal(rows[0].psa9, 2000);
});
