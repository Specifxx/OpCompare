import test from "node:test";
import assert from "node:assert/strict";
import { dearFirst, FEATURE_CARD_MIN_CENTS, FEATURE_SEALED_MIN_CENTS } from "../src/lib/featured-floor";

test("sealed floor is dearer than the card floor", () => {
  assert.ok(FEATURE_SEALED_MIN_CENTS > FEATURE_CARD_MIN_CENTS);
});

test("dearFirst keeps items at or above the floor, in order", () => {
  const xs = [10, 900, 20, 500, 4000];
  assert.deepEqual(dearFirst(xs, (x) => x, 500, 3), [900, 500, 4000]);
});

test("dearFirst falls back to the whole list when too few clear the floor", () => {
  const xs = [10, 900, 20];
  assert.deepEqual(dearFirst(xs, (x) => x, 500, 3), xs);
  assert.deepEqual(dearFirst([null, undefined], (x) => x, 500, 1), [null, undefined]);
});
