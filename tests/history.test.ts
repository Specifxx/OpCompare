// Price history as files on the `data` branch (lib/history.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { addDays, bucketOf, changeOver, chartSeries, dayIso, dayNum, highOver, nextIndex, withPoint, type Point } from "../src/lib/history";

test("buckets and day numbers", () => {
  assert.equal(bucketOf(0), "00");
  assert.equal(bucketOf(255), "ff");
  assert.equal(bucketOf(256 + 17), "11");
  assert.equal(dayNum("2026-10-03"), 20261003);
  assert.equal(dayIso(20261003), "2026-10-03");
  assert.equal(addDays(20261003, -7), 20260926);
  assert.equal(addDays(20260301, -1), 20260228);
  assert.equal(addDays(20261231, 1), 20270101);
});

test("a day's point replaces the same day and old points age out", () => {
  let s: Point[] = withPoint(undefined, [20261001, 100, 90]);
  s = withPoint(s, [20261002, 110, 95]);
  s = withPoint(s, [20261002, 120, 99]); // a second import the same day
  assert.deepEqual(s, [[20261001, 100, 90], [20261002, 120, 99]]);
  assert.deepEqual(withPoint(s, [20291001, 1, 1], 730).map((p) => p[0]), [20291001]);
});

test("7- and 30-day changes use the latest price 7–11 / 30–34 days back", () => {
  const s: Point[] = [[20260920, 200, null], [20260925, 100, null], [20261003, 150, null]];
  assert.equal(changeOver(s, 20261003, 7), 50); // vs 2026-09-25 (8 days back, inside the window)
  assert.equal(changeOver(s, 20261003, 30), null); // nothing 30–34 days back
  assert.equal(changeOver([[20261003, 150, null]], 20261003, 7), null);
  assert.equal(changeOver([[20260926, 300, null], [20261003, 100, null]], 20261003, 7), -66.7);
});

test("90-day high", () => {
  const s: Point[] = [[20260601, 999, null], [20260801, 300, null], [20261003, 200, null]];
  assert.equal(highOver(s, 20261003, 90), 300);
});

test("the index is chained over cards priced on both days", () => {
  const first = nextIndex(null, [], 5000, 10, "2026-10-01");
  assert.equal(first.value, 1000);
  const second = nextIndex(first, [[110, 100], [220, 200]], 5300, 11, "2026-10-02");
  assert.equal(second.value, 1100);
  assert.equal(nextIndex(second, [], 0, 0, "2026-10-03").value, 1100);
});

test("the chart shows the last year", () => {
  const s: Point[] = [[20250101, 1, 1], [20261001, 2, null]];
  assert.deepEqual(chartSeries(s, 20261003, 365), [{ day: "2026-10-01", marketUsd: 2, lowUsd: null }]);
});

test("no request path reads history from Postgres", () => {
  const schema = fs.readFileSync(path.resolve(__dirname, "../prisma/schema.prisma"), "utf8");
  assert.doesNotMatch(schema, /model (PriceDay|IndexDay)\b/);
  const data = fs.readFileSync(path.resolve(__dirname, "../src/lib/data.ts"), "utf8");
  assert.match(data, /raw\.githubusercontent\.com\/Specifxx\/OpCompare/);
});
