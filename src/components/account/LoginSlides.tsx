"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

// THE SIGN-IN SLIDES on /login (owner, 2026-11-22: "we need nice profile pages and sign in slides to encourage signing in"). They sell
// the FREE account by what it does here, one benefit a slide, beside the sign-in buttons. Never a price or Premium (Premium has its own
// page), and never a slider that opens itself: OP Compare keeps the owner's 2026-11-03 rule ("get rid of all the sliders regarding the
// premium and the signups"), so the slides live only on the page a visitor chose to open. One slide every 6 s, paused on hover and
// focus, none under prefers-reduced-motion; every slide sits in the same grid cell, so the height never changes. Event: signin_prompt
// {surface: "login", step: "view"} once in view (GA4), the same event the sister sites send.

const SLIDES = [
  {
    key: "watch",
    kicker: "Watchlist",
    title: "Tap ♥ on a card. We keep the price you started at.",
    body: "Every card you watch, in one list, with the price you started tracking at and a flag when one hits a new low or the price you set.",
  },
  {
    key: "binder",
    kicker: "Binder",
    title: "See what your collection is worth",
    body: "Add the cards and boxes you own. We value them at today's store prices in your currency.",
  },
  {
    key: "deals",
    kicker: "Deal Finder",
    title: "The top three deals on every list",
    body: "A free account opens the top three cards on each of the Deal Finder's lists: store prices well under TCGplayer's, checked daily.",
  },
  {
    key: "free",
    kicker: "No password",
    title: "Free, in one tap",
    body: "Continue with Google or Discord, or get a sign-in link by email. Comparing prices stays free for everyone.",
  },
] as const;

export function LoginSlides({ className = "" }: { className?: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen.current) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && !seen.current) {
        seen.current = true;
        trackEvent("signin_prompt", { surface: "login", step: "view" });
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-roledescription="carousel"
      aria-label="Why create a free OP Compare account"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`signin-panel relative overflow-hidden rounded-2xl p-6 text-[#ffffff] sm:p-8 ${className}`}
    >
      <div className="grid">
        {SLIDES.map((x, n) => (
          <div
            key={x.key}
            role="group"
            aria-roledescription="slide"
            aria-label={`${n + 1} of ${SLIDES.length}`}
            aria-hidden={n !== i}
            className={`col-start-1 row-start-1 transition-[opacity,transform] duration-500 motion-reduce:transition-none ${n === i ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"}`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ffffff]/80">{x.kicker}</p>
            <p className="mt-1 font-display text-2xl font-extrabold leading-tight sm:text-3xl">{x.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#ffffff]/85 sm:text-base">{x.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-1.5">
        {SLIDES.map((x, k) => (
          <button key={x.key} type="button" aria-label={`Show slide ${k + 1} of ${SLIDES.length}`} aria-current={k === i} onClick={() => setI(k)} className={`grid h-6 place-items-center ${k === i ? "w-7" : "w-4"}`}>
            <span className={`block h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-[#ffffff]" : "w-1.5 bg-[#ffffff]/45"}`} />
          </button>
        ))}
      </div>
      <ul className="mt-6 hidden gap-2 border-t border-[#ffffff]/20 pt-5 text-sm text-[#ffffff]/90 lg:grid">
        {SLIDES.map((x) => (
          <li key={x.key} className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#ffffff]/20 text-[11px] font-bold">✓</span>
            {x.title}
          </li>
        ))}
      </ul>
    </section>
  );
}
