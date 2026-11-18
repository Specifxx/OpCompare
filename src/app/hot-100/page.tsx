import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { ShareButton } from "@/components/ShareButton";
import { getCatalog } from "@/lib/data";
import { hotCards, hotName } from "@/lib/hot100";
import { pageOg } from "@/lib/og/meta";

// /hot-100: the weekly Hot 100 (lib/hot100.ts; owner, 2026-11-18), the one URL a week's Reddit post links. Reads only the cached
// catalogue every /movers visit already reads; nothing per card.
export const metadata: Metadata = {
  title: "One Piece Hot 100: this week's biggest card price risers",
  description: "The One Piece Card Game cards whose TCGplayer market price rose most in the last seven days, ranked, worth US$3 or more. From OP Compare's daily price history.",
  alternates: { canonical: "/hot-100" },
  openGraph: pageOg("/hot-100"),
};

const usd = (cents: number | null) => (cents == null ? "—" : `$${(cents / 100).toFixed(2)}`);

export default async function Hot100Page() {
  const cat = await getCatalog();
  const rows = hotCards(cat.cards);
  const n = rows.length;
  const name = `One Piece ${n ? hotName(n) : "Hot 100"}`;
  return (
    <div>
      <Breadcrumbs trail={[{ name: n ? hotName(n) : "Hot 100" }]} />
      <h1 className="mt-4 text-2xl font-extrabold text-white sm:text-3xl">{name}</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-300">
        The One Piece cards whose TCGplayer market price rose most in the last seven days, biggest rise first. Cards worth US$3 or more; a week with fewer real risers is a shorter chart, never padded.
      </p>
      <ShareButton className="mt-3" name={name} medium="movers" path="/hot-100" />
      {n ? (
        <ol className="card-surface mt-6 max-w-3xl divide-y divide-ink-800">
          {rows.map((c, i) => {
            const set = cat.setById.get(c.setId);
            return (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <span className="w-8 shrink-0 text-right text-base font-extrabold tabular-nums text-white">{i + 1}</span>
                <Link href={`/card/${c.slug}`} className="min-w-0 flex-1 truncate text-slate-100 hover:underline">
                  {c.name}
                  {c.variant ? <span className="text-slate-400"> ({c.variant})</span> : null}
                  {set?.code || c.number ? <span className="ml-1 text-xs text-slate-500">{[set?.code, c.number].filter(Boolean).join(" ")}</span> : null}
                </Link>
                <span className="tabular-nums text-slate-200">{usd(c.marketUsd)}</span>
                <span className="w-16 shrink-0 text-right font-semibold tabular-nums text-up">+{c.change7d!.toFixed(1)}%</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="card-surface mt-6 max-w-3xl p-4 text-sm text-slate-300">No card worth US$3 or more rose this week.</p>
      )}
      <p className="mt-6 max-w-3xl text-sm text-slate-400">
        How it works: each card&apos;s TCGplayer market price today against seven days ago, from the price history we record every day.{" "}
        <Link className="text-brand-400 hover:underline" href="/movers">
          Every riser and faller →
        </Link>
      </p>
    </div>
  );
}
