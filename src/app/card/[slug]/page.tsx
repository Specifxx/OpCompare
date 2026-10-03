import { ebayJsonLdOffers } from "@/lib/board";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardArt, CardTile } from "@/components/CardTile";
import { CardStickyBuyBar } from "@/components/CardStickyBuyBar";
import { CardTopBuy } from "@/components/CardTopBuy";
import { EbayBuyCta } from "@/components/EbayBuyCta";
import { EbayCardBanner } from "@/components/EbayCardBanner";
import { TcgMarketPrice } from "@/components/TcgMarketPrice";
import { TcgplayerBanner } from "@/components/TcgplayerBanner";
import { LineChart } from "@/components/LineChart";
import { PriceBoard } from "@/components/PriceBoard";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { ShareButton } from "@/components/ShareButton";
import { CardConversionCta } from "@/components/CardConversionCta";
import { InlineSignupPrompt } from "@/components/InlineSignupPrompt";
import { PriceWatchButton } from "@/components/PriceWatchButton";
import { PriceDropAlertCta } from "@/components/PriceDropAlertCta";
import { enabledProviders } from "@/lib/oauth";
import {
  Breadcrumbs,
  ColorBadge,
  Faq,
  JsonLd,
  PrintingBadge,
  RarityBadge,
  SectionHeader,
  StatTile,
} from "@/components/ui";
import { affiliateUrl, cardEbayQuery, outboundRel } from "@/lib/affiliate";
import { rarityLabel, SET_KINDS } from "@/lib/constants";
import { COUNTRIES, isoCountry } from "@/lib/country";
import { getCardDetail, getCatalog, getEmailStatus, getProductHistory } from "@/lib/data";
import { longDate, money, usd } from "@/lib/format";
import { getCountry } from "@/lib/get-country";
import { cardImage } from "@/lib/images";
import { headline } from "@/lib/price";
import { pageOgOwnImage } from "@/lib/og/meta";
import { cheapestBuyRow, isPreRelease } from "@/lib/quick-view";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { isStoreSource } from "@/lib/stores";

type Props = { params: { slug: string } };

