"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { useWatchlist, WATCH_DRAWER_EVENT } from "./WatchButton";
import { WatchlistView } from "./WatchlistView";

// The watchlist as a slide-over (RiftCompare's HeaderWatchButton +
// WatchlistDrawer, 2026-09-22: "the watchlist button should open a side tab not
// go to a separate page"). A full navigation drops whatever the visitor was
// browsing; the drawer keeps the page underneath. /watchlist stays as the
// deep-link page and renders the same WatchlistView.
//
// Self-contained: the header renders <WatchDrawerButton />, which owns the open
// state and the panel, so the root layout needs no provider. Anything else can
// open it with openWatchDrawer() (WatchButton.tsx).
//
// OP Compare's watchlist lives in this browser, so there is no sign-in wall
// here (RiftCompare's is account-backed and emails price drops; OP Compare
// has no alert email yet, and the copy does not promise one).
export function WatchDrawerButton({ className = "" }: { className?: string }) {
  const items = useWatchlist();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const opener = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const count = items.length;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(WATCH_DRAWER_EVENT, on);
    return () => window.removeEventListener(WATCH_DRAWER_EVENT, on);
  }, []);
  // Following a link inside closes it (the new page should not open under it).
  useEffect(() => setOpen(false), [pathname]);

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      // Keep Tab inside the panel while it is open.
      const f = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])")].filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      // Focus fell out of the panel (the row just unwatched was removed with
      // its button): bring it back in rather than letting Tab reach the page.
      if (!panel.current.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={count > 0 ? `My watchlist, ${count} item${count === 1 ? "" : "s"}` : "My watchlist"}
        className={`tap-icon relative rounded-md hover:bg-ink-800 hover:text-brand-400 ${open ? "text-brand-400" : "text-slate-200"} ${className}`}
      >
        <Icon name="heart" className={`h-[18px] w-[18px] ${count > 0 ? "fill-current" : ""}`} />
        {count > 0 ? (
          <span aria-hidden="true" className="num absolute right-0.5 top-0.5 grid h-3.5 min-w-[14px] place-items-center rounded-full bg-accent px-0.5 text-[9px] font-bold text-ink-950">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-modal">
              <div className="absolute inset-0 animate-fade-in bg-ink-950/70 backdrop-blur-[2px] [animation-duration:150ms]" onClick={close} aria-hidden="true" />
              <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby="watch-drawer-title"
                className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-ink-800 bg-ink-900 shadow-glow motion-safe:animate-[watch-in_180ms_ease-out]"
              >
                <style>{`@keyframes watch-in{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}`}</style>
                <div className="flex items-center justify-between gap-3 border-b border-ink-800 px-4 py-3 sm:px-5">
                  <h2 id="watch-drawer-title" className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
                    <Icon name="heart" className="h-5 w-5 shrink-0 text-brand-400" />
                    <span>My watchlist</span>
                    {count ? <span className="num text-sm font-semibold text-slate-500">({count})</span> : null}
                  </h2>
                  <button ref={closeBtn} type="button" onClick={close} aria-label="Close watchlist" className="tap-icon rounded-md text-slate-400 hover:bg-ink-800 hover:text-white">
                    <Icon name="x" className="h-5 w-5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                  <p className="mb-3 text-xs leading-relaxed text-slate-500">
                    Today&apos;s cheapest price in your market, the 7-day change and the last 30 days. Saved in this browser — no account needed. Tap the heart to stop watching.
                  </p>
                  <WatchlistView layout="list" onNavigate={() => setOpen(false)} />
                </div>
                <div className="border-t border-ink-800 px-4 py-3 sm:px-5">
                  <Link href="/watchlist" onClick={() => setOpen(false)} className="link text-sm">
                    Open the full watchlist page →
                  </Link>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
