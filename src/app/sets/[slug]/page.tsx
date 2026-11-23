import { ShareButton } from "@/components/ShareButton";
import type { Metadata } from "next";
import { cleanPageNumber } from "@/lib/facets";
import Link from "next/link";
import { notFound } from "next/navigation";
import CardQuickLink from "@/components/CardQuickLink";
import { CardTile } from "@/components/CardTile";
import { SetOwnedProvider, SetOwnedStatus, SetTickLayer } from "@/components/SetOwned";
import { FREE_PORTFOLIO_LIMIT } from "@/lib/free-limits";
import { EbaySearchPanel } from "@/components/EbaySearchPanel";
import { SealedTile } from "@/components/SealedTile";
import { cardEbayQuery, onePieceEbayQuery } from "@/lib/affiliate";
import { ReleaseAlertSlot } from "@/components/ReleaseAlertSlot";
import { PreorderCallout } from "@/components/PreorderCallout";
import { Breadcrumbs, SectionHeader, StatTile } from "@/components/ui";
import { RARITIES, SET_KINDS } from "@/lib/constants";
import { COUNTRIES } from "@/lib/country";
import { getCatalog, getSealedCatalog } from "@/lib/data";
import { int, longDate, money } from "@/lib/format";
import { getCountry } from "@/lib/get-country";
import { withArticle } from "@/lib/filter-chips";
import { median } from "@/lib/selectors";
import { preorderPageFor } from "@/lib/preorders";
import { pageOgOwnImage } from "@/lib/og/meta";
import { BrowseFilters } from "@/components/BrowseFilters";
import { InlineAds } from "@/components/InlineAds";
import { FilterChips } from "@/components/FilterChips";
import { Pagination } from "@/components/Pagination";
import { RelatedGuides } from "@/components/RelatedGuides";
import { SetGridControls } from "@/components/sets/SetGridControls";
import { SetPriceGuide } from "@/components/sets/SetPriceGuide";
import { JsonLd } from "@/components/ui";
import { browseHref, parseBrowse, runBrowse, type SearchParams } from "@/lib/browse";
import { guidesForSet } from "@/lib/content/catalogue-guides";
import { buildCollectionNarrative } from "@/lib/content/collection-narrative";
import { setGuideFacts, setPriceGuideRows } from "@/lib/set-price-guide";
import { SITE_URL } from "@/lib/site";