function displayTitle(c: {
  name: string;
  variant: string | null;
  number: string | null;
}): string {
  return `${c.name}${c.variant ? ` (${c.variant})` : ""}${c.number ? ` ${c.number}` : ""}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCardDetail(params.slug);
  if (!c) return { title: "Card not found" };
  const t = displayTitle(c);
  const title =
    `${t} Price`.length <= 52 ? `${t} Price — ${c.set.code}` : `${t} Price`;
  return {
    title: { absolute: `${title.slice(0, 60)}` },
    description: `${t} from ${c.set.name} (${c.set.code}): live One Piece Card Game prices compared across stores in the US, Australia, the UK, Singapore, Canada and the EU${
      c.marketUsd ? `. TCGplayer market price ${usd(c.marketUsd)}` : ""
    }.`,
    alternates: { canonical: `/card/${c.slug}` },
    // No `images`: the sibling opengraph-image.tsx draws the 1200×630 share card.
    openGraph: pageOgOwnImage(`/card/${c.slug}`, { title: `${t} | ${SITE_NAME}` }),
  };
}

export default async function CardPage({ params }: Props) {
  const country = getCountry();
  const co = COUNTRIES[country];
  const [card, cat] = await Promise.all([
    getCardDetail(params.slug),
    getCatalog(),
  ]);
  if (!card) notFound();
  const history = await getProductHistory(card.id);
  const lite = cat.bySlug.get(card.slug);
  const h = lite
    ? headline(lite, country)
    : { kind: "none" as const, cents: null, stores: 0 };
  const siblings = card.number
    ? cat.cards
        .filter((x) => x.number === card.number && x.id !== card.id)
        .sort((a, b) => (b.marketUsd ?? 0) - (a.marketUsd ?? 0))
    : [];
  const fromSet = cat.cards
    .filter(
      (x) =>
        x.setId === card.set.id && x.id !== card.id && x.number !== card.number,
    )
    .sort((a, b) => (b.marketUsd ?? 0) - (a.marketUsd ?? 0))
    .slice(0, 6);
  const title = displayTitle(card);
  const leader = card.cardType === "Leader";
  const stats: { label: string; value: string | number }[] = [];
  if (leader && card.life != null)
    stats.push({ label: "Life", value: card.life });
  else if (card.cost != null) stats.push({ label: "Cost", value: card.cost });
  if (card.power != null)
    stats.push({ label: "Power", value: card.power.toLocaleString("en-US") });
  if (card.counter != null)
    stats.push({
      label: "Counter",
      value: `+${card.counter.toLocaleString("en-US")}`,
    });
  const inMarket = card.offers.filter((o) => o.market === country && o.inStock);
  // "N stores" counts real stores only; the TCGplayer and eBay rows are listings, not stores.
  const inStores = inMarket.filter((o) => isStoreSource(o.source));
  // The buy surfaces (top block, sticky bar, TCGplayer reference) tag their
  // links with the card's own path, like the board's rows ("-card" sub-ids).
  const loc = `/card/${card.slug}`;
  const best = cheapestBuyRow(card.offers, country, loc);
  const tcgHref = affiliateUrl(card.tcgplayerUrl, "tcgplayer", loc);
  const preRelease = isPreRelease(card.set.releasedOn, new Date().toISOString().slice(0, 10));
  // Alert copy promises an email only once a mailer is configured (cached Meta flag).
  const emailOn = (await getEmailStatus()) === "on";
  const noListingAnywhere = !card.offers.some((o) => o.inStock);
  const ebayQuery = cardEbayQuery(card);
  const cardText = card.effect ? (
    <div className="card-surface p-4">
      <p className="rb-eyebrow text-slate-500 mb-2">Card text</p>
      {card.effect.split("\n").map((l, i) => (
        <p
          key={i}
          className="mb-2 text-sm leading-relaxed text-slate-200 last:mb-0"
        >
          {l}
        </p>
      ))}
    </div>
  ) : null;

  const ebayLd = ebayJsonLdOffers(inMarket, co.currency, isoCountry(country));
  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: title,
          sku: card.number ?? String(card.id),
          image: card.hasImage ? cardImage.large(card.id) : undefined,
          brand: { "@type": "Brand", name: "One Piece Card Game" },
          category: "Trading card",
          url: `${SITE_URL}/card/${card.slug}`,
          ...(inMarket.length
            ? {
                offers: {
                  "@type": "AggregateOffer",
                  priceCurrency: co.currency,
                  lowPrice: (
                    Math.min(...inMarket.map((o) => o.priceCents)) / 100
                  ).toFixed(2),
                  highPrice: (
                    Math.max(...inMarket.map((o) => o.priceCents)) / 100
                  ).toFixed(2),
                  offerCount: inMarket.length,
                  availability: "https://schema.org/InStock",
                  ...(ebayLd.length ? { offers: ebayLd } : {}),
                },
              }
            : {}),
        }}
      />
      <Breadcrumbs
        items={[
          { href: "/browse", label: "Cards" },
          { href: `/sets/${card.set.slug}`, label: card.set.name },
          { label: card.name },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ── Art + card text ── */}
        <div className="min-w-0 space-y-4">
          <div className="card-surface p-4">
            <CardArt
              id={card.id}
              hasImage={card.hasImage}
              alt={`${title} — One Piece Card Game`}
              size="large"
            />
          </div>
          {cardText ? <div className="hidden lg:block">{cardText}</div> : null}
        </div>

        {/* ── Header, stats, board ── */}
        <div className="min-w-0 space-y-6">
          <div className="card-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              {card.colors.map((c) => (
                <ColorBadge key={c} color={c} />
              ))}
              <RarityBadge rarity={card.rarity} />
              {card.cardType ? (
                <span className="chip border border-ink-700 bg-ink-850 text-slate-200">
                  {card.cardType}
                </span>
              ) : null}
              <PrintingBadge printing={card.printing} variant={card.variant} />
            </div>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-3xl leading-tight text-white sm:text-4xl">
                  {card.name}
                  {card.variant ? (
                    <span className="block text-lg font-bold text-slate-300 sm:text-xl">
                      {card.variant}
                    </span>
                  ) : null}
                </h1>
                <p className="num mt-1 text-sm text-slate-400">
                  <Link
                    href={`/sets/${card.set.slug}`}
                    className="hover:text-white"
                  >
                    {card.set.name} ({card.set.code})
                  </Link>
                  {card.number ? (
                    <>
                      {" · "}
                      <span className="whitespace-nowrap">{card.number}</span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex gap-2">
                <PriceWatchButton cardId={card.id} slug={card.slug} name={title} variant="responsive" />
                <ShareButton title={`${title} — ${SITE_NAME}`} />
              </div>
            </div>
            <CardTopBuy best={best} country={country} page="card" slug={card.slug} />
            <PriceDropAlertCta
              cardId={card.id}
              slug={card.slug}
              name={title}
              cardPath={loc}
              providers={enabledProviders()}
              unpriced={inMarket.length === 0}
              preorder={preRelease}
              emailOn={emailOn}
            />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Cheapest · {co.place}
                </p>
                <p className="num mt-1 text-xl font-bold text-accent">
                  {h.kind === "listing"
                    ? money(h.cents, country)
                    : h.kind === "reference"
                      ? `≈ ${money(h.cents, country)}`
                      : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  In stock at · {co.code}
                </p>
                <p className="num mt-1 text-xl font-bold text-white">
                  {inStores.length} {inStores.length === 1 ? "store" : "stores"}
                </p>
              </div>
              {stats.slice(0, 2).map((s) => (
                <div key={s.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {s.label}
                  </p>
                  <p className="num mt-1 text-xl font-bold text-white">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* A card from an unreleased set, or one no market stocks: eBay's
              search is the way to buy it (RiftCompare's EbayBuyCta). */}
          {preRelease || noListingAnywhere ? (
            <EbayBuyCta
              query={ebayQuery}
              name={title}
              heading={preRelease ? undefined : `Search eBay for ${title}`}
              preRelease={preRelease}
              source={preRelease ? "card-prerelease" : "card-no-listing"}
              page="card"
              card={card.slug}
            />
          ) : null}

          <p className="text-right text-xs text-slate-400">
            Cheapest first by item price; postage is added at each store&apos;s
            checkout.{" "}
            <Link href="/methodology" className="text-brand-400 hover:underline">
              How we compare prices →
            </Link>
          </p>

          <PriceBoard
            productId={card.id}
            offers={card.offers}
            country={country}
            ebayQuery={ebayQuery}
            page="card"
            id="price-comparison"
            slug={card.slug}
            name={title}
            preRelease={preRelease}
          />
          <CardConversionCta cardId={card.id} slug={card.slug} name={title} />
          {/* Under the comparison, never in it: TCGplayer's market price as a
              reference with its affiliate button, then the card's eBay banner
              and TCGplayer's (ads: hidden for Plus and Premium members). */}
          <TcgMarketPrice marketUsd={card.marketUsd} country={country} href={tcgHref} page="card" card={card.slug} />
          <EbayCardBanner country={country} query={ebayQuery} name={title} page="card" card={card.slug} />
          <TcgplayerBanner country={country} page="card" card={card.slug} />
          {cardText ? <div className="lg:hidden">{cardText}</div> : null}

          <section className="card-surface p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg text-white">Price history</h2>
              <p className="text-xs text-slate-400">
                US dollars · TCGplayer market and the cheapest US listing we
                track
              </p>
            </div>
            <LineChart
              series={[
                {
                  label: "TCGplayer market",
                  color: "#e9b73a",
                  points: history.map((p) => ({ x: p.day, y: p.marketUsd })),
                },
                {
                  label: "Cheapest US listing",
                  color: "#ff6b6b",
                  points: history.map((p) => ({ x: p.day, y: p.lowUsd })),
                  dashed: true,
                },
              ]}
              format={(v) => usd(Math.round(v))}
              empty={`Price history starts ${history[0] ? longDate(history[0].day) : "with the first import"} — the chart draws once there are two days of prices.`}
            />
          </section>

          <InlineSignupPrompt surface="card" title="Get the top deals in your market, free" body="A free account shows Deal Finder's three biggest savings in your market right now, and is how you get Plus or Premium when you want them." />

          <section className="card-surface p-5">
            <h2 className="mb-3 text-lg text-white">Card details</h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {[
                ["Card number", card.number ?? "—"],
                ["Set", `${card.set.name} (${card.set.code})`],
                ["Set type", SET_KINDS[card.set.kind]?.label ?? card.set.kind],
                [
                  "Released",
                  card.set.releasedOn ? longDate(card.set.releasedOn) : "—",
                ],
                [
                  "Rarity",
                  `${rarityLabel(card.rarity)}${card.rarity && card.rarity !== rarityLabel(card.rarity) ? ` (${card.rarity})` : ""}`,
                ],
                ["Printing", card.variant ?? "Standard"],
                ["Card type", card.cardType ?? "—"],
                ["Colour", card.colors.join(" / ") || "—"],
                ...stats.map(
                  (s) => [s.label, String(s.value)] as [string, string],
                ),
                ["Attribute", card.attribute ?? "—"],
                ["Types", card.subtypes.join(", ") || "—"],
                ["Finish", card.finish ?? "—"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-4 border-b border-ink-800 py-1.5"
                >
                  <dt className="text-slate-400">{k}</dt>
                  <dd className="text-right font-medium text-slate-100">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              TCGplayer listing:{" "}
              <a
                href={tcgHref}
                className="underline hover:text-slate-300"
                rel={outboundRel()}
                target="_blank"
                data-retailer="tcgplayer"
                data-page="card"
                data-card={card.slug}
                data-surface="card_details"
              >
                {card.tcgName}
              </a>
            </p>
          </section>
        </div>
      </div>

      {siblings.length ? (
        <section className="mt-10">
          <SectionHeader
            title={`Other printings of ${card.number}`}
            sub={`The same card in other art, finishes and promo releases — priced in ${co.place}.`}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {siblings.slice(0, 12).map((s) => (
              <CardTile
                key={s.id}
                card={s}
                setCode={cat.setById.get(s.setId)?.code ?? ""}
                country={country}
              />
            ))}
          </div>
        </section>
      ) : null}

      {fromSet.length ? (
        <section className="mt-10">
          <SectionHeader
            title={`More from ${card.set.name}`}
            action={
              <Link href={`/sets/${card.set.slug}`} className="btn-ghost">
                Full {card.set.code} list →
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {fromSet.map((s) => (
              <CardTile
                key={s.id}
                card={s}
                setCode={card.set.code}
                country={country}
              />
            ))}
          </div>
        </section>
      ) : null}

      <RecentlyViewed className="mt-10" record={{ slug: card.slug, name: card.name, variant: card.variant, setCode: card.set.code, number: card.number, img: card.hasImage ? cardImage.thumb(card.id) : null }} />

      <section className="mt-10">
        <SectionHeader title="Questions" />
        <Faq
          items={[
            {
              q: `How much is ${title} worth?`,
              a:
                card.marketUsd != null
                  ? `TCGplayer's market price — what it has recently sold for there — is ${usd(card.marketUsd)}. The cheapest listing we track in ${co.place} is ${
                      h.kind === "listing"
                        ? money(h.cents, country)
                        : "not available right now"
                    }. Prices are read twice a day.`
                  : `There is no recent TCGplayer sale to value it on yet. Store listings appear above as soon as a store we track lists it.`,
            },
            {
              q: `Where is the cheapest place to buy ${card.name}${card.variant ? ` (${card.variant})` : ""}?`,
              a: inStores.length
                ? `Right now, ${inStores.sort((a, b) => a.priceCents - b.priceCents)[0] ? "the first row of the comparison above" : ""} — ${inStores.length} ${co.adjective} ${
                    inStores.length === 1 ? "store has" : "stores have"
                  } it in stock, ranked by item price. Postage is added at each store's checkout.`
                : `No ${co.adjective} store we track has it in stock today. Try the eBay search above, or switch market to see other countries.`,
            },
            ...(siblings.length
              ? [
                  {
                    q: `Is this the same card as the other ${card.number} printings?`,
                    a: `Same card for play, different collectible. ${card.number} exists in ${siblings.length + 1} printings on TCGplayer, and they are priced separately because their value differs — often by orders of magnitude for Parallel, Manga and SP art.`,
                  },
                ]
              : []),
          ]}
        />
      </section>
      {best ? (
        <CardStickyBuyBar
          boardId="price-comparison"
          price={money(best.priceCents, country)}
          store={best.label}
          href={best.href}
          retailer={best.retailer}
          ebay={best.ebay}
          page="card"
          slug={card.slug}
          name={title}
          cardId={card.id}
        />
      ) : null}
    </div>
  );
}
