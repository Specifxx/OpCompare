"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CardQuickLink from "./CardQuickLink";
import { Icon } from "./Icon";
import { Sparkline } from "./Sparkline";
import { Delta } from "./ui";
import { unwatch, useWatchlist } from "./WatchButton";

interface Row {
  kind: "card" | "sealed";
  slug: string;
  name: string;
  variant: string | null;
  sub: string;
  img: string | null;
  price: string;
  stores: number;
  change7d: number | null;
  spark: number[] | null;
}

// The watched cards and products with today's price in the visitor's market,
// the 7-day change and a 30-day sparkline. Used by /watchlist (`page`) and by
// the header's slide-over drawer (`list`, one compact row each, RiftCompare's
// Watchlist layout="list"). The list itself lives in this browser
// (localStorage, WatchButton); prices come from /api/watchlist.
export function WatchlistView({ layout = "page", onNavigate }: { layout?: "page" | "list"; onNavigate?: () => void }) {
  const items = useWatchlist();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const key = items.map((w) => `${w.kind}:${w.slug}`).join(",");

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    const list = key ? key.split(",").map((k) => ({ kind: k.split(":")[0], slug: k.slice(k.indexOf(":") + 1) })) : [];
    if (!list.length) {
      setRows([]);
      return;
    }
    const ctrl = new AbortController();
    const cards = list.filter((w) => w.kind === "card").map((w) => w.slug).join(",");
    const sealed = list.filter((w) => w.kind === "sealed").map((w) => w.slug).join(",");
    fetch(`/api/watchlist?cards=${encodeURIComponent(cards)}&sealed=${encodeURIComponent(sealed)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        // Keep the visitor's own order (newest watched first).
        const by = new Map<string, Row>((d.items as Row[]).map((r) => [`${r.kind}:${r.slug}`, r]));
        setRows(key.split(",").map((k) => by.get(k)).filter((r): r is Row => Boolean(r)));
        setFailed(false);
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setFailed(true);
      });
    return () => ctrl.abort();
  }, [key, hydrated]);

  const compact = layout === "list";
  // Rows already loaded stay in view while a removal refetches.
  const shown = rows?.filter((r) => items.some((w) => w.slug === r.slug && w.kind === r.kind)) ?? null;

  if (failed && !shown?.length) return <p className={`text-sm text-slate-400 ${compact ? "" : "mt-8"}`}>Couldn&apos;t load prices just now. Try again in a moment.</p>;
  if (shown == null)
    return (
      <div className={`${compact ? "" : "card-surface mt-8"} divide-y divide-ink-800`} aria-busy="true" aria-label="Loading your watchlist">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <span className="h-14 w-10 shrink-0 animate-pulse rounded bg-ink-800" />
            <span className="h-4 flex-1 animate-pulse rounded bg-ink-800" />
          </div>
        ))}
      </div>
    );
  if (!shown.length)
    return (
      <div className={compact ? "flex flex-col items-center gap-3 py-10 text-center" : "card-surface mt-8 p-8 text-center"}>
        <Icon name="heart" className={`h-8 w-8 text-slate-600 ${compact ? "" : "mx-auto"}`} />
        <p className="text-lg font-semibold text-white">Nothing watched yet</p>
        <p className="max-w-xs text-sm text-slate-400 sm:max-w-none">
          Tap the heart on any card or product to keep it here, with today&apos;s cheapest price.{" "}
          <Link href="/browse" className="link" onClick={onNavigate}>
            Browse cards →
          </Link>
        </p>
      </div>
    );

  return (
    <ul className={`${compact ? "-mx-4 sm:-mx-5" : "card-surface mt-8"} divide-y divide-ink-800`}>
      {shown.map((r) => {
        const body = (
          <>
            {r.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.img} alt="" loading="lazy" className={`h-14 w-10 shrink-0 rounded bg-ink-800 ${r.kind === "card" ? "object-cover" : "object-contain"}`} />
            ) : (
              <span className="h-14 w-10 shrink-0 rounded bg-ink-800" />
            )}
            <span className="min-w-0 flex-1">
              <span data-card-name className="block truncate font-semibold text-white group-hover:text-brand-400">
                {r.name}
                {r.variant ? <span className="font-normal text-slate-400"> ({r.variant})</span> : null}
              </span>
              <span className="block truncate text-xs text-slate-500">{r.sub}</span>
            </span>
          </>
        );
        const cls = "group flex min-w-0 flex-1 items-center gap-3";
        return (
          <li key={`${r.kind}-${r.slug}`} className={`flex items-center gap-3 py-3 ${compact ? "px-4 sm:px-5" : "px-4"}`} onClickCapture={(e) => (e.target as HTMLElement).closest("a") && onNavigate?.()}>
            {r.kind === "card" ? (
              <CardQuickLink slug={r.slug} className={cls}>
                {body}
              </CardQuickLink>
            ) : (
              <Link href={`/sealed/${r.slug}`} className={cls}>
                {body}
              </Link>
            )}
            <Sparkline values={r.spark} className={`h-7 w-16 ${compact ? "hidden min-[400px]:block" : "hidden sm:block"}`} label={r.spark ? "30-day market price trend" : undefined} />
            <span className="shrink-0 text-right">
              <span className="num block font-semibold text-accent">{r.price}</span>
              <span className="block text-xs">
                {r.change7d != null ? <Delta v={r.change7d} className="text-xs" /> : <span className="text-slate-500">{r.stores ? `${r.stores} store${r.stores === 1 ? "" : "s"}` : ""}</span>}
              </span>
            </span>
            <button
              type="button"
              onClick={() => unwatch(r.slug, r.kind)}
              aria-label={`Stop watching ${r.name}`}
              title="Stop watching"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-brand-400 hover:bg-ink-800"
            >
              <Icon name="heart" className="h-4 w-4 fill-current" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