type Props = { params: { slug: string }; searchParams: SearchParams };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const cat = await getCatalog();
  const s = cat.setBySlug.get(params.slug);
  if (!s) return { title: "Set not found" };
  // Spoiler season (RiftCompare's strongest non-brand searches, "riftbound legacy spoilers"): until release day a set with
  // revealed cards is titled for the spoiler search, with the count of cards revealed so far. Release day turns it back
  // into the card list, at the same URL, so the page keeps what it earned.
  const revealed = cat.cards.filter((c) => c.setId === s.id).length;
  const upcoming = !!s.releasedOn && s.releasedOn > new Date().toISOString().slice(0, 10);
  const spoilers = upcoming && revealed > 0;
  const t = spoilers ? `${s.code} ${s.name} Spoilers: ${revealed} Cards Revealed` : `${s.code} ${s.name} Card List & Prices`;
  const short = spoilers ? `${s.code} Spoilers: ${revealed} Cards Revealed & Prices` : `${s.code} Card List & Prices`;
  // RiftCompare's set template (2026-11-24): list intent first, the count in the first half of the title, because the
  // count is the answer a "card list" searcher checks for. Released sets only; a rung that does not fit 60 characters
  // falls to the one below, and the uncounted titles above stay the floor.
  const counted = !spoilers && revealed > 0
    ? [`${s.code} ${s.name} Card List: All ${revealed} Cards + Prices`, `${s.code} ${s.name} Card List & Prices`, `${s.code} Card List: All ${revealed} Cards + Prices`]
    : [];
  const title = [...counted, t].find((x) => x.length <= 60) ?? short;
  const releasedDesc = `${s.code} ${s.name} card list: all ${revealed} printings with live prices compared across stores in six markets, the chase cards and sealed product. Updated twice a day.`;
  const n = cleanPageNumber(searchParams);
  const suffix = n ? `?page=${n}` : "";
  return {
    title: { absolute: title },
    description: spoilers
      ? `Every ${s.code} ${s.name} card revealed so far (${revealed} and counting), with pre-order prices as stores list them. Releases ${s.releasedOn}; updated as new spoilers land.`
      : revealed > 0 && releasedDesc.length <= 155
        ? releasedDesc
        : `${s.code} ${s.name} card list with live prices compared across stores in six markets: every card, the chase cards and sealed product.`,
    // Clean page 2+ (?page=N alone) is its own page, self-canonical; a filtered or sorted grid is a slice of the same
    // list: noindex, follow (SEO audit, 2026-11-07).
    alternates: { canonical: `/sets/${s.slug}${suffix}` },
    openGraph: pageOgOwnImage(`/sets/${s.slug}${suffix}`),
    ...(Object.keys(searchParams).length && !cleanPageNumber(searchParams) ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function SetPage({ params, searchParams }: Props) {
  const country = getCountry();
  const c = COUNTRIES[country];
  const [cat, sealed] = await Promise.all([getCatalog(), getSealedCatalog()]);
  const set = cat.setBySlug.get(params.slug);
  if (!set) notFound();
  const cards = cat.cards.filter((x) => x.setId === set.id);
  const bq = { ...parseBrowse(searchParams), sets: [set.slug] };
  const grid = runBrowse(cat.cards, cat.sets, cat.setById, { ...bq, per: bq.per }, country);
  const page = Math.min(bq.page, grid.pages);
  const narrative = buildCollectionNarrative({
    kind: "set",
    label: `${set.name} (${set.code})`,
    currency: c.currency,
    place: c.place,
    members: cards.map((x) => ({ name: x.name, priceCents: x.low[country], setCode: set.code, rarity: x.rarity ?? undefined, collectorNumber: x.number ?? undefined })),
    siteMedianCents: median(cat.cards.map((x) => x.low[country]).filter((v): v is number => v != null)),
  });
  const guideRows = setPriceGuideRows(cards, country);
  const facts = setGuideFacts(guideRows);
  // Internal links to the other sets (RiftCompare's "Other Riftbound sets"): newest first, released ones only.
  const withCards = new Set(cat.cards.map((y) => y.setId));
  const otherSets = cat.sets.filter((x) => x.id !== set.id && withCards.has(x.id) && !(x.releasedOn && x.releasedOn > new Date().toISOString().slice(0, 10)));
  const guides = guidesForSet(set.code);
  const setsByCode = Object.fromEntries(cat.sets.flatMap((x) => [[x.slug, `${x.name} (${x.code})`], [x.code.toLowerCase(), `${x.name} (${x.code})`]]));
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
  const today = new Date().toISOString().slice(0, 10);
  const future = set.releasedOn && set.releasedOn > today;
  // An unreleased set with a pre-order board links to it; null from release day on.
  const preorderHref = preorderPageFor(set, today);

  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${set.code} ${set.name} card list & prices`,
    url: page > 1 && !Object.keys(searchParams).some((k) => k !== "page") ? `${SITE_URL}/sets/${set.slug}?page=${page}` : `${SITE_URL}/sets/${set.slug}`,
    description: `Live prices for every ${set.code} ${set.name} card.`,
  };

  // RiftCompare's set template (2026-11-24, the SEO thread's 21 Nov read: OP set pages sit at position ~38, Rift's at
  // ~10): the hero, then the card grid a "card list" searcher came for, then the data-written read-out (about the set,
  // the price guide, how to read its prices), the sealed product, the guides and the other sets, and only then the eBay
  // links and the ad block. The commercial blocks never sit above the page's own content.
  return (
    <div>
      <JsonLd data={collection} />
      <Breadcrumbs
        trail={[{ href: "/sets", name: "Sets" }, { name: set.name }]}
      />
      <p className="rb-eyebrow text-slate-500">
        {set.code} · {kind}
      </p>
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
        {future && cards.length > 0 ? <>{set.name} spoilers: every card revealed so far</> : <>{set.name} card list &amp; prices</>}
      </h1>
      <ShareButton className="mt-3" name={`${set.name} card list & prices`} medium="set" path={`/sets/${set.slug}`} />
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-300">
        <p>
          {set.name} ({set.code}){" "}
          {future ? "is listed for release on" : "was released on"}{" "}
          {longDate(set.releasedOn) || "a date not yet announced"}.{" "}
          {future
            ? `${int(cards.length)} of its cards have been revealed and listed on TCGplayer so far; this list grows as each spoiler is listed, and prices fill in as stores take pre-orders.`
            : `It has ${int(cards.length)} printings on TCGplayer — every rarity and every Parallel, Manga, SP and promo version counted separately, because each is priced separately.`}
        </p>
        <p>
          Each card below shows the cheapest in-stock listing we track in{" "}
          {c.place}, in {c.currency}; “≈” marks TCGplayer&apos;s market price
          where no {c.adjective} store has the card. Open a card for every
          store&apos;s price.
        </p>
        {cards.length > 0 ? (
          <p className="text-sm">
            <Link href={`/sets/${set.slug}/gallery`} className="font-semibold text-brand-400 underline-offset-2 hover:underline">
              Browse the {set.code} card gallery →
            </Link>
            <span className="text-slate-500"> every card on one page, with images</span>
          </p>
        ) : null}
      </div>

      {preorderHref && set.releasedOn ? <PreorderCallout code={set.code} href={preorderHref} releasedOn={set.releasedOn} className="mt-6" /> : null}

      <ReleaseAlertSlot setSlug={set.slug} setName={set.name} releasedOn={set.releasedOn} source="set" className="mt-6 max-w-2xl" />

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

      <section id="cards" className="mt-8 scroll-mt-20">
        <SectionHeader
          title={`Every ${set.code} card`}
          sub={`${int(grid.total)} printings · page ${page} of ${grid.pages}`}
          action={
            <Link href={`/sets/${set.slug}/gallery`} className="btn-ghost">
              Open the gallery →
            </Link>
          }
        />
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <input type="checkbox" id="set-filters-toggle" className="peer sr-only" />
            <label htmlFor="set-filters-toggle" className="btn-ghost w-full cursor-pointer lg:hidden">
              Filters
            </label>
            <div className="mt-3 hidden peer-checked:block lg:mt-0 lg:block">
              <BrowseFilters q={bq} sets={cat.sets} country={country} action={`/sets/${set.slug}`} hide={["set"]} />
            </div>
          </aside>
          <div className="min-w-0">
            <FilterChips basePath={`/sets/${set.slug}`} sets={setsByCode} symbol={c.symbol} adjective={c.adjective} />
            <SetGridControls basePath={`/sets/${set.slug}`} sort={bq.sort} per={bq.per} />
            {/* The owned overlay (collection-alerts, wave 2): a client island that
                learns the visitor from /api/me; the page reads no session. */}
            <SetOwnedProvider setSlug={set.slug} enabled={!future}>
              <SetOwnedStatus setName={set.name} trackerHref={`/portfolio/sets/${set.slug}`} freeLimit={FREE_PORTFOLIO_LIMIT} />
              <div data-tick-grid className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {grid.items.map((card) => (
                  <CardTile key={card.id} card={card} setCode={set.code} country={country} />
                ))}
              </div>
              <SetTickLayer tileIds={grid.items.map((c) => c.id)} rowIds={[]} scanKey={`${bq.sort}:${page}:${grid.items[0]?.id ?? 0}:${grid.items.length}`} />
            </SetOwnedProvider>
            {grid.total === 0 ? <p className="mt-4 rounded-xl border border-ink-700 bg-ink-850 p-6 text-center text-sm text-slate-400">No cards match those filters.</p> : null}
            <Pagination page={page} totalPages={grid.pages} params={searchParams} basePath={`/sets/${set.slug}`} />
          </div>
        </div>
      </section>

      {/* About the set: written from its own rows (lib/content/collection-narrative.ts), open, under the grid, as on
          RiftCompare's set pages. It used to sit folded behind "More about" above the grid. */}
      {narrative.length || marketTotal ? (
        <section aria-label={`About ${set.code}`} className="card-surface mt-10 p-5" data-set-intro>
          <h2 className="text-xl font-extrabold text-white">About {set.code} {set.name} prices</h2>
          <div className="mt-2 max-w-3xl space-y-2.5 text-sm leading-relaxed text-slate-400">
            {narrative.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {marketTotal ? (
              <p>
                Every printing in {set.code} together is worth about{" "}
                <span className="num font-semibold text-white">{money(marketTotal, "US")}</span> at TCGplayer&apos;s market
                prices, and{" "}
                {top?.marketUsd ? `${Math.round(((top.marketUsd ?? 0) / marketTotal) * 100)}%` : "a large share"} of that is
                its single most valuable card, {top?.name}. Value in One Piece sets sits in a handful of Manga, SP and
                Parallel arts; most of the list costs well under a dollar.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mt-10">
        <SetPriceGuide setName={set.name} rows={guideRows} country={country} adjective={c.adjective} currency={c.currency} />
      </div>

      {/* How to read the prices above (RiftCompare's set template): the method, and a middle paragraph only this set
          has (its dearest and cheapest priced cards, the rarity filling its top ten). Released sets only. */}
      {!future && cards.length > 0 ? (
        <section aria-labelledby="set-read-h" className="card-surface mt-10 p-5 sm:p-6">
          <h2 id="set-read-h" className="text-xl font-extrabold text-white">How to read {set.code} prices</h2>
          <div className="mt-2 max-w-3xl space-y-2.5 text-sm leading-relaxed text-slate-400">
            <p>
              Each price on this page is the cheapest in-stock listing we track for that printing in {c.place}, in{" "}
              {c.currency}: the item price, before postage. {int(priced.length)} of {set.code}&apos;s {int(cards.length)}{" "}
              printings have one right now
              {priced.length < cards.length
                ? `; the other ${int(cards.length - priced.length)} show TCGplayer's market price or no price until a seller in ${c.place} lists them in stock`
                : ""}
              . Prices come from two imports a day.
            </p>
            {facts.top ? (
              <p>
                The dearest {set.code} printing in {c.place} right now is {facts.top.name}, at {money(facts.top.priceCents, country)}
                {facts.low ? <>; the cheapest priced one is {facts.low.name}, at {money(facts.low.priceCents, country)}</> : null}.
                {facts.topTenRarity ? (
                  <> {facts.topTenRarity.n} of the ten dearest are {RARITIES[facts.topTenRarity.rarity]?.label ?? facts.topTenRarity.rarity} cards.</>
                ) : null}{" "}
                The price guide lists all {int(guideRows.length)} printings dearest first; the grid above can be re-sorted and
                filtered.
              </p>
            ) : null}
            <p>
              Open any card for every store&apos;s price in {c.place}, cheapest first by item price. To cost a whole
              want-list with each store&apos;s postage, use{" "}
              <Link href="/tools/best-basket" className="text-brand-400 hover:underline">Best Basket</Link>; to weigh buying
              these singles against opening a box, the{" "}
              <Link href="/tools/box-ev" className="text-brand-400 hover:underline">box EV calculator</Link>.
            </p>
          </div>
        </section>
      ) : null}

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

      <RelatedGuides guides={guides} className="card-surface mt-10 p-5" />

      {/* Internal links to the other sets (crawl + UX), as on RiftCompare's set pages. */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-white">Other One Piece sets</h2>
        <div className="flex flex-wrap gap-2">
          {otherSets.map((x) => (
            <Link key={x.id} href={`/sets/${x.slug}`} className="chip border border-ink-700 px-3 py-1.5 text-sm transition-colors hover:border-brand-500">
              {x.code} {x.name}
            </Link>
          ))}
          <Link href="/browse" className="chip border border-ink-700 px-3 py-1.5 text-sm transition-colors hover:border-brand-500">All cards →</Link>
          <Link href="/price-guide" className="chip border border-ink-700 px-3 py-1.5 text-sm transition-colors hover:border-brand-500">All One Piece card prices →</Link>
          <Link href="/sealed" className="chip border border-ink-700 px-3 py-1.5 text-sm transition-colors hover:border-brand-500">Sealed products →</Link>
        </div>
      </section>

      <div className="mt-10">
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
      {/* Ads sit below the page's own content, never above it (2026-11-19, core-update quality pass). */}
      <InlineAds page="set" className="mt-12" />
    </div>
  );
}
