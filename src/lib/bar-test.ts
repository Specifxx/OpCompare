// The phone buy bar test (Head of Conversion, 2026-11-27; strategy/marketplace-placement-2026-11-24.html). The card page's phone buy
// bar (components/CardStickyBuyBar.tsx) repeats the market's cheapest row, and that is often a store that pays nothing (about two of
// every three buy clicks across our sites go to unpaid stores). The question: does the bar earn more with the page's paid link in it?
//   "store" today's bar: the market's cheapest open row.
//   "paid"  where that row pays nothing, the cheapest eBay or TCGplayer row that pays in the same market
//           (lib/quick-view.ts cheapestPaidRow), at its real price, labelled "Ad". Never called the cheapest; the top buy block and the
//           board are unchanged. No paid row: the store, as today.
// Card pages on a phone only (the bar is lg:hidden), never the quick view. 50/50 in the browser (localStorage `bar-test`), from
// BAR_TEST_START (the A/B freeze runs to 2 Dec). Counted through ONE event, `bar_test` {k}: "<arm>:seen" once a visit when a phone card
// page is drawn, then "<arm>:paid" / "<arm>:store" on that visit's first buy click of each kind on a card page (outside the quick view).
// Read 16 Dec: paid clickers per 100 seen visits, per arm. Keep "paid": make barArm() return "paid"; drop it: delete this file and its
// calls.
import { track } from "@vercel/analytics";

export const BAR_TEST_KEY = "bar-test";
export const BAR_TEST_START = Date.parse("2026-12-03T00:00:00Z");
const SEEN = "bar-test-seen";

export type BarArm = "store" | "paid";

/** This visitor's arm, tossing the coin on first sight. Null: before the start, on a desktop, no storage, or not in a browser. */
export function barArm(now: number = Date.now()): BarArm | null {
  try {
    if (typeof window === "undefined" || now < BAR_TEST_START) return null;
    if (window.matchMedia?.("(min-width: 1024px)").matches) return null;
    let arm = window.localStorage.getItem(BAR_TEST_KEY);
    if (arm !== "store" && arm !== "paid") {
      arm = Math.random() < 0.5 ? "store" : "paid";
      window.localStorage.setItem(BAR_TEST_KEY, arm);
      if (window.localStorage.getItem(BAR_TEST_KEY) !== arm) return null;
    }
    return arm as BarArm;
  } catch {
    return null;
  }
}

/** A phone card page was drawn: count the visit once, and return the arm. */
export function barTestSeen(): BarArm | null {
  const arm = barArm();
  if (!arm) return null;
  once(SEEN, () => track("bar_test", { k: `${arm}:seen` }));
  return arm;
}

/** A buy click (ConsentGatedAnalytics' listener): the visit's first paid and first store click on a card page, never in the quick view. */
export function barTestClick(a: Element, paid: boolean): void {
  if (a.closest('[role="dialog"]')) return;
  try {
    if (!location.pathname.startsWith("/card/") || !sessionStorage.getItem(SEEN)) return;
    const arm = localStorage.getItem(BAR_TEST_KEY);
    if (arm !== "store" && arm !== "paid") return;
    const kind = paid ? "paid" : "store";
    once(`${SEEN}-${kind}`, () => track("bar_test", { k: `${arm}:${kind}` }));
  } catch {
    return;
  }
}

function once(key: string, send: () => void): void {
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    return;
  }
  send();
}
