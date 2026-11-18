import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { hotCards, hotName } from "../src/lib/hot100";
import type { CardLite } from "../src/lib/data";

// The weekly Hot 100 (owner, 2026-11-18): real seven-day risers worth US$3 or more, biggest first, never padded.
const card = (id: number, marketUsd: number | null, change7d: number | null) => ({ id, marketUsd, change7d }) as unknown as CardLite;

test("ranks only real risers worth US$3 or more, biggest rise first", () => {
  const rows = hotCards([card(1, 1000, 5), card(2, 1000, 40), card(3, 200, 90), card(4, 1000, -10), card(5, 1000, null), card(6, 5000, 40)]);
  assert.deepEqual(rows.map((c) => c.id), [6, 2, 1]);
  assert.equal(hotName(rows.length), "Hot 3");
});

test("caps at 100", () => {
  assert.equal(hotCards(Array.from({ length: 150 }, (_, i) => card(i, 1000, i + 1))).length, 100);
});

test("the page reads the cached catalogue only", () => {
  const src = fs.readFileSync("src/app/hot-100/page.tsx", "utf8");
  assert.match(src, /getCatalog\(\)/);
  assert.doesNotMatch(src, /@\/lib\/db|fetch\(/);
});
