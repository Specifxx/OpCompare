"use client";

import Link from "next/link";
import { useCountry } from "@/components/CountryProvider";
import { SealedTile } from "@/components/SealedTile";
import type { Country } from "@/lib/country";
import type { SealedLite } from "@/lib/data";

// The homepage's sealed shelf (owner, 2026-10-28: sealed is as big a market as
// singles, so it belongs on the front page). The page is one cached HTML for
// every market; SealedLite carries every market's price, and this island picks
// the visitor's (CountryProvider), like Today's Top Deals.
export interface SealedShelfItem {
  s: SealedLite;
  setCode: string | null;
}

export function HomeSealedShelf({ items, kinds, lockCountry }: { items: SealedShelfItem[]; kinds: string[]; /** A region home prices in its own market. */ lockCountry?: Country }) {
  const visitor = useCountry().country;
  const country = lockCountry ?? visitor;
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="home-sealed">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="home-sealed" className="text-xl font-extrabold text-white">One Piece booster boxes and sealed</h2>
          <p className="text-sm text-slate-400">The newest sets&apos; boxes, cheapest in-stock store price first. Open one to compare every store.</p>
        </div>
        <Link href="/sealed" className="text-sm font-semibold text-brand-300 hover:underline">All sealed prices →</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {items.map(({ s, setCode }) => (
          <SealedTile key={s.id} s={s} country={country} setCode={setCode} />
        ))}
      </div>
      {kinds.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {kinds.map((k) => (
            <Link key={k} href={`/sealed?kind=${encodeURIComponent(k)}`} className="chip text-xs hover:border-ink-600 hover:text-white">
              {k}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
