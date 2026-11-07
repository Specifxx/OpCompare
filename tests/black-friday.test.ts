import { test } from "node:test";
import assert from "node:assert/strict";
import { blackFriday, cyberMonday, inSeason, seasonYear, underMarket } from "../src/lib/black-friday";

test("Black Friday is the day after US Thanksgiving", () => {
  assert.equal(blackFriday(2026), "2026-11-27");
  assert.equal(blackFriday(2025), "2025-11-28");
  assert.equal(cyberMonday(2026), "2026-11-30");
});

test("season window and year roll over a week after Cyber Monday", () => {
  assert.equal(inSeason("2026-11-01"), true);
  assert.equal(inSeason("2026-12-08"), false);
  assert.equal(seasonYear("2026-12-08"), 2027);
});

test("underMarket: 5-60% under TCGplayer, $10+, no pre-orders, biggest first", () => {
  const r = (id: number, m: number | null, low: number | null, presale = false) => ({ id, marketUsd: m, low: { US: low }, presale });
  const out = underMarket([r(1, 10000, 9000), r(2, 10000, 8000), r(3, 10000, 3000), r(4, 900, 500), r(5, 10000, 8000, true), r(6, 10000, 9800), r(7, null, 100)]);
  assert.deepEqual(out.map((x) => [x.id, x.saving]), [[2, 20], [1, 10]]);
});

test("the holiday strip shows Black Friday from 1 November, then Cyber Monday, then nothing", async () => {
  const { saleStrip } = await import("../src/lib/holiday-strip");
  assert.equal(saleStrip("2026-10-31"), null);
  assert.equal(saleStrip("2026-11-07")?.href, "/black-friday");
  assert.equal(saleStrip("2026-11-28")?.href, "/black-friday");
  assert.equal(saleStrip("2026-11-29")?.href, "/cyber-monday");
  assert.equal(saleStrip("2026-12-01")?.href, "/cyber-monday");
  assert.equal(saleStrip("2026-12-02"), null);
});
