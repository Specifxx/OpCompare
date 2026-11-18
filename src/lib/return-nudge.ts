// The return nudge (owner, 2026-11-18: "targeted ads ... very subtle ways we can boost the revenue"), ported from MTG Compare. About 70% of
// buy clicks go to stores that pay nothing. After a click on a STORE row, when the visitor comes back to the tab, a small dismissible card
// offers the eBay and TCGplayer links already on the same page (their own tagged hrefs, copied unchanged). Only after a store click this
// session (never a new visitor's first view), once per session, never Amazon, no prices, yields to the rating card. Half the visitors
// never see it (the control arm, localStorage `rn-arm`). OP Compare sends custom events to GA4 only (lib/analytics.ts): `nudge_eligible`
// fires for both arms, and `nudge_paid_click` {arm} for any eBay or TCGplayer click after an eligible return, so the lift is paid clicks per
// eligible return, on against off. Pure helpers; the component is components/ReturnNudge.tsx.
import { networkOf } from "./buy-click";

export const NUDGE_WINDOW_MS = 30 * 60 * 1000;
export const NUDGE_MIN_AWAY_MS = 4000;
export const NUDGE_ARM_KEY = "rn-arm";
export const NUDGE_STATE_KEY = "rn-state";

/** A link as the page marks it: its `data-retailer` ("store:<key>", "tcgplayer", "ebay_search", "amazon" ...) and its href. */
export interface LinkInfo {
  href: string;
  retailer: string | null;
}

const retailerOf = (l: LinkInfo): string => (l.retailer ?? "").trim().toLowerCase();

/** A store link: a retailer-marked link to a shop, not eBay, TCGplayer or Amazon. */
export function isStoreLink(l: LinkInfo): boolean {
  const r = retailerOf(l);
  return !!r && !r.startsWith("amazon") && networkOf(r) === "store";
}

/** The first eBay and TCGplayer links among `links` (never Amazon). TCGplayer links go through /out/tcgplayer here; the href is copied as is. */
export function pickPaidLinks(links: LinkInfo[]): { ebay?: string; tcg?: string } {
  const out: { ebay?: string; tcg?: string } = {};
  for (const l of links) {
    if (!l.href) continue;
    const n = networkOf(retailerOf(l));
    if (n === "ebay") out.ebay ??= l.href;
    else if (n === "tcgplayer") out.tcg ??= l.href;
  }
  return out;
}

export const pickArm = (rand: number): "on" | "off" => (rand < 0.5 ? "on" : "off");

export interface NudgeState {
  arm: "on" | "off";
  clickedAt: number;
  now: number;
  awayMs: number;
  shownBefore: boolean;
  blocked: boolean;
  hasLinks: boolean;
}

export function nudgeEligible(s: NudgeState): boolean {
  return s.clickedAt > 0 && s.now - s.clickedAt <= NUDGE_WINDOW_MS && s.awayMs >= NUDGE_MIN_AWAY_MS && !s.shownBefore;
}

/** Eligible, in the "on" arm, with something to offer and nothing in the way. */
export function nudgeShows(s: NudgeState): boolean {
  return nudgeEligible(s) && s.arm === "on" && s.hasLinks && !s.blocked;
}
