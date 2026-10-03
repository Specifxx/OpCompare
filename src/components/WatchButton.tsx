"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "./Icon";

// The watchlist lives in this browser (localStorage) — no account needed.
// RiftCompare's watchlist emails price drops; that needs accounts and is a
// later step here (see README "Not ported yet").
export const WATCH_KEY = "op:watchlist";
export interface WatchItem {
  slug: string;
  kind: "card" | "sealed";
  name: string;
  added: string;
}

export function readWatchlist(): WatchItem[] {
  try {
    return JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
  } catch {
    return [];
  }
}

// One snapshot per stored string, so useSyncExternalStore sees a stable value.
const NONE: WatchItem[] = [];
let snapRaw: string | null | undefined;
let snap: WatchItem[] = NONE;
function snapshot(): WatchItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(WATCH_KEY);
  } catch {
    /* blocked */
  }
  if (raw !== snapRaw) {
    snapRaw = raw;
    try {
      const v: unknown = JSON.parse(raw || "[]");
      snap = Array.isArray(v) ? (v as WatchItem[]) : NONE;
    } catch {
      snap = NONE;
    }
  }
  return snap;
}
function subscribe(on: () => void) {
  window.addEventListener("op:watchlist", on);
  window.addEventListener("storage", on);
  return () => {
    window.removeEventListener("op:watchlist", on);
    window.removeEventListener("storage", on);
  };
}

/** This browser's watchlist, live (other tabs included); [] on the server. */
export function useWatchlist(): WatchItem[] {
  return useSyncExternalStore(subscribe, snapshot, () => NONE);
}

/** Remove one item (the drawer's and the watchlist page's remove control). */
export function unwatch(slug: string, kind: "card" | "sealed") {
  writeWatchlist(readWatchlist().filter((w) => !(w.slug === slug && w.kind === kind)));
}

/** Open the header's watchlist drawer from anywhere (WatchDrawer listens). */
export const WATCH_DRAWER_EVENT = "op:watch-drawer";
export function openWatchDrawer() {
  window.dispatchEvent(new Event(WATCH_DRAWER_EVENT));
}

function writeWatchlist(items: WatchItem[]) {
  try {
    localStorage.setItem(WATCH_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("op:watchlist"));
  } catch {
    /* private mode */
  }
}

export function WatchButton({ slug, kind, name, variant = "icon" }: { slug: string; kind: "card" | "sealed"; name: string; variant?: "icon" | "button" }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(readWatchlist().some((w) => w.slug === slug && w.kind === kind));
    sync();
    window.addEventListener("op:watchlist", sync);
    return () => window.removeEventListener("op:watchlist", sync);
  }, [slug, kind]);
  const flip = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list = readWatchlist();
    writeWatchlist(on ? list.filter((w) => !(w.slug === slug && w.kind === kind)) : [{ slug, kind, name, added: new Date().toISOString() }, ...list].slice(0, 200));
  };
  if (variant === "button") {
    return (
      <button type="button" onClick={flip} className="btn-ghost" aria-pressed={on}>
        <Icon name="heart" className={`h-4 w-4 ${on ? "fill-current text-brand-400" : ""}`} />
        {on ? "Watching" : "Watch price"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={flip}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from watchlist` : `Add ${name} to watchlist`}
      className="grid h-8 w-8 place-items-center rounded-full bg-ink-950/80 text-slate-200 ring-1 ring-ink-700 backdrop-blur hover:text-brand-400"
    >
      <Icon name="heart" className={`h-4 w-4 ${on ? "fill-current text-brand-400" : ""}`} />
    </button>
  );
}
