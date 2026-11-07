import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { COUNTRY_LIST } from "@/lib/country";
import { getSealedCatalog } from "@/lib/data";
import { money } from "@/lib/format";
import { pageOg } from "@/lib/og/meta";
import { blackFriday, cyberMonday, longDate, seasonYear, underMarket } from "@/lib/black-friday";
import { FamilyCluster } from "@/components/FamilyCluster";
import { SalePriceWatch } from "@/components/SalePriceWatch";
import { DEFAULT_COUNTRY } from "@/lib/country";

// The Black Friday and Cyber Monday pages, /black-friday (DECISIONS.md, "Black Friday page", 2026-11-02) and
// /cyber-monday (2026-11-06, "Black Friday and Cyber Monday price watch pages"): one URL each, kept every year,
// one component. Reads only the cached sealed catalogue, the price watch loader and nothing about the visitor,
// so every market is drawn on the page and the price watch is the US's, the market that earns. The route files
// set six hours, the floor for pages buyers act on.

export type SaleEvent = "black-friday" | "cyber-monday";
const NAMES: Record<SaleEvent, string> = { "black-friday": "Black Friday", "cyber-monday": "Cyber Monday" };

const today = () => new Date().toISOString().slice(0, 10);

export function holidayMetadata(event: SaleEvent): Metadata {
  const y = seasonYear(today());
  const name = NAMES[event];
  return {
    title: { absolute: `One Piece ${name} Deals ${y}: Booster Box Prices` },
    description:
      event === "black-friday"
        ? `One Piece booster boxes and sealed product under TCGplayer's market price today, and the cheapest booster boxes in six markets, checked daily through Black Friday and Cyber Monday ${y}. Plus a US price watch: sealed boxes, the week's biggest price drops and graded cards, each with a live eBay listing.`
        : `One Piece Cyber Monday ${y}: sealed product under TCGplayer's market price today, the cheapest booster boxes in six markets, and a US price watch of sealed boxes, the week's biggest price drops and graded cards, each linking to a live eBay listing.`,
    alternates: { canonical: `/${event}` },
    openGraph: pageOg(`/${event}`),
  };
}

export async function HolidaySalePage({ event }: { event: SaleEvent }) {
  const name = NAMES[event];
  const now = today();
  const y = seasonYear(now);
  const bf = blackFriday(y);
  const sealed = await getSealedCatalog();
  const under = underMarket(sealed);
  const boxes = sealed.filter((s) => s.kind === "Booster Box" && !s.presale);
  return (
    <div className="flex max-w-4xl flex-col gap-8 py-6">
      <Breadcrumbs trail={[{ name: `${name} deals` }]} />
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-black">One Piece {name} deals {y}</h1>
        <p className="text-slate-300">
          Black Friday is {longDate(bf)} and Cyber Monday is {longDate(cyberMonday(y))} {y}.{now < bf ? " Many stores start their sales earlier." : ""} Below are
          the sealed products whose cheapest listing we track is under TCGplayer&apos;s market price today, and the cheapest booster boxes in each market. The page
          updates every day through the sales. We only see what a listing asks when we read it, so check the price at checkout. Under the deals, the{" "}
          <a href="#price-watch" className="text-brand-400 hover:underline">price watch</a>: sealed boxes, the week&apos;s biggest price drops and graded cards, each with a live eBay listing.
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

      {/* The price watch (2026-11-06): the US, the market that earns; every row ends in a live eBay listing. */}
      <SalePriceWatch market={DEFAULT_COUNTRY} page={event} source={event} />

      <p className="text-sm">
        <Link className="text-brand-400 hover:underline" href={event === "black-friday" ? "/cyber-monday" : "/black-friday"}>{event === "black-friday" ? "Cyber Monday deals" : "Black Friday deals"} →</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/graded">Graded prices →</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/sealed">Every sealed product →</Link> · <Link className="text-brand-400 hover:underline" href="/tools/deal-finder">Deal Finder →</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/market">Market index →</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/blog/one-piece-card-game-gift-guide">Gift guide and Black Friday tips →</Link>
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
