"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { openRateCard } from "@/lib/site-reviews";

// Site-wide feedback / review launcher.
//
// SINCE 2026-11-03 (owner: every site's reviews approved in RiftCompare's admin,
// star ratings public at once) the pill opens the shared rate-us card
// (components/site-reviews/RateCard.tsx), which sends to RiftCompare's shared
// review service. The panel and form it used to open are gone; /contact is
// still where a message that wants a reply goes.
//
// The notes below are this launcher's history and still hold for the pill.
//
// WHY A PERSISTENT LAUNCHER AND NOT A SECOND POPUP. When this was written the
// site already auto-opened one sign-up dialog (SignupPromoPopup, removed
// altogether on 2026-09-30), whose own header recorded the real user feedback
// behind it: "ads + subscription pitch + a still-growing marketplace all at once
// read as overwhelming / untrustworthy to a new visitor". Adding a second uninvited interruption to
// collect satisfaction data would be measuring a problem while making it worse —
// and the people most likely to have something useful to say are exactly the
// ones a wall of modals drives off. So this NEVER auto-opens. It is a small,
// always-present, always-reachable control that costs nothing until it is
// wanted, which is what "accessible to any visitor" actually requires.
//
// IT WORKS SIGNED OUT. That is the entire point of the change it belongs to:
// /api/feedback used to 401 anyone without an account and FeedbackForm rendered
// a "Sign in →" wall, so the only reachable feedback came from people who had
// already converted. A visitor who bounces because something confused them has
// no account and never will.
//
// THE ROUTING IS DELIBERATE. A high rating leads to a share offer; a low one
// leads to "what went wrong" and an optional reply address. That is not
// review-gating: EVERY submission is stored and shown to admins identically, no
// rating is discarded or hidden, and nothing is ever published without the
// submitter ticking the consent box. It only decides which follow-up question is
// worth a person's time — asking someone who just rated the site 2 stars to go
// promote it is tone-deaf, and asking a delighted user "what went wrong" wastes
// the moment.

const LAUNCHER_HIDDEN_PATHS = ["/login", "/admin"];

export function FeedbackWidget() {
  const pathname = usePathname();
  const [overAdZone, setOverAdZone] = useState(false);
  const [overHero, setOverHero] = useState(false);

  // ── Never float over an ad ────────────────────────────────────────────────
  // FooterAds renders a real AdSense-adjacent affiliate unit directly above the
  // footer (layout.tsx), and Google's program policies prohibit ads being
  // obscured by floating page furniture. This repo has an active AdSense
  // remediation history (docs/adsense-remediation.md), so the launcher yields:
  // while the ad zone is anywhere in the viewport, it hides entirely. Costs one
  // observer and removes the whole class of violation.
  // A route with no zone (FooterAds renders none on the policy and trust pages)
  // must clear the flag: arriving from a footer link while the banners were on
  // screen would otherwise leave the launcher hidden for the whole page.
  useEffect(() => {
    const zone = document.getElementById("op-ad-zone");
    if (!zone || typeof IntersectionObserver === "undefined") {
      setOverAdZone(false);
      return;
    }
    const io = new IntersectionObserver((entries) => setOverAdZone(entries[0]?.isIntersecting ?? false));
    io.observe(zone);
    return () => io.disconnect();
  }, [pathname]);

  // ── Never compete with the hero's search + autocomplete ──────────────────
  // The homepage-redesign brief flags this exact launcher (fixed bottom-4
  // right-4) as a real risk of sitting near — and on a short mobile viewport,
  // occasionally under — the hero search's autocomplete dropdown, right at
  // the one moment the whole redesigned page is built around. Rather than
  // hand-roll a scrollY threshold, this reuses the SAME pattern the ad-zone
  // check right above it already established: look for a marker element by
  // id and hide for as long as it's in view. CinematicHero's outermost
  // section carries id="op-hero" for exactly this. On every OTHER route
  // (149 of them), that id doesn't exist, `zone` is null, and this becomes a
  // pure no-op — so the launcher's behavior everywhere except the homepage
  // is completely unchanged by this effect.
  useEffect(() => {
    const zone = document.getElementById("op-hero");
    if (!zone || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setOverHero(entries[0]?.isIntersecting ?? false));
    io.observe(zone);
    return () => io.disconnect();
  }, [pathname]);

  function openWidget() {
    openRateCard();
    trackEvent("feedback_open", { path: pathname ?? "/" });
  }

  if (LAUNCHER_HIDDEN_PATHS.some((p) => pathname?.startsWith(p))) return null;

  return (
    <>
      {!overAdZone && !overHero && (
        <button
          type="button"
          onClick={openWidget}
          aria-label="Send feedback"
          className="above-bottombar fixed right-4 z-40 flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-ink-700 bg-ink-900/95 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur transition-colors hover:border-brand-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5 sm:min-h-11"
        >
          <span aria-hidden>💬</span>
          <span className="hidden sm:inline">Feedback</span>
        </button>
      )}
    </>
  );
}
