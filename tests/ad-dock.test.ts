// The phone dock (components/AdDock.tsx, fed by SideAds.tsx; owner 2026-11-06): the side rails' tiles in a bar along the foot of a
// screen too narrow for the rails, with the buy bar's rules. Pinned: when it may show, its tags, and that it yields to every unit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOCK_ARM, dockShows, interleave, type DockState } from "../src/components/AdDock";

const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");

test("the phone dock: narrow screens only, never on the first screen, never beside another unit, the buy bar or a dialog", () => {
  const ok: DockState = { narrow: true, scrolled: 1000, screen: 800, blockers: 0, buybar: false, modal: false, typing: false, dismissed: false };
  assert.ok(dockShows(ok));
  assert.ok(!dockShows({ ...ok, narrow: false }), "wide screens have the rails");
  assert.ok(!dockShows({ ...ok, scrolled: 800 * DOCK_ARM - 1 }), "not on the first screen");
  assert.ok(!dockShows({ ...ok, blockers: 1 }), "another unit or the footer in view");
  assert.ok(!dockShows({ ...ok, buybar: true }), "never on a page with the buy bar");
  assert.ok(!dockShows({ ...ok, modal: true }), "never over a dialog or the menu");
  assert.ok(!dockShows({ ...ok, typing: true }), "never over the keyboard");
  assert.ok(!dockShows({ ...ok, dismissed: true }));
  assert.deepEqual(interleave([{ items: ["e1", "e2", "e3"] }, { items: ["t1"] }]), ["e1", "t1", "e2", "e3"], "the sides take turns");
  const d = src("components/AdDock.tsx");
  assert.match(d, /^"use client";/);
  assert.match(d, /return armed \? <>\{children\}<\/> : null;/, "nothing rendered or fetched before the visitor scrolls");
  assert.match(d, /translate-y-full/, "slides on transform only (CLS 0)");
  assert.match(d, /querySelectorAll\(`footer, \[data-dock-yield\], \$\{yieldTo\}`\)/, "hides beside every other unit and the footer");
  assert.match(d, /yieldTo = "\[data-ad\]"/, "every [data-ad] unit by default");
  assert.match(d, /sessionStorage\.setItem\(DISMISS_KEY, "1"\)/, "✕ hides it for the visit");
  assert.match(d, />Ad<\/span>/, "labelled Ad");
  const s = src("components/SideRails.tsx");
  assert.match(s, /railTiles\(tiles, country, "dock"\)/, "its own tags (dock-rail, tcgplayer_dock)");
  assert.match(s, /data-surface="ad_dock"/);
  assert.match(s, /yieldTo="\[data-ad-placement\]"/, "yields to every ad unit");
  assert.match(d, /\[data-adfree\], \.capacitor-native/, "never for Plus/Premium or in the app");
  assert.match(src("components/CardStickyBuyBar.tsx"), /data-buybar=""/, "never on a card page (the buy bar)");
  assert.match(src("app/globals.css"), /html\[data-ad-dock\] \.above-bottombar/, "the feedback button lifts above it");
  assert.doesNotMatch(d + s, /amazon/i, "no Amazon in the dock");
});

test("the phone dock's tiles carry their own tags, never the rails'", async () => {
  const { railTiles } = await import("../src/components/SideRails");
  const t = { id: 1, slug: "x", name: "X", imageUrl: "https://i/x.jpg", marketUsd: 10, listings: { US: { url: "https://www.ebay.com/itm/1", imageUrl: "https://i/1.jpg", priceCents: 999, currency: "USD" } } };
  const { ebay, tcg } = railTiles([t, { ...t, id: 2, slug: "y" }] as never, "US", "dock");
  assert.equal(ebay[0].retailer, "ebay_dock");
  assert.equal(tcg[0].retailer, "tcgplayer_dock");
  assert.equal(railTiles([t] as never, "US").ebay[0].retailer, "ebay_side", "the rails keep theirs");
});
