import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CardQuickLink from "@/components/CardQuickLink";
import { CardTile } from "@/components/CardTile";
import { SetOwnedProvider, SetOwnedStatus, SetTickLayer } from "@/components/SetOwned";
import { FREE_PORTFOLIO_LIMIT } from "@/lib/free-limits";
import { EbaySearchPanel } from "@/components/EbaySearchPanel";
import { SealedTile } from "@/components/SealedTile";
import { cardEbayQuery, onePieceEbayQuery } from "@/lib/affiliate";
import { Breadcrumbs, InShort, SectionHeader, StatTile } from "@/components/ui";
import { SET_KINDS } from "@/lib/constants";
import { COUNTRIES } from "@/lib/country";
import { getCatalog, getSealedCatalog } from "@/lib/data";
import { int, longDate, money } from "@/lib/format";
import { getCountry } from "@/lib/get-country";
import { withArticle } from "@/lib/filter-chips";
import { median } from "@/lib/selectors";
import { pageOgOwnImage } from "@/lib/og/meta";

type Props = { params: { slug: string }; searchParams: { sort?: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = await getCatalog();
  const s = cat.setBySlug.get(params.slug);
  if (!s) return { title: "Set not found" };
  const t = `${s.name} (${s.code}) Card List & Prices`;
  return {
    title: { absolute: t.length <= 60 ? t : `${s.code} Card List & Prices` },
    description: `Every card in One Piece ${s.name} (${s.code}) with live prices compared across stores in six markets — the full card list, the chase cards and the set's sealed product.`,
    alternates: { canonical: `/sets/${s.slug}` },
    openGraph: pageOgOwnImage(`/sets/${s.slug}`),
  };
}

export default async function SetPage({ params, searchParams }: Props) {
  const country = getCountry();
  const c = COUNTRIES[country];
  const [cat, sealed] = await Promise.all([getCatalog(), getSealedCatalog()]);
  const set = cat.setBySlug.get(params.slug);
  if (!set) notFound();
  const cards = cat.cards.filter((x) => x.setId === set.id);
  const byValue = searchParams.sort !== "number";
  const sorted = [...cards].sort(
    byValue
      ? (a, b) => (b.marketUsd ?? -1) - (a.marketUsd ?? -1)
      : (a, b) =>
          (a.number ?? "~").localeCompare(b.number ?? "~") || a.id - b.id,
  );
  const priced = cards.filter((x) => x.low[country] != null);
  const med = median(priced.map((x) => x.low[country]!));
  const top = [...cards].sort(
    (a, b) => (b.marketUsd ?? 0) - (a.marketUsd ?? 0),
  )[0];
  const setSealed = sealed
    .filter((s) => s.setId === set.id)
    .sort((a, b) => (b.marketUsd ?? 0) - (a.marketUsd ?? 0));
  const marketTotal = cards.reduce((a, x) => a + (x.marketUsd ?? 0), 0);
  const kind = SET_KINDS[set.kind]?.label ?? "Set";
  const future =
    set.releasedOn && set.releasedOn > new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Breadcrumbs
        items={[{ href: "/sets", label: "Sets" }, { label: set.name }]}
      />
      <p className="rb-eyebrow text-slate-500">
        {set.code} · {kind}
      </p>
      <h1 className="mt-1 text-3xl text-white sm:text-4xl">
        {set.name} card list &amp; prices
      </h1>
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-300">
        <p>
          {set.name} ({set.code}){" "}
          {future ? "is listed for release on" : "was released on"}{" "}
          {longDate(set.releasedOn) || "a date not yet announced"}. It has{" "}
          {int(cards.length)} printings on TCGplayer — every rarity and every
          Parallel, Manga, SP and promo version counted separately, because each
          is priced separately.
        </p>
        <p>
          Each card below shows the cheapest in-stock listing we track in{" "}
          {c.place}, in {c.currency}; “≈” marks TCGplayer&apos;s market price
          where no {c.adjective} store has the card. Open a card for every
          store&apos;s price.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Printings"
          value={int(cards.length)}
          sub={`${int(set.sealedCount)} sealed products`}
        />
        <StatTile
          label={`Priced in ${c.code}`}
          value={int(priced.length)}
          sub={
            cards.length
              ? `${Math.round((priced.length / cards.length) * 100)}% have ${withArticle(c.adjective)} listing`
              : undefined
          }
        />
        <StatTile
          label="Median price"
          value={med != null ? money(med, country) : "—"}
          sub="of cards with a listing"
        />
        <StatTile
          label="Most valuable"
          value={top?.marketUsd ? money(top.marketUsd, "US") : "—"}
          sub={
            top ? (
              <CardQuickLink slug={top.slug} className="text-brand-400 hover:underline">
                {top.name}
                {top.variant ? ` (${top.variant})` : ""}
              </CardQuickLink>
            ) : undefined
          }
        />
      </div>

      {marketTotal ? (
        <div className="mt-6">
          <InShort>
            Every printing in {set.code} together is worth about{" "}
            <span className="num font-semibold text-white">
              {money(marketTotal, "US")}
            </span>{" "}
            at TCGplayer&apos;s market prices — and{" "}
            {top?.marketUsd
              ? `${Math.round(((top.marketUsd ?? 0) / marketTotal) * 100)}%`
              : "a large share"}{" "}
            of that is its single most valuable card, {top?.name}. Value in One
            Piece sets sits in a handful of Manga, SP and Parallel arts; most of
            the list costs well under a dollar.
          </InShort>
        </div>
      ) : null}

      <div className="mt-6">
        <EbaySearchPanel
          heading={`${set.name} on eBay`}
          country={country}
          page="set"
          links={[
            ...(["booster", "extra", "premium"].includes(set.kind)
              ? [
                  {
                    label: `${set.code} booster box`,
                    query: onePieceEbayQuery(
                      `${set.name} ${set.code} booster box English`,
                    ),
                  },
                ]
              : []),
            {
              label: `${set.code} singles`,
              query: onePieceEbayQuery(`${set.code} ${set.name}`),
            },
            ...[...cards]
              .sort((a, b) => (b.marketUsd ?? 0) - (a.marketUsd ?? 0))
              .slice(0, 4)
              .map((c) => ({
                label: `${c.name}${c.variant ? ` (${c.variant.split(" · ")[0]})` : ""}`,
                query: cardEbayQuery(c),
              })),
          ]}
        />
      </div>

      {setSealed.length ? (
        <section className="mt-10">
          <SectionHeader title={`${set.code} sealed products`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {setSealed.slice(0, 6).map((s) => (
              <SealedTile
                key={s.id}
                s={s}
                country={country}
                setCode={set.code}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <SectionHeader
          title={`Every ${set.code} card`}
          sub={`${int(cards.length)} printings`}
          action={
            <div className="flex gap-1 rounded-md border border-ink-700 bg-ink-900 p-1 text-sm">
              <Link
                href={`/sets/${set.slug}`}
                className={`rounded px-3 py-1.5 font-semibold ${byValue ? "bg-ink-700 text-white" : "text-slate-400 hover:text-white"}`}
              >
                By value
              </Link>
              <Link
                href={`/sets/${set.slug}?sort=number`}
                className={`rounded px-3 py-1.5 font-semibold ${!byValue ? "bg-ink-700 text-white" : "text-slate-400 hover:text-white"}`}
              >
                By number
              </Link>
            </div>
          }
        />
        {/* The owned overlay (collection-alerts, wave 2): a client island that
            learns the visitor from /api/me; the page reads no session. */}
        <SetOwnedProvider setSlug={set.slug} enabled={!future}>
          <SetOwnedStatus setName={set.name} trackerHref={`/portfolio/sets/${set.slug}`} freeLimit={FREE_PORTFOLIO_LIMIT} />
        <div data-tick-grid className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {sorted.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              setCode={set.code}
              country={country}
            />
          ))}
        </div>
          <SetTickLayer tileIds={sorted.map((c) => c.id)} rowIds={[]} scanKey={byValue ? "value" : "number"} />
        </SetOwnedProvider>
        <p className="mt-6 text-sm text-slate-400">
          Filter this set by colour, rarity or printing in the{" "}
          <Link href={`/browse?set=${set.slug}`} className="text-brand-400 hover:underline">
            card database
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
