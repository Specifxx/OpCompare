import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DAILY_MAX_RATIO, DAILY_MIN_RATIO, DAILY_ROUNDS, buildPuzzle, isRight, nextStreak, puzzleFor, puzzleNumber, shareResult, upcomingPuzzles, type DailyCard } from "../src/lib/daily";

const cards: DailyCard[] = Array.from({ length: 300 }, (_, i) => ({ id: 1000 + i, slug: `c${i}`, name: `Card ${i}`, set: "Set", image: "x_200w.jpg", cents: 100 + ((i * 7919) % 5000) }));

test("puzzle numbers start at 1 on the epoch and never move", () => {
  assert.equal(puzzleNumber("2026-11-03"), 1);
  assert.equal(puzzleNumber("2026-11-04"), 2);
  assert.equal(puzzleNumber("2027-11-03"), 366);
});

test("a day's puzzle is ten fair pairs, the same on every build", () => {
  const p = buildPuzzle(cards, "2026-11-10")!;
  assert.equal(p.rounds.length, DAILY_ROUNDS);
  const ids = p.rounds.flat().map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "no card twice");
  for (const [a, b] of p.rounds) {
    const hi = Math.max(a.cents, b.cents), lo = Math.min(a.cents, b.cents);
    assert.ok(hi >= lo * DAILY_MIN_RATIO && hi <= lo * DAILY_MAX_RATIO);
  }
  assert.deepEqual(buildPuzzle([...cards].reverse(), "2026-11-10"), p, "order of the catalogue doesn't matter");
  assert.notDeepEqual(buildPuzzle(cards, "2026-11-11")!.rounds, p.rounds, "a new day is a new puzzle");
});

test("adding one card leaves most of a day's pairs alone", () => {
  const a = buildPuzzle(cards, "2026-11-10")!.rounds.map((r) => r.map((c) => c.id).join("-"));
  const b = buildPuzzle([...cards, { ...cards[0], id: 99999, slug: "new" }], "2026-11-10")!.rounds.map((r) => r.map((c) => c.id).join("-"));
  assert.ok(a.filter((x) => b.includes(x)).length >= 7);
});

test("bulk under a dollar and a thin catalogue make no puzzle", () => {
  assert.equal(buildPuzzle(cards.map((c) => ({ ...c, cents: 50 })), "2026-11-10"), null);
  assert.equal(buildPuzzle(cards.slice(0, 8), "2026-11-10"), null);
});

test("the client finds today's puzzle, else the newest carried", () => {
  const ps = upcomingPuzzles(cards, "2026-11-10");
  assert.equal(puzzleFor(ps, "2026-11-12")!.day, "2026-11-12");
  assert.equal(puzzleFor(ps, "2026-12-30")!.day, ps.at(-1)!.day);
});

test("scoring, streaks and the share text", () => {
  const r: [DailyCard, DailyCard] = [{ ...cards[0], cents: 500 }, { ...cards[1], cents: 100 }];
  assert.equal(isRight(r, 0), true);
  assert.equal(isRight(r, 1), false);
  assert.deepEqual(nextStreak(null, 5), { last: 5, count: 1 });
  assert.deepEqual(nextStreak({ last: 4, count: 3 }, 5), { last: 5, count: 4 });
  assert.deepEqual(nextStreak({ last: 2, count: 3 }, 5), { last: 5, count: 1 });
  assert.deepEqual(nextStreak({ last: 5, count: 4 }, 5), { last: 5, count: 4 });
  const t = shareResult("Gundam", 12, [true, false, true], 4, "https://x/daily?utm_source=share&utm_medium=daily");
  assert.equal(t, "Gundam Price Duel #12 · 2/3\n🟩🟥🟩\n🔥 4 day streak\nhttps://x/daily?utm_source=share&utm_medium=daily");
  assert.doesNotMatch(t, /\$/, "the share text never spoils a price");
});

test("the page is in the sitemap, the tools hub and the menu", () => {
  assert.match(fs.readFileSync("src/app/sitemap.ts", "utf8"), /"\/daily"/);
  assert.match(fs.readFileSync("src/app/tools/page.tsx", "utf8"), /href: "\/daily"/);
  assert.match(fs.readFileSync("src/components/nav-groups.ts", "utf8"), /href: "\/daily"/);
});
