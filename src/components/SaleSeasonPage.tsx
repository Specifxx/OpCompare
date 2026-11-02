import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { COUNTRY_LIST } from "@/lib/country";
import { getSealedCatalog } from "@/lib/data";
import { money } from "@/lib/format";
import { pageOg } from "@/lib/og/meta";
import { underMarket } from "@/lib/black-friday";
import { listRegions, saleHeading, saleIntro, saleYear, SALE_SEASONS, type SaleSlug } from "@/lib/sale-seasons";
import type { Country } from "@/lib/country";

// The seasonal sale pages, /boxing-day, /january-sales and /lunar-new-year (DECISIONS.md, "Seasonal sale pages",
// 2026-11-02): one URL each kept every year, like /black-friday, and the same real rows: sealed under TCGplayer's
// market price in the US, and the cheapest booster boxes in every market, each in its own currency. Reads only the
// cached sealed catalogue and nothing about the visitor. The wording names every market, never one country.

const today = () => new Date().toISOString().slice(0, 10);

/** Where the day is a sale day leads each page. */
const ORDER: Record<SaleSlug, Country[]> = {
  "boxing-day": ["AU", "UK", "CA", "US", "EU", "SG"],
  "january-sales": ["UK", "US", "AU", "CA", "EU", "SG"],
  "lunar-new-year": ["SG", "AU", "CA", "US", "UK", "EU"],
  "valentines-day": ["US", "UK", "CA", "AU", "EU", "SG"],
};
const REGIONS = listRegions(COUNTRY_LIST.map((c) => c.place));

export function saleMetadata(slug: SaleSlug): Metadata {
  const y = saleYear(slug, today());
  const name = SALE_SEASONS[slug].name;
  return {
    title: { absolute: `One Piece ${saleHeading(slug, y)}: Booster Box Prices` },
    description: `${name} ${y} One Piece deals: booster boxes and sealed product under TCGplayer's market price today, and the cheapest booster boxes in ${REGIONS}, checked daily.`,
    alternates: { canonical: `/${slug}` },
    openGraph: pageOg(`/${slug}`),
  };
}

export async function SaleSeasonPage({ slug }: { slug: SaleSlug }) {
  const now = today();
  const y = saleYear(slug, now);
  const sealed = await getSealedCatalog();
  const under = underMarket(sealed);
  const boxes = sealed.filter((s) => s.kind === "Booster Box" && !s.presale);
  return (
    <div className="flex max-w-4xl flex-col gap-8 py-6">
      <Breadcrumbs trail={[{ name: SALE_SEASONS[slug].linkLabel }]} />
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-black">One Piece {saleHeading(slug, y)}</h1>
        <p className="text-slate-300">
          {saleIntro(slug, y, REGIONS)} Below are
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
          {ORDER[slug].map((code) => COUNTRY_LIST.find((c) => c.code === code)).filter((c) => !!c).map((c) => {
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
        <Link className="text-brand-400 hover:underline" href="/black-friday">Black Friday deals →</Link> · <Link className="text-brand-400 hover:underline" href="/sealed">Every sealed product →</Link> · <Link className="text-brand-400 hover:underline" href="/tools/deal-finder">Deal Finder →</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/market">Market index →</Link>
      </p>
    </div>
  );
}
