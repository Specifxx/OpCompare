import type { Metadata } from "next";
import Link from "next/link";
import { EbayBuyCta } from "@/components/EbayBuyCta";
import { MoverList } from "@/components/MoverList";
import { MoversToolsCta } from "@/components/MoversToolsCta";
import { InlineSignupPrompt } from "@/components/InlineSignupPrompt";
import { Breadcrumbs, Delta, InShort } from "@/components/ui";
import { getCatalog, getIndexSeries } from "@/lib/data";
import { longDate } from "@/lib/format";
import { movers, offHighs } from "@/lib/selectors";
import { pageOg } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "One Piece Card Price Movers — This Week's Risers & Fallers",
  description:
    "The One Piece Card Game singles whose price moved most this week: the biggest risers, the biggest drops and the best value against a card's recent high.",
  alternates: { canonical: "/movers" },
  openGraph: pageOg("/movers"),
};

export default async function MoversPage() {
  const [cat, series] = await Promise.all([getCatalog(), getIndexSeries()]);
  const up = movers(cat.cards, "up", 15);
  const down = movers(cat.cards, "down", 15);
  const value = offHighs(cat.cards, 15);
  const first = series[0]?.day;
  const ready = first
    ? new Date(Date.parse(first) + 7 * 864e5).toISOString().slice(0, 10)
    : null;
  const noHistory = !up.length && !down.length;

  return (
    <div className="container-app py-6">
      <Breadcrumbs items={[{ label: "Price movers" }]} />
      <h1 className="text-3xl text-white sm:text-4xl">
        One Piece price movers — this week
      </h1>
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-300">
        <p>
          The One Piece singles whose price moved most this week, in three
          lists: the biggest risers, the biggest drops, and the best value
          against a card&apos;s own 90-day high. A move compares
          TCGplayer&apos;s market price today with the same card about seven
          days earlier, in US dollars, so it reads the same in every market.
        </p>
        <p>
          A single week is a short window: a tournament result or a new
          set&apos;s reveal can spike a card that settles once the meta adjusts.
          The{" "}
          <Link href="/market" className="link">
            OP Compare Index
          </Link>{" "}
          shows whether the whole market moved or one card did.
        </p>
      </div>
      <div className="mt-6">
        <InShort>
          One Piece price movers are the cards whose market price changed most
          in the past week. Only cards worth US$1 or more are ranked, so a
          10-cent common doubling never tops the list.
        </InShort>
      </div>
      {noHistory ? (
        <div className="card-surface mt-4 max-w-3xl p-4 text-sm text-slate-300">
          <strong className="text-white">Building history.</strong> OP Compare
          started recording prices on{" "}
          {first ? longDate(first) : "its first import"}; weekly moves appear
          from {ready ? longDate(ready) : "a week later"}, once every card has
          two prices a week apart.
        </div>
      ) : null}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MoverList
          title="Spiking this week"
          tone="text-up"
          sub="Up the most (7 days)"
          rows={up.map((card) => ({
            card,
            price: card.marketUsd,
            right: <Delta v={card.change7d} className="text-xs" />,
          }))}
          setById={cat.setById}
          empty="No week-on-week moves yet."
        />
        <MoverList
          title="Biggest drops this week"
          tone="text-down"
          sub="Down the most (7 days)"
          rows={down.map((card) => ({
            card,
            price: card.marketUsd,
            right: <Delta v={card.change7d} className="text-xs" />,
          }))}
          setById={cat.setById}
          empty="No week-on-week moves yet."
        />
        <MoverList
          title="Best value right now"
          tone="text-straw"
          sub="Largest discount off 90-day high"
          rows={value.map(({ card, off }) => ({
            card,
            price: card.marketUsd,
            right: (
              <span className="num text-xs font-semibold text-down">
                -{off.toFixed(1)}%
              </span>
            ),
          }))}
          setById={cat.setById}
          empty="Appears once a card has fallen from a recorded high."
        />
      </div>
      {/* Straight after the lists (RiftCompare): a reader who has just seen a
          card spike or drop has a card in mind, and this is where to shop for
          it. A buy path, not an ad; it localises itself (useCountry). */}
      {up.length || down.length || value.length ? (
        <EbayBuyCta className="mt-6" source="movers" page="movers" />
      ) : null}
      <div className="mt-6">
        <MoversToolsCta />
      </div>
      <InlineSignupPrompt className="mt-6" surface="movers" title="See which cards are cheap right now, free" body="A free account shows Deal Finder's three biggest savings in your market: real store listings under TCGplayer's market price." />
    </div>
  );
}
