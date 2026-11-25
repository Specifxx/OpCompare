import { ebayJsonLdOffers } from "@/lib/board";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LineChart } from "@/components/LineChart";
import { MarketSectionNav } from "@/components/MarketSectionNav";
import { RelatedGuides } from "@/components/RelatedGuides";
import { guidesForCatalogue, setOwnGuides } from "@/lib/content/catalogue-guides";
import { CardMarketsTable } from "@/components/CardMarketsTable";
import { EbayCardPanel } from "@/components/EbayCardPanel";
import { PriceBoard } from "@/components/PriceBoard";
import { SealedTile } from "@/components/SealedTile";
import { TcgMarketPrice } from "@/components/TcgMarketPrice";
import { ShareButton } from "@/components/ShareButton";
import { DropShare } from "@/components/DropShare";
import { SealedWatchButton } from "@/components/SealedWatchButton";
import { Breadcrumbs, Faq, JsonLd, SectionHeader } from "@/components/ui";
import { affiliateUrl, onePieceEbayQuery } from "@/lib/affiliate";
import { COUNTRIES, isoCountry } from "@/lib/country";
import { dropText, priceGap, shareText } from "@/lib/share-link";
import { buyRow, marketRows } from "@/lib/quick-view";
import {
  getCatalog,
  getProductHistory,
  getSealedCatalog,
  getSealedDetail,
} from "@/lib/data";
import { longDate, money, usd } from "@/lib/format";
import { getCountry } from "@/lib/get-country";
import { InlineAds } from "@/components/InlineAds";
import { DiscordCta } from "@/components/DiscordCta";
import { TcgplayerCyberBanner } from "@/components/TcgplayerCyberBanner";
import { AmazonCheck } from "@/components/AmazonCheck";
import { amazonCarriesSealed } from "@/lib/amazon";
import { headline } from "@/lib/price";
import { SealedViewBeacon } from "@/components/SealedViewBeacon";
import { pageOg } from "@/lib/og/meta";
import { isPreRelease } from "@/lib/quick-view";
import { ReleaseAlertSlot } from "@/components/ReleaseAlertSlot";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { isStoreSource } from "@/lib/stores";
import { visitorHistory } from "@/lib/price-history-view";
import { BlackFridayStrip } from "@/components/BlackFridayStrip";
import { bfStripFor } from "@/lib/bf-strip-sealed";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getSealedDetail(params.slug);
  if (!s) return { title: "Product not found" };
  const t = `${s.name} Price`;
  return {
    title: { absolute: t.length <= 60 ? t : `${s.name.slice(0, 50)} Price` },
    description: `${s.name}: live One Piece Card Game sealed prices compared across stores in the US, Australia, the UK, Singapore, Canada and the EU${s.marketUsd ? `. TCGplayer market price ${usd(s.marketUsd)}` : ""}.`,
    alternates: { canonical: `/sealed/${s.slug}` },
    // A product with no offer in any market (and no pre-sale) is an empty page: noindex, still linked (growth report item 7, 2026-11-17).
    ...(s.offers.length === 0 && !s.presale ? { robots: { index: false, follow: true } } : {}),
    // The product shot on TCGplayer's CDN: nothing is generated here. No art: the site default.
    openGraph: pageOg(`/sealed/${s.slug}`, {
      title: `${s.name} | ${SITE_NAME}`,
      ...(s.imageUrl ? { images: [{ url: s.imageUrl, alt: s.name }] } : {}),
    }),
    twitter: { card: "summary_large_image", ...(s.imageUrl ? { images: [s.imageUrl] } : {}) },
  };
}

