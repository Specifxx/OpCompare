import type { Metadata } from "next";
import Link from "next/link";
import { LineChart } from "@/components/LineChart";
import {
  Breadcrumbs,
  Delta,
  InShort,
  SectionHeader,
  StatTile,
} from "@/components/ui";
import { getCatalog, getIndexSeries } from "@/lib/data";
import { int, longDate, money } from "@/lib/format";
import { releasedSets } from "@/lib/selectors";
import { pageOg } from "@/lib/og/meta";
import { DATA_TABLE } from "@/components/prose";

export const metadata: Metadata = {
  title: "One Piece Card Market Index — Is the Market Up or Down?",
  description:
    "The OP Compare Index tracks the whole One Piece Card Game singles market from TCGplayer market prices, plus each set's total value.",
  alternates: { canonical: "/market" },
  openGraph: pageOg("/market"),
};

function change(
  series: { day: string; value: number }[],
  days: number,
): number | null {
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const target = Date.parse(last.day) - days * 864e5;
  const prev = [...series].reverse().find((p) => Date.parse(p.day) <= target);
  return prev ? ((last.value - prev.value) / prev.value) * 100 : null;
}

export default async function MarketPage() {
  const [cat, series] = await Promise.all([getCatalog(), getIndexSeries()]);
  const last = series[series.length - 1];
  const sets = releasedSets(cat.sets, ["booster", "extra", "premium"]).map(
    (s) => {
      const cs = cat.cards.filter((x) => x.setId === s.id);
      const total = cs.reduce((a, x) => a + (x.marketUsd ?? 0), 0);
      const w = cs.filter((x) => x.change7d != null && x.marketUsd);
      const move = w.length
        ? (w.reduce((a, x) => a + x.marketUsd!, 0) /
            w.reduce((a, x) => a + x.marketUsd! / (1 + x.change7d! / 100), 0) -
            1) *
          100
        : null;
      return { s, total, move, n: cs.length };
    },
  );

  return (
    <div>
      <Breadcrumbs trail={[{ name: "Market index" }]} />
      <h1 className="text-3xl text-white sm:text-4xl">The OP Compare Index</h1>
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-300">
        <p>
          One number for the whole One Piece singles market. The index started
          at 1,000 on {series[0] ? longDate(series[0].day) : "its first day"},
          and each day it moves by how much the TCGplayer market prices of every
          single worth US$1 or more changed since the previous day — counting
          only cards priced on both days, so a new set joining never jolts it.
        </p>
        <p>
          A card that moves a lot on its own shows up on{" "}
          <Link href="/movers" className="text-brand-400 hover:underline">
            this week&apos;s movers
          </Link>
          ; the index tells you whether the market moved with it.{" "}
          <Link href="/market/records" className="text-brand-400 hover:underline">
            Price records and cross-market gaps
          </Link>{" "}
          show where the same card costs less in another market.
        </p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Index"
          value={last ? last.value.toFixed(1) : "—"}
          sub={last ? `as of ${longDate(last.day)}` : undefined}
        />
        <StatTile label="7 days" value={<Delta v={change(series, 7)} />} />
        <StatTile label="30 days" value={<Delta v={change(series, 30)} />} />
        <StatTile
          label="Cards in the index"
          value={last ? int(last.cardCount) : "—"}
          sub={
            last ? `worth ${money(last.totalUsd, "US")} together` : undefined
          }
        />
      </div>
      <section className="card-surface mt-6 p-5">
        <h2 className="mb-3 text-lg text-white">Index history</h2>
        <LineChart
          series={[
            {
              label: "OP Compare Index",
              color: "#ff6b6b",
              points: series.map((p) => ({ x: p.day, y: p.value })),
            },
          ]}
          format={(v) => v.toFixed(0)}
          empty="The chart draws from the second day of prices."
        />
      </section>
      <div className="mt-6">
        <InShort>
          The index is a chained, value-weighted measure of TCGplayer market
          prices: expensive cards move it more than cheap ones, as they move a
          collection&apos;s value more. It is a reference for the market&apos;s
          direction, not a price you can buy at.
        </InShort>
      </div>
      <section className="mt-10">
        <SectionHeader
          title="Value by set"
          sub="Every printing in each released booster set at TCGplayer's market price, and its value-weighted 7-day move."
        />
        <div className="card-surface overflow-x-auto">
          <table className={`${DATA_TABLE} min-w-[560px]`}>
            <thead>
              <tr>
                <th>Set</th>
                <th className="text-right">Printings</th>
                <th className="text-right">Total value</th>
                <th className="text-right">7 days</th>
              </tr>
            </thead>
            <tbody>
              {sets.map(({ s, total, move, n }) => (
                <tr key={s.id}>
                  <td>
                    <Link
                      href={`/sets/${s.slug}`}
                      className="font-semibold text-brand-400 hover:underline"
                    >
                      {s.name}
                    </Link>{" "}
                    <span className="text-xs text-slate-500">{s.code}</span>
                  </td>
                  <td className="num text-right text-slate-300">{int(n)}</td>
                  <td className="num text-right font-semibold text-accent">
                    {money(total, "US")}
                  </td>
                  <td className="text-right">
                    <Delta v={move} className="text-xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
