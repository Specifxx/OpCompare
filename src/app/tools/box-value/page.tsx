import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, InShort, StatTile } from "@/components/ui";
import { COUNTRIES } from "@/lib/country";
import { getCatalog, getSealedCatalog } from "@/lib/data";
import { money } from "@/lib/format";
import { usdCentsToCountry } from "@/lib/fx";
import { getCountry } from "@/lib/get-country";
import { headline } from "@/lib/price";
import { boosterBoxes } from "@/lib/selectors";
import { pageOg } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "One Piece Booster Box Value — Is a Box Worth Opening?",
  description:
    "Compare the price of a One Piece booster box with the value of the cards in its set, and see which chase cards carry that value.",
  alternates: { canonical: "/tools/box-value" },
  openGraph: pageOg("/tools/box-value"),
};

// Deliberately NOT an expected-value calculator: Bandai does not publish pull
// rates, and an EV built on guessed odds would be a number that looks precise
// and is not. This puts the box price beside what the set's cards are worth and
// how concentrated that value is — the facts a buyer can actually check.
export default async function BoxValue({
  searchParams,
}: {
  searchParams: { set?: string };
}) {
  const country = getCountry();
  const c = COUNTRIES[country];
  const [cat, sealed] = await Promise.all([getCatalog(), getSealedCatalog()]);
  const boxes = boosterBoxes(sealed, cat.setById);
  const box =
    boxes.find((b) => cat.setById.get(b.setId!)?.slug === searchParams.set) ??
    boxes.find((b) => b.marketUsd != null) ??
    boxes[0];
  const set = box ? cat.setById.get(box.setId!) : undefined;
  const cards = set
    ? cat.cards.filter((x) => x.setId === set.id && x.marketUsd != null)
    : [];
  const total = cards.reduce((a, x) => a + x.marketUsd!, 0);
  const sorted = [...cards].sort((a, b) => b.marketUsd! - a.marketUsd!);
  const top10 = sorted.slice(0, 10).reduce((a, x) => a + x.marketUsd!, 0);
  const h = box ? headline(box, country) : null;
  return (
    <div className="container-app py-6">
      <Breadcrumbs
        items={[
          { href: "/tools", label: "Tools" },
          { label: "Box value" },
        ]}
      />
      <h1 className="text-3xl text-white sm:text-4xl">Booster box value</h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-300">
        Is a box worth opening, or are you better off buying the singles you
        want? Pick a set to see its booster box price in {c.place} beside what
        its cards are worth on TCGplayer — and how much of that value sits in a
        handful of chase cards you are unlikely to pull.
      </p>
      <form action="/tools/box-value" className="mt-5 flex flex-wrap gap-2">
        <select name="set" defaultValue={set?.slug} className="input max-w-md">
          {boxes.map((b) => {
            const s = cat.setById.get(b.setId!);
            return s ? (
              <option key={b.id} value={s.slug}>
                {s.code} — {s.name}
              </option>
            ) : null;
          })}
        </select>
        <button className="btn-primary">Show</button>
      </form>
      {box && set ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label={`Box · ${c.code}`}
              value={
                h?.cents != null
                  ? `${h.kind === "reference" ? "≈" : ""}${money(h.cents, country)}`
                  : "—"
              }
              sub={
                <Link href={`/sealed/${box.slug}`} className="link">
                  Every offer →
                </Link>
              }
            />
            <StatTile
              label="Set value"
              value={money(usdCentsToCountry(total, country), country)}
              sub={`${cards.length} priced printings`}
            />
            <StatTile
              label="Top 10 cards"
              value={total ? `${Math.round((top10 / total) * 100)}%` : "—"}
              sub="share of the set's value"
            />
            <StatTile
              label="Most valuable"
              value={
                sorted[0]
                  ? money(
                      usdCentsToCountry(sorted[0].marketUsd!, country),
                      country,
                    )
                  : "—"
              }
              sub={sorted[0]?.name}
            />
          </div>
          <div className="mt-6">
            <InShort>
              {box.packCount
                ? `A box holds ${box.packCount} packs, not the whole set`
                : "A box is a few dozen packs at most, not the whole set"}
              : you get a slice of the commons and a few rares, and most boxes
              contain none of the cards that make up
              {total
                ? ` the top ${Math.round((top10 / total) * 100)}% of`
                : ""}{" "}
              the set&apos;s value. If you want specific cards, buying them
              single is almost always cheaper; open boxes for the fun of it.
            </InShort>
          </div>
          <section className="card-surface mt-6 overflow-x-auto">
            <table className="data-table min-w-[520px]">
              <thead>
                <tr>
                  <th>Top cards in {set.code}</th>
                  <th className="text-right">Market ({c.currency})</th>
                  <th className="text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 20).map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link
                        href={`/card/${x.slug}`}
                        className="font-semibold text-slate-100 hover:text-brand-400"
                      >
                        {x.name}
                      </Link>
                      {x.variant ? (
                        <span className="text-xs text-slate-500">
                          {" "}
                          ({x.variant})
                        </span>
                      ) : null}
                    </td>
                    <td className="num text-right text-accent">
                      {money(usdCentsToCountry(x.marketUsd!, country), country)}
                    </td>
                    <td className="num text-right text-slate-400">
                      {((x.marketUsd! / total) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
