import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JA_ROW_SETS, jaBoxQuery, jaPrintedCode } from "../src/lib/japanese-edition";

test("the Japanese edition test runs on six booster box sets, searches only", () => {
  assert.equal(JA_ROW_SETS.length, 6);
  assert.equal(jaPrintedCode("OP13"), "OP-13");
  assert.equal(jaPrintedCode("PRB-01"), "PRB-01");
  assert.equal(jaBoxQuery("OP09"), "One Piece OP-09 Japanese booster box");
  const row = readFileSync(new URL("../src/components/JapaneseEditionRow.tsx", import.meta.url), "utf8");
  assert.match(row, /A different product/);
  assert.doesNotMatch(row, /cheapest|priceCents/i, "no price, never the cheapest");
});
