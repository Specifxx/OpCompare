import { HubIntro } from "@/components/HubIntro";
import type { Metadata } from "next";
import Link from "next/link";
import { EbayBuyCta } from "@/components/EbayBuyCta";
import { MoverList } from "@/components/MoverList";
import { MoversToolsCta } from "@/components/MoversToolsCta";
import { InlineSignupPrompt } from "@/components/InlineSignupPrompt";
import { AnswerBox } from "@/components/AnswerBox";
import { HubFaq } from "@/components/HubFaq";
import { RelatedGuides } from "@/components/RelatedGuides";
import { Breadcrumbs, Delta, JsonLd } from "@/components/ui";
import { guidesForCatalogue } from "@/lib/content/catalogue-guides";
import { MOVERS_FAQ } from "@/lib/content/movers-faq";
import { breadcrumbLd, faqLd } from "@/lib/jsonld";
import { releasedSets } from "@/lib/selectors";
import { getCatalog, getIndexSeries, getSparklines } from "@/lib/data";
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
  const spark = await getSparklines([...up, ...down, ...value.map((v) => v.card)].map((c) => c.id));
  const first = series[0]?.day;
  const ready = first
    ? new Date(Date.parse(first) + 7 * 864e5).toISOString().slice(0, 10)
    : null;
  const noHistory = !up.length && !down.length;

  return (
    <div>
      <JsonLd data={breadcrumbLd([{ name: "Price movers", path: "/movers" }])} />
      <JsonLd data={faqLd(MOVERS_FAQ)} />
      <Breadcrumbs items={[{ label: "Price movers" }]} />
      <h1 className="text-3xl text-white sm:text-4xl">
        One Piece price movers — this week
      </h1>
      <HubIntro path="/movers" />
      <div className="mt-6">
        <AnswerBox>
          One Piece price movers are the cards whose TCGplayer market price changed most in the past week. Only cards worth US$1 or more are ranked, so a 10-cent common doubling never tops the list.
        </AnswerBox>
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
          spark={spark}
          empty="No week-on-week moves yet."
          ebaySource="movers-panel"
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
          spark={spark}
          empty="No week-on-week moves yet."
          ebaySource="movers-panel"
        />
        <MoverList
          title="Best value right now"
          tone="text-gold"
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
          spark={spark}
          empty="Appears once a card has fallen from a recorded high."
          ebaySource="movers-panel"
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
      <section className="mt-8" aria-label="Browse prices by set">
        <h2 className="mb-3 text-lg font-bold text-white">Browse prices by set</h2>
        <div className="flex flex-wrap gap-2">
          {releasedSets(cat.sets, ["booster", "extra", "premium"]).slice(0, 12).map((s) => (
            <Link key={s.id} href={`/sets/${s.slug}`} className="chip border border-ink-700 bg-ink-850 text-slate-200 hover:border-ink-600 hover:text-white">
              {s.code} {s.name}
            </Link>
          ))}
          <Link href="/sets" className="chip border border-brand-500/40 text-brand-400 hover:text-brand-300">
            All sets →
          </Link>
        </div>
      </section>
      <HubFaq faqs={MOVERS_FAQ} />
      <RelatedGuides guides={guidesForCatalogue("movers")} className="card-surface mt-6 p-5" />
      <InlineSignupPrompt className="mt-6" surface="movers" title="See which cards are cheap right now, free" body="A free account shows Deal Finder's three biggest savings in your market: real store listings under TCGplayer's market price." />
    </div>
  );
}
