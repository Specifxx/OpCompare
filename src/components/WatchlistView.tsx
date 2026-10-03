"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readWatchlist, WATCH_KEY } from "./WatchButton";

interface Row {
  kind: string;
  slug: string;
  name: string;
  variant: string | null;
  sub: string;
  img: string | null;
  price: string;
  stores: number;
  change7d: number | null;
}

export function WatchlistView() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    const load = async () => {
      const list = readWatchlist();
      if (!list.length) return setRows([]);
      const cards = list.filter((w) => w.kind === "card").map((w) => w.slug).join(",");
      const sealed = list.filter((w) => w.kind === "sealed").map((w) => w.slug).join(",");
      const r = await fetch(`/api/watchlist?cards=${encodeURIComponent(cards)}&sealed=${encodeURIComponent(sealed)}`);
      setRows(r.ok ? (await r.json()).items : []);
    };
    load();
    window.addEventListener("op:watchlist", load);
    return () => window.removeEventListener("op:watchlist", load);
  }, []);
  if (rows == null) return <p className="mt-8 text-sm text-slate-500">Loading…</p>;
  if (!rows.length)
    return (
      <div className="card-surface mt-8 p-8 text-center">
        <p className="text-lg font-semibold text-white">Nothing watched yet</p>
        <p className="mt-2 text-sm text-slate-400">
          Tap the heart on any card or product to keep it here. <Link href="/browse" className="link">Browse cards →</Link>
        </p>
      </div>
    );
  return (
    <div className="card-surface mt-8 divide-y divide-ink-800">
      {rows.map((r) => (
        <div key={`${r.kind}-${r.slug}`} className="flex items-center gap-3 px-4 py-3">
          {r.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.img} alt="" className="h-14 w-10 shrink-0 rounded bg-ink-800 object-cover" />
          ) : (
            <span className="h-14 w-10 shrink-0 rounded bg-ink-800" />
          )}
          <Link href={r.kind === "card" ? `/card/${r.slug}` : `/sealed/${r.slug}`} className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-white hover:text-brand-400">
              {r.name}
              {r.variant ? <span className="font-normal text-slate-400"> ({r.variant})</span> : null}
            </span>
            <span className="block truncate text-xs text-slate-500">{r.sub}</span>
          </Link>
          <span className="text-right">
            <span className="num block font-semibold text-accent">{r.price}</span>
            <span className="text-xs text-slate-500">{r.stores ? `${r.stores} stores` : ""}</span>
          </span>
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-brand-400"
            onClick={() => {
              const list = readWatchlist().filter((w) => !(w.slug === r.slug && w.kind === r.kind));
              localStorage.setItem(WATCH_KEY, JSON.stringify(list));
              window.dispatchEvent(new Event("op:watchlist"));
            }}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
