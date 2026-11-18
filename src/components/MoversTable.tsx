"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cardImage } from "@/lib/images";
import type { Constituent } from "@/lib/market-stats";

// One searchable list of the week's movers, sortable by % gain or loss (visitor
// feedback, 2026-11-18: "sort by % of gain or loss, better than just toggling the
// gainers or losers button"). Rows are built on the server from the catalogue the
// page already reads (no new query); every % is the card's own TCGplayer 7-day move.
type Sort = "gain" | "loss" | "move" | "price-desc" | "price-asc" | "name";
const SORTS: [Sort, string][] = [
  ["move", "Biggest % move, up or down"],
  ["gain", "Biggest % gain"],
  ["loss", "Biggest % loss"],
  ["price-desc", "Price: high to low"],
  ["price-asc", "Price: low to high"],
  ["name", "Name A–Z"],
];
const usd = (cents: number) =>
  `US$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents >= 100000 ? 0 : 2, maximumFractionDigits: cents >= 100000 ? 0 : 2 })}`;
export type MoverTableRow = Pick<Constituent, "id" | "slug" | "name" | "variant" | "number" | "setCode" | "priceCents" | "hasImage"> & { d7pct: number };

export function MoversTable({ rows: all }: { rows: MoverTableRow[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("move");
  const [move, setMove] = useState<"all" | "up" | "down">("all");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = all.filter((c) => {
      if (move === "up" && c.d7pct <= 0) return false;
      if (move === "down" && c.d7pct >= 0) return false;
      return !needle || `${c.name} ${c.variant ?? ""} ${c.setCode} ${c.number ?? ""}`.toLowerCase().includes(needle);
    });
    const by: Record<Sort, (a: MoverTableRow, b: MoverTableRow) => number> = {
      gain: (a, b) => b.d7pct - a.d7pct,
      loss: (a, b) => a.d7pct - b.d7pct,
      move: (a, b) => Math.abs(b.d7pct) - Math.abs(a.d7pct),
      "price-desc": (a, b) => b.priceCents - a.priceCents,
      "price-asc": (a, b) => a.priceCents - b.priceCents,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return list.sort(by[sort]);
  }, [all, q, move, sort]);

  if (all.length < 2) return null;

  // A Risers/Drops tap on the default order puts that side's biggest move first.
  function pickMove(k: "all" | "up" | "down") {
    setMove(k);
    if (sort === "move" && k !== "all") setSort(k === "up" ? "gain" : "loss");
  }

  return (
    <section id="all-movers" className="mt-8 scroll-mt-32">
      <h2 className="text-xl font-extrabold text-white">Search and sort every mover</h2>
      <p className="mb-3 mt-1 text-sm text-slate-400">
        The {all.length} cards worth US$1 or more that moved most this week, by their 7-day % change.
      </p>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
          {/* text-base below sm: iOS Safari zooms in on a field under 16px. */}
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by card or set…"
            aria-label="Search the movers"
            className="min-h-11 w-full rounded-lg border border-ink-700 bg-ink-900 py-2 pl-9 pr-3 text-base text-white placeholder:text-slate-500 focus:border-brand-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500/40 sm:min-h-0 sm:text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <span className="shrink-0 font-semibold">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort the movers"
            className="min-h-11 w-full min-w-0 rounded-lg border border-ink-700 bg-ink-900 px-2 text-base text-white focus:border-brand-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500/40 sm:min-h-0 sm:w-auto sm:py-2 sm:text-sm"
          >
            {SORTS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-900 p-1">
          {([["all", "All"], ["up", "▲ Risers"], ["down", "▼ Drops"]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => pickMove(k)}
              aria-pressed={move === k}
              className={`inline-flex min-h-11 items-center rounded-md px-3 text-xs font-semibold transition-colors sm:min-h-0 sm:py-1.5 ${move === k ? "bg-ink-800 text-white" : "text-slate-400 hover:text-white"} ${k === "up" && move === k ? "text-up" : ""} ${k === "down" && move === k ? "text-down" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="card-surface max-h-[34rem] overflow-auto overscroll-contain">
        {rows.length ? (
          <ul className="divide-y divide-ink-800">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/card/${c.slug}`} prefetch={false} className="flex min-h-11 items-center gap-2.5 px-3 py-2 hover:bg-ink-800 sm:px-4">
                  {c.hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cardImage.thumb(c.id)} alt={c.name} width={28} height={39} loading="lazy" decoding="async" className="h-10 w-7 shrink-0 rounded-sm object-cover" />
                  ) : (
                    <span className="h-10 w-7 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {c.name}
                      {c.variant ? <span className="font-normal text-slate-400"> · {c.variant}</span> : null}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {c.setCode} · {c.number ?? "—"}
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-right">
                    <span className="num block text-sm font-semibold text-white">{usd(c.priceCents)}</span>
                    <span className={`num block text-[11px] font-semibold ${c.d7pct > 0 ? "text-up" : "text-down"}`}>
                      {c.d7pct > 0 ? "+" : "−"}
                      {Math.abs(c.d7pct).toFixed(1)}%<span className="font-normal text-slate-500"> 7d</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-slate-500">No cards match that search.</p>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-600">
        Showing {rows.length} of {all.length}. TCGplayer market prices, US$.
      </p>
    </section>
  );
}
