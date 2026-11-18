"use client";
// The return nudge: see lib/return-nudge.ts for the rules. One delegated click listener notes a store click (and the page's own eBay and
// TCGplayer links); when the visitor comes back to the tab, the "on" arm sees a small dismissible card with those two links. OP Compare's
// custom events go to GA4 only (lib/analytics.ts), so the lift read is GA4's: nudge_eligible {arm}, nudge_shown, nudge_click {which}, and
// nudge_paid_click {arm} for a paid click after an eligible return in either arm.
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { outboundRel } from "@/lib/affiliate";
import { networkOf } from "@/lib/buy-click";
import { NUDGE_ARM_KEY, NUDGE_STATE_KEY, isStoreLink, nudgeEligible, nudgeShows, pickArm, pickPaidLinks, type LinkInfo } from "@/lib/return-nudge";

interface Saved { t: number; e?: string; g?: string; shown?: boolean }
interface View { e?: string; g?: string }

const read = (): Saved | null => {
  try { return JSON.parse(sessionStorage.getItem(NUDGE_STATE_KEY) ?? "null"); } catch { return null; }
};
const write = (v: Saved) => { try { sessionStorage.setItem(NUDGE_STATE_KEY, JSON.stringify(v)); } catch {} };
const arm = (): "on" | "off" => {
  try {
    const a = localStorage.getItem(NUDGE_ARM_KEY);
    if (a === "on" || a === "off") return a;
    const n = pickArm(Math.random());
    localStorage.setItem(NUDGE_ARM_KEY, n);
    return n;
  } catch {
    return "off";
  }
};
const infoOf = (a: HTMLAnchorElement): LinkInfo => ({ href: a.href, retailer: a.getAttribute("data-retailer") });

export function ReturnNudge() {
  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    let hiddenAt = 0;
    const onClick = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return;
      const a = (e.target as Element | null)?.closest?.("a[data-retailer]") as HTMLAnchorElement | null;
      if (!a || location.pathname.startsWith("/admin")) return;
      const info = infoOf(a);
      const net = networkOf((info.retailer ?? "").trim().toLowerCase());
      const st = read();
      if ((net === "ebay" || net === "tcgplayer") && st?.shown) {
        trackEvent("nudge_paid_click", { arm: arm(), network: net, page: location.pathname.slice(0, 100) }); // both arms, after an eligible return
        return;
      }
      if (!a.closest("[data-price-row]") || !isStoreLink(info)) return;
      arm(); // fixes the visitor's arm before any later paid click is logged
      const root = a.closest("[role=dialog], main") ?? document;
      const links = pickPaidLinks([...root.querySelectorAll<HTMLAnchorElement>("a[data-retailer]")].map(infoOf));
      write({ t: Date.now(), e: links.ebay, g: links.tcg, shown: st?.shown });
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      const st = read();
      if (!st) return;
      const now = Date.now();
      const state = {
        arm: arm(), clickedAt: st.t, now, awayMs: hiddenAt ? now - hiddenAt : 0, shownBefore: !!st.shown,
        blocked: !!document.querySelector("[data-rate-card]"), hasLinks: !!(st.e || st.g),
      };
      hiddenAt = 0;
      if (!nudgeEligible(state)) return;
      write({ ...st, shown: true }); // one eligible return a session, whichever arm
      trackEvent("nudge_eligible", { arm: state.arm, page: location.pathname.slice(0, 100) });
      if (nudgeShows(state)) {
        trackEvent("nudge_shown", { page: location.pathname.slice(0, 100) });
        setView({ e: st.e, g: st.g });
      }
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (!view) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setView(null);
    const t = setTimeout(() => setView(null), 20000);
    document.addEventListener("keydown", esc);
    return () => { clearTimeout(t); document.removeEventListener("keydown", esc); };
  }, [view]);

  if (!view) return null;
  const open = (which: string) => trackEvent("nudge_click", { which });
  return (
    <div role="status" data-return-nudge className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 rounded-xl border border-ink-700 bg-ink-900 p-3 text-sm text-white shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">Still comparing? <span className="ml-1 rounded border border-ink-600 px-1 text-[10px] uppercase tracking-wide text-slate-400">Ad</span></p>
        <button type="button" aria-label="Close" onClick={() => setView(null)} className="-mr-1 -mt-1 inline-flex min-h-8 min-w-8 items-center justify-center text-slate-400 hover:text-white">✕</button>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">Check the same product here too.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {view.e && <a href={view.e} target="_blank" rel={outboundRel()} onClick={() => open("ebay")} className="btn-primary min-h-10 px-3 py-1.5">eBay <span aria-hidden="true">↗</span></a>}
        {view.g && <a href={view.g} target="_blank" rel={outboundRel()} onClick={() => open("tcgplayer")} className="btn-tcg min-h-10 px-3 py-1.5">TCGplayer <span aria-hidden="true">↗</span></a>}
      </div>
    </div>
  );
}