export default async function SealedDetailPage({ params }: Props) {
  const country = getCountry();
  const co = COUNTRIES[country];
  const [s, cat, all] = await Promise.all([
    getSealedDetail(params.slug),
    getCatalog(),
    getSealedCatalog(),
  ]);
  if (!s) notFound();
  const history = await getProductHistory(s.id);
  const vh = visitorHistory(history, country);
  const lite = all.find((x) => x.id === s.id);
  const h = lite
    ? headline(lite, country)
    : { kind: "none" as const, cents: null, stores: 0 };
  const set = s.setId ? cat.setById.get(s.setId) : undefined;
  const inMarket = s.offers.filter((o) => o.market === country && o.inStock);
  // "N stores" counts real stores only; the TCGplayer and eBay rows are listings, not stores.
  const inStores = inMarket.filter((o) => isStoreSource(o.source));
  const perPack =
    s.packCount && s.packCount > 1 && h.cents != null
      ? Math.round(h.cents / s.packCount)
      : null;
  const sameSet = all
    .filter(
      (x) => x.setId === s.setId && x.id !== s.id && x.kind !== "Promo Pack",
    )
    .slice(0, 6);
  const sameKind = all
    .filter((x) => x.kind === s.kind && x.id !== s.id && x.setId !== s.setId)
    .sort((a, b) =>
      (
        b.releasedOn ??
        cat.setById.get(b.setId ?? 0)?.releasedOn ??
        ""
      ).localeCompare(
        a.releasedOn ?? cat.setById.get(a.setId ?? 0)?.releasedOn ?? "",
      ),
    )
    .slice(0, 6);
  const ebayQ = onePieceEbayQuery(
    `${s.name.replace(/\s+-\s+/, " ")} English`,
  ).replace(/\bbooster box\b/i, "booster (box,display)");

  // The Black Friday strip (lib/bf-strip-sealed.ts, 2026-11-19), through 1 Dec: facts this page already holds.
  const bf = bfStripFor({
    offers: s.offers,
    country,
    currentCents: h.kind === "listing" ? h.cents : null,
    history: vh.low.points,
    presale: s.presale,
    releasedOn: s.releasedOn ?? set?.releasedOn ?? null,
    name: s.name,
    slug: s.slug,
  });
  const ebayLd = ebayJsonLdOffers(inMarket, co.currency, isoCountry(country));
  return (
    <div>
      <SealedViewBeacon slug={s.slug} productId={s.id} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: s.name,
          image: s.imageUrl ?? undefined,
          brand: { "@type": "Brand", name: "One Piece Card Game" },
          url: `${SITE_URL}/sealed/${s.slug}`,
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
                  ...(ebayLd.length ? { offers: ebayLd } : {}),
                },
              }
            : {}),
        }}
      />
      <Breadcrumbs
        trail={[
          { href: "/sealed", name: "Sealed" },
          ...(set ? [{ href: `/sets/${set.slug}`, name: set.name }] : []),
          { name: s.name },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="card-surface h-fit bg-white/95 p-4">
          {s.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.imageUrl}
              alt={`${s.name} — One Piece Card Game sealed product`}
              className="mx-auto aspect-square w-full object-contain"
            />
          ) : (
            <div className="grid aspect-square place-items-center text-sm text-slate-500">
              No image yet
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-6">
          <div className="card-surface p-5">
            <div className="flex flex-wrap gap-2">
              <span className="chip border border-ink-700 bg-ink-850 font-semibold text-slate-200">
                {s.kind}
              </span>
              {set ? (
                <span className="chip border border-ink-700 bg-ink-850 text-slate-300">
                  {set.code}
                </span>
              ) : null}
              {s.presale ? (
                <span className="chip bg-gold/20 font-semibold text-gold">
                  Pre-order
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3 sm:mt-3">
              <div className="min-w-0 flex-[1_1_12rem]">
                <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">
                  {s.name}
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  {set ? (
                    <Link
                      href={`/sets/${set.slug}`}
                      className="hover:text-white"
                    >
                      {set.name}
                    </Link>
                  ) : (
                    "One Piece Card Game"
                  )}
                  {s.releasedOn || set?.releasedOn
                    ? ` · released ${longDate(s.releasedOn ?? set?.releasedOn)}`
                    : ""}
                </p>
              </div>
              {/* min-w-0 on the row and the watch block: at 390px the watch
                  block's note ran to its max-w-xs and pushed the Share button
                  past the screen edge (2026-11-03 phone audit). */}
              <div className="flex min-w-0 items-start gap-2">
                <SealedWatchButton sealedId={s.id} slug={s.slug} name={s.name} className="min-w-0 max-w-xs" />
                <ShareButton responsive name={s.name} medium="sealed" text={shareText(s.name, priceGap(marketRows(s.offers, country).map((o) => ({ priceCents: o.priceCents, retailerName: buyRow(o, country, `/sealed/${s.slug}`).label }))), (c) => money(c, country))} />
              </div>
            </div>
            {(() => {
              const top = marketRows(s.offers, country).find((o) => isStoreSource(o.source));
              return <DropShare path={`/sealed/${s.slug}`} name={s.name} text={dropText(s.name, top ? { priceCents: top.priceCents, retailerName: buyRow(top, country, `/sealed/${s.slug}`).label } : null, COUNTRIES[country].place, (c) => money(c, country))} className="mt-2" />;
            })()}
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
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Per pack
                </p>
                <p className="num mt-1 text-xl font-bold text-white">
                  {perPack ? money(perPack, country) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  TCGplayer market
                </p>
                <p className="num mt-1 text-xl font-bold text-white">
                  {s.marketUsd ? usd(s.marketUsd) : "—"}
                </p>
              </div>
            </div>
          </div>
          {/* Jump links (owner, 2026-11-23 UX review, P1 13: the page is long). Plain anchors in the server HTML. */}
          <MarketSectionNav sections={[{ id: "prices", label: "Prices" }, { id: "history", label: "History" }, { id: "faq", label: "Questions" }]} />
          {bf && <BlackFridayStrip {...bf} />}
          <PriceBoard
            id="prices"
            productId={s.id}
            offers={s.offers}
            country={country}
            ebayQuery={ebayQ}
            page="sealed"
            noun="product"
            slug={s.slug}
            name={s.name}
            image={s.imageUrl ?? null}
            /* Amazon (lib/amazon.ts): a search on the visitor's Amazon, the third pinned row after eBay and TCGplayer
               (owner, 2026-11-03; above the board 2026-10-30 to 2026-11-03). */
            thirdRow={amazonCarriesSealed(s.kind) ? <AmazonCheck country={country} name={s.name} slug={s.slug} /> : undefined}
            preRelease={
              s.presale ||
              isPreRelease(
                s.releasedOn ?? set?.releasedOn ?? null,
                new Date().toISOString().slice(0, 10),
              )
            }
          />
          {/* Fiverr usability review, 2026-11-25: "is this looking at all the pricing, or only the sites you get a commission from?" */}
          <p className="!mt-2 text-xs text-slate-400">
            Every store we track is listed, whether it pays us or not, in price order. <Link href="/methodology" className="underline underline-offset-2 hover:text-slate-100">How we compare</Link>
          </p>
          {/* The price history sits right under the prices (owner, 2026-11-23 UX review, P1 13), above the banners. */}
          <section id="history" className="card-surface scroll-mt-40 p-5 xl:scroll-mt-36">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg text-white">{vh.title}</h2>
              <p className="text-xs text-slate-400">TCGplayer market shown in {vh.currency} at an indicative rate{vh.lowSince && vh.lowDays < history.length ? `; ${co.place} listing history starts ${longDate(vh.lowSince)}` : ""}</p>
            </div>
            <LineChart
              series={[
                { label: `Cheapest ${co.adjective} listing`, color: "#ff6b6b", points: vh.low.points },
                { label: "TCGplayer market (converted)", color: "#e9b73a", points: vh.market.points, dashed: true },
              ]}
              format={(v) => money(Math.round(v), country)}
              empty="The chart draws once there are two days of prices."
            />
          </section>
          {s.presale && set ? <ReleaseAlertSlot setSlug={set.slug} setName={set.name} releasedOn={set.releasedOn} source="sealed" unreleasedOnly /> : null}
          <CardMarketsTable offers={s.offers} name={s.name} country={country} noun="price by market" />
          {/* The Discord hub's restock and price-drop feed, under the comparison (owner, 2026-11-20). */}
          {/* TCGplayer's Cyber Weekend banner (lib/tcgplayer-cyber.ts): under the comparison, 22 Nov to 1 Dec, labelled Ad. */}
          <TcgplayerCyberBanner
            href={affiliateUrl(
              `https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&q=${encodeURIComponent(s.name)}&ProductTypeName=Sealed+Products`,
              "tcgplayer",
              `/sealed/${s.slug}`,
            )}
            at={Date.now()}
            page="sealed"
            slug={s.slug}
            className="mt-4"
          />
          <DiscordCta className="mt-4" />
          {/* TCGplayer's market price: a reference under the comparison, with
              its affiliate button — never a row in it. */}
          <TcgMarketPrice
            marketUsd={s.marketUsd}
            country={country}
            href={affiliateUrl(s.tcgplayerUrl, "tcgplayer", `/sealed/${s.slug}`)}
            page="sealed"
            card={s.slug}
          />
          {/* Listings tab only: no graded slabs for sealed product. */}
          <EbayCardPanel productId={s.id} country={country} query={ebayQ} name={s.name} card={s.slug} page="sealed" sealed preRelease={s.presale || isPreRelease(s.releasedOn ?? set?.releasedOn ?? null, new Date().toISOString().slice(0, 10))} />
        </div>
      </div>
      {sameSet.length ? (
        <section className="mt-10">
          <SectionHeader title={`More ${set?.code ?? ""} sealed`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {sameSet.map((x) => (
              <SealedTile
                key={x.id}
                s={x}
                country={country}
                setCode={set?.code}
              />
            ))}
          </div>
        </section>
      ) : null}
      {sameKind.length ? (
        <section className="mt-10">
          <SectionHeader
            title={`Other ${s.kind.toLowerCase()}s`}
            sub="The same product type from other sets, newest first."
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {sameKind.map((x) => (
              <SealedTile
                key={x.id}
                s={x}
                country={country}
                setCode={x.setId ? cat.setById.get(x.setId)?.code : null}
              />
            ))}
          </div>
        </section>
      ) : null}
      <section id="faq" className="mt-10 scroll-mt-40 xl:scroll-mt-36">
        <SectionHeader title="Questions" />
        <Faq
          items={[
            {
              q: `How much is ${s.name}?`,
              a: `${h.kind === "listing" ? `The cheapest in-stock offer we track in ${co.place} is ${money(h.cents, country)}` : `No ${co.adjective} store we track has it in stock right now`}${
                s.marketUsd
                  ? `; TCGplayer's market price is ${usd(s.marketUsd)}`
                  : ""
              }. Postage is added at each store's checkout.`,
            },
            ...(s.packCount && s.packCount > 1
              ? [
                  {
                    q: "How many packs are inside?",
                    a: `${s.packCount} booster packs.${perPack ? ` At the cheapest ${co.adjective} price that is ${money(perPack, country)} a pack.` : ""}`,
                  },
                ]
              : []),
          ]}
        />
      </section>
      <RelatedGuides
        guides={[...(set ? setOwnGuides(set.code, 1) : []), ...guidesForCatalogue("sealed")].filter((g, i, a) => a.findIndex((x) => x.slug === g.slug) === i).slice(0, 3)}
        className="card-surface mt-10 p-5"
      />
      {/* Ads sit below the page's own content, never above it (2026-11-19, core-update quality pass). */}
      <InlineAds page="sealed" className="mt-12" />
    </div>
  );
}
