// The return nudge (lib/return-nudge.ts, components/ReturnNudge.tsx; owner 2026-11-18).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isStoreLink, nudgeEligible, nudgeShows, pickArm, pickPaidLinks, NUDGE_MIN_AWAY_MS, NUDGE_WINDOW_MS, type NudgeState } from "../src/lib/return-nudge";

const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const ok: NudgeState = { arm: "on", clickedAt: 1000, now: 60_000, awayMs: 10_000, shownBefore: false, blocked: false, hasLinks: true };

test("it shows only after a store click, a real absence, once, in the on arm, with links and nothing in the way", () => {
  assert.ok(nudgeShows(ok));
  assert.ok(!nudgeShows({ ...ok, clickedAt: 0 }));
  assert.ok(!nudgeShows({ ...ok, awayMs: NUDGE_MIN_AWAY_MS - 1 }));
  assert.ok(!nudgeShows({ ...ok, now: 1000 + NUDGE_WINDOW_MS + 1 }));
  assert.ok(!nudgeShows({ ...ok, shownBefore: true }));
  assert.ok(!nudgeShows({ ...ok, arm: "off" }));
  assert.ok(nudgeEligible({ ...ok, arm: "off" }), "the control arm is counted as eligible");
  assert.ok(!nudgeShows({ ...ok, blocked: true }));
  assert.ok(!nudgeShows({ ...ok, hasLinks: false }));
  assert.equal(pickArm(0.49), "on");
  assert.equal(pickArm(0.5), "off");
});

test("a store link is a retailer-marked shop link; only eBay and TCGplayer are offered, never Amazon", () => {
  assert.ok(isStoreLink({ href: "https://shop.example/x", retailer: "store:pokebox" }));
  assert.ok(!isStoreLink({ href: "https://x/out/tcgplayer?u=1", retailer: "tcgplayer" }));
  assert.ok(!isStoreLink({ href: "https://www.ebay.com/itm/1", retailer: "ebay_search" }));
  assert.ok(!isStoreLink({ href: "https://www.amazon.com/s?k=1", retailer: "amazon" }));
  assert.ok(!isStoreLink({ href: "https://shop.example/x", retailer: null }));
  const links = [
    { href: "https://www.amazon.com/s?k=a", retailer: "amazon" },
    { href: "https://www.ebay.com/sch/i.html?_nkw=a&customid=1", retailer: "ebay_search" },
    { href: "https://opcompare.app/out/tcgplayer?u=x", retailer: "tcgplayer" },
  ];
  assert.deepEqual(pickPaidLinks(links), { ebay: links[1].href, tcg: links[2].href });
});

test("unmounted (owner, 2026-11-23: no ad covers content); GA4 only; rating card respected; no Amazon in the card", () => {
  assert.doesNotMatch(src("app/layout.tsx"), /<ReturnNudge \/>/);
  assert.match(src("components/ReturnNudge.tsx"), /\[data-rate-card\]/);
  assert.match(src("components/ReturnNudge.tsx"), /nudge_paid_click/);
  assert.doesNotMatch(src("components/ReturnNudge.tsx"), /@vercel\/analytics/);
  assert.doesNotMatch(src("components/ReturnNudge.tsx"), /amazon/i);
});
