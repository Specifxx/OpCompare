import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { COUNTRY_LIST } from "@/lib/country";
import { getSealedCatalog } from "@/lib/data";
import { money } from "@/lib/format";
import { pageOg } from "@/lib/og/meta";
import { blackFriday, cyberMonday, longDate, seasonYear, underMarket } from "@/lib/black-friday";
import { FamilyCluster } from "@/components/FamilyCluster";

// /black-friday (DECISIONS.md, "Black Friday page", 2026-11-02): one URL kept every year. Reads only the cached sealed
// catalogue and nothing about the visitor, so every market is drawn on the page. Six hours, the floor for pages
// buyers act on.
export const revalidate = 21600;

const today = () => new Date().toISOString().slice(0, 10);

export function generateMetadata(): Metadata {
  const y = seasonYear(today());
  return {
    title: { absolute: `One Piece Black Friday Deals ${y}: Booster Box Prices` },
    description: `One Piece booster boxes and sealed product under TCGplayer's market price today, and the cheapest booster boxes in six markets, checked daily through Black Friday and Cyber Monday ${y}.`,
    alternates: { canonical: "/black-friday" },
    openGraph: pageOg("/black-friday"),
  };
}

export default async function BlackFridayPage() {
  const now = today();
  const y = seasonYear(now);
  const bf = blackFriday(y);
  const sealed = await getSealedCatalog();
  const under = underMarket(sealed);
  const boxes = sealed.filter((s) => s.kind === "Booster Box" && !s.presale);
  return (
    <div className="flex max-w-4xl flex-col gap-8 py-6">
      <Breadcrumbs trail={[{ name: "Black Friday deals" }]} />
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-black">One Piece Black Friday deals {y}</h1>
        <p className="text-slate-300">
          Black Friday is {longDate(bf)} and Cyber Monday is {longDate(cyberMonday(y))} {y}.{now < bf ? " Many stores start their sales earlier." : ""} Below are
          the sealed products whose cheapest listing we track is under TCGplayer&apos;s market price today, and the cheapest booster boxes in each market. The page
          updates every day through the sales. We only see what a listing asks when we read it, so check the price at checkout.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Sealed under TCGplayer market today (US)</h2>
        {!under.length ? (
          <p className="text-sm text-slate-400">Nothing sealed worth $10 or more is under TCGplayer&apos;s market price in the US today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr><th className="py-1 pr-3">Product</th><th className="py-1 pr-3 text-right">TCGplayer market</th><th className="py-1 pr-3 text-right">Cheapest listing</th><th className="py-1 text-right">Under market</th></tr>
              </thead>
              <tbody>
                {under.map((s) => (
                  <tr key={s.id} className="border-t border-ink-800">
                    <td className="py-1.5 pr-3"><Link className="hover:underline" href={`/sealed/${s.slug}`}>{s.name}</Link></td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{money(s.marketUsd, "US")}</td>
                    <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{money(s.low.US, "US")}</td>
                    <td className="py-1.5 text-right tabular-nums text-emerald-400">{s.saving}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-400">Item prices before shipping, in US dollars on both sides; nothing is converted.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Cheapest booster boxes in each market today</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {COUNTRY_LIST.map((c) => {
            const rows = boxes.filter((s) => s.low[c.code] != null && s.stores[c.code] > 0).sort((a, b) => a.low[c.code]! - b.low[c.code]!).slice(0, 5);
            return (
              <div key={c.code} className="rounded-xl border border-ink-800 p-3">
                <h3 className="mb-1 font-semibold">{c.label}</h3>
                {!rows.length && <p className="text-sm text-slate-400">No booster box in stock at a store we track.</p>}
                <ol className="text-sm">
                  {rows.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2 border-t border-ink-800 py-1">
                      <Link className="truncate hover:underline" href={`/sealed/${s.slug}`}>{s.name}</Link>
                      <span className="shrink-0 tabular-nums">{money(s.low[c.code], c.code)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400">Each market in its own currency, from the stores that charge in it.</p>
      </section>

      <p className="text-sm">
        <Link className="text-brand-400 hover:underline" href="/sealed">Every sealed product →</Link> · <Link className="text-brand-400 hover:underline" href="/tools/deal-finder">Deal Finder →</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/market">Market index →</Link>
      </p>
      <p className="text-sm text-slate-400">
        Later in the season: <Link className="text-brand-400 hover:underline" href="/boxing-day">Boxing Day deals</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/january-sales">January sales</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/lunar-new-year">Lunar New Year deals</Link>
      </p>
      <FamilyCluster kind="deal" />
    </div>
  );
}
