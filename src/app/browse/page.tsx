import { InlineAds } from "@/components/InlineAds";
import { FamilySearch } from "@/components/FamilySearch";
import type { Metadata } from "next";
import Link from "next/link";
import { ReadMore } from "@/components/ReadMore";
import { SortSelect } from "@/components/SortSelect";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { BrowseFilters } from "@/components/BrowseFilters";
import { FilterChips } from "@/components/FilterChips";
import { CardTile } from "@/components/CardTile";
import { FormCleaner } from "@/components/FormCleaner";
import { EbayBuyCta } from "@/components/EbayBuyCta";
import { EbaySearchPanel } from "@/components/EbaySearchPanel";
import { cardEbayQuery } from "@/lib/affiliate";
import { mostValuable, newestBoosterSet } from "@/lib/selectors";
import { Pagination } from "@/components/Pagination";
import { InlineSignupPrompt } from "@/components/InlineSignupPrompt";
import { Breadcrumbs } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  SORTS,
  browseHref,
  parseBrowse,
  runBrowse,
  type SearchParams,
} from "@/lib/browse";
import { COUNTRIES } from "@/lib/country";
import { getCatalog, getSealedCatalog } from "@/lib/data";
import { SealedTile } from "@/components/SealedTile";
import { searchSealed, wantsSealed } from "@/lib/sealed-query";
import { int, money } from "@/lib/format";
import { headline } from "@/lib/price";
import { getCountry } from "@/lib/get-country";
import { pageOg } from "@/lib/og/meta";
import { cleanPageNumber } from "@/lib/facets";
import { suggestNames } from "@/lib/search";
import { SearchOutcome } from "@/components/SearchOutcome";

const BROWSE_TITLE = "One Piece Card List — Every Card, Live Prices";

// Clean page 2+ (?page=N alone) is its own indexable page; any filter, sort or search is noindex, follow on /browse.
export function generateMetadata({ searchParams }: { searchParams: SearchParams }): Metadata {
  const n = cleanPageNumber(searchParams);
  const suffix = n ? `?page=${n}` : "";
  const filtered = !n && Object.keys(searchParams).some((k) => searchParams[k] !== undefined);
  return {
    title: n ? `${BROWSE_TITLE} (page ${n})` : BROWSE_TITLE,
    description:
      "One Piece card list: every card with live prices compared across stores in six markets. Filter by set, colour, rarity, type and printing.",
    alternates: { canonical: `/browse${suffix}` },
    openGraph: pageOg(`/browse${suffix}`),
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const country = getCountry();
  const c = COUNTRIES[country];
  const [cat, sealedCat] = await Promise.all([getCatalog(), getSealedCatalog()]);
  const asked = parseBrowse(searchParams);
  let q = asked;
  // SEALED PRODUCTS FOR THE SAME WORDS (owner, 2026-11-26: "you can't search any sealed products"; RiftCompare's /browse does
  // this). Enter in the header box lands here, so "OP13 booster box" or "starter deck" shows the products, not "Nothing matches".
  // A plain text search's first page only, and only while no card-only filter is ticked; the full list is /sealed?q=.
  const cardOnly = asked.sets.length || asked.colors.length || asked.rarities.length || asked.types.length || asked.printings.length || asked.min != null || asked.max != null;
  const sealedFound =
    asked.q && asked.page === 1 && !cardOnly
      ? searchSealed(sealedCat, asked.q, {
          country,
          setReleased: (id) => (id != null ? cat.setById.get(id)?.releasedOn ?? undefined : undefined),
          setTextOf: (id) => {
            const set = id != null ? cat.setById.get(id) : undefined;
            return set ? `${set.code} ${set.name}` : undefined;
          },
        })
      : [];
  let res = runBrowse(cat.cards, cat.sets, cat.setById, q, country);
  // Typo-tolerant search (owner, 2026-11-23 UX review, P0 5: "charizrd" returned nothing): a search that matches no card is
  // answered with the nearest real card name (suggestNames, the box's "Did you mean"), said out loud above the grid.
  let fixedFrom: string | null = null;
  if (asked.q && res.total === 0 && sealedFound.length === 0) {
    const [best] = suggestNames(cat.cards.map((x) => x.name), asked.q, 1);
    if (best) {
      const retry = runBrowse(cat.cards, cat.sets, cat.setById, { ...asked, q: best }, country);
      if (retry.total > 0) {
        fixedFrom = asked.q;
        q = { ...asked, q: best };
        res = retry;
      }
    }
  }
  const { total, pages, items } = res;
  const sealedLead = sealedFound.length > 0 && (wantsSealed(asked.q) || total === 0);
  const sealedShown = sealedFound.slice(0, sealedLead ? 8 : 3);
  // Nothing at all: the most valuable cards instead of a dead end (P2 18).
  const popular = asked.q && total === 0 && sealedFound.length === 0 ? mostValuable(cat.cards, 8) : [];
  const page = Math.min(q.page, pages);
  const newest = newestBoosterSet(cat.sets);
  const chase = newest
    ? mostValuable(cat.cards, 6, (x) => x.setId === newest.id)
    : [];
  const filtered =
    q.q ||
    q.sets.length ||
    q.colors.length ||
    q.rarities.length ||
    q.types.length ||
    q.printings.length ||
    q.priced ||
    q.min != null ||
    q.max != null;

  return (
    <div>
      <Breadcrumbs trail={[{ name: "Card database" }]} />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
          {q.q ? `“${q.q}” — One Piece cards and sealed` : "One Piece Card List"}
        </h1>
        <div className="mt-2 max-w-[65ch] space-y-3 text-[15px] leading-relaxed text-slate-300">
          <p>
            Browse the full list of One Piece Card Game cards and buy for less
            — every printing, with live prices compared across stores in the
            US, Australia, the UK, Singapore, Canada and the EU to find the
            cheapest place to buy.
          </p>
          <ReadMore label="How these prices work">
            <p>
              A tile&apos;s “from” price is the cheapest in-stock listing we
              have for that printing in {c.place}, in {c.currency} — the item
              price, before postage. “≈” marks TCGplayer&apos;s market price
              converted to {c.currency} where no {c.adjective} store has it.
              Prices are read twice a day. Open a card for every store&apos;s
              price, cheapest first. For every card in one table, see the{" "}
              <Link href="/price-guide" className="text-brand-400 hover:underline">
                One Piece price guide
              </Link>
              .
            </p>
          </ReadMore>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0">
          {/* One copy of the filters: a CSS-only toggle on phones, always open from lg. */}
          <input type="checkbox" id="filters-toggle" className="peer sr-only" />
          <label
            htmlFor="filters-toggle"
            className="btn-ghost w-full cursor-pointer lg:hidden"
          >
            Filters &amp; sort
          </label>
          <div className="mt-3 hidden peer-checked:block lg:mt-0 lg:block">
            <BrowseFilters q={q} sets={cat.sets} country={country} />
            <FormCleaner
              formId="filters"
              defaults={{ sort: "value", per: "48" }}
            />
          </div>
        </aside>
        <div className="min-w-0">
          <FilterChips
            sets={Object.fromEntries(cat.sets.flatMap((s) => [[s.slug, `${s.name} (${s.code})`], [s.code.toLowerCase(), `${s.name} (${s.code})`]]))}
            symbol={c.symbol}
            adjective={c.adjective}
          />
          <div id="results" className="mt-3 flex scroll-mt-24 flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              <span className="num font-semibold text-white">{int(total)}</span>{" "}
              cards{total > 0 ? ` · page ${page} of ${pages}` : ""}
              {sealedFound.length ? (
                <>
                  {" · "}
                  <span className="num font-semibold text-white">{int(sealedFound.length)}</span> sealed
                </>
              ) : null}
              {filtered ? (
                <>
                  {" · "}
                  <Link href="/browse" className="text-brand-400 hover:underline">
                    Clear filters
                  </Link>
                </>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <PageSizeSelect size={q.per} />
              <SortSelect defaultSort="value" options={Object.entries(SORTS).map(([value, label]) => ({ value, label }))} />
            </div>
          </div>

          {asked.q ? <SearchOutcome query={asked.q} fixedTo={fixedFrom ? q.q : null} results={total + sealedFound.length} template="browse" /> : null}
          {fixedFrom ? (
            <p className="mt-3 text-sm text-slate-300" data-search-fixed="">
              Showing results for <b className="text-white">{q.q}</b>. No card matches “{fixedFrom}”.
            </p>
          ) : null}

          {/* A visitor who typed a search has said what they want: eBay's
              search for those words sits by the count (RiftCompare). Their
              words, so "Search eBay for “q”", never "Buy q". */}
          {q.q && total > 0 ? (
            <EbayBuyCta
              query={q.q}
              freeText
              compact
              source="browse-search"
              page="browse"
              className="mt-4"
            />
          ) : null}

          {!filtered && newest ? (
            <div className="mt-4">
              <EbaySearchPanel
                heading={`${newest.name} chase cards on eBay`}
                sub="Live listings for the newest set's most valuable printings, on your own eBay."
                country={country}
                page="browse"
                links={chase.map((c) => ({
                  label: `${c.name}${c.variant ? ` (${c.variant.split(" · ")[0]})` : ""}`,
                  query: cardEbayQuery(c),
                }))}
              />
            </div>
          ) : null}

          {sealedShown.length ? (
            <section className="mt-4" aria-label="Sealed products" data-browse-sealed="">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-bold text-white">
                  Sealed products <span className="num text-sm font-normal text-slate-400">· {int(sealedFound.length)}</span>
                </h2>
                <Link href={`/sealed?q=${encodeURIComponent(asked.q)}`} prefetch={false} className="text-sm font-medium text-brand-400 hover:underline">
                  {sealedFound.length > sealedShown.length ? `See all ${int(sealedFound.length)} sealed →` : "Filter sealed →"}
                </Link>
              </div>
              {sealedLead ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {sealedShown.map((s) => (
                    <SealedTile key={s.id} s={s} country={country} setCode={s.setId ? cat.setById.get(s.setId)?.code : null} />
                  ))}
                </div>
              ) : (
                // A card search ("luffy") keeps its cards on the first screen: three compact rows, not a grid of boxes.
                <ul className="mt-2 divide-y divide-ink-800 overflow-hidden rounded-lg border border-ink-800">
                  {sealedShown.map((s) => {
                    const h = headline(s, country);
                    return (
                      <li key={s.id}>
                        <Link href={`/sealed/${s.slug}`} prefetch={false} className="flex items-center gap-3 px-3 py-2 hover:bg-ink-800/60">
                          {s.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.imageUrl.replace("_in_1000x1000", "_200w")} alt={s.name} loading="lazy" className="h-10 w-10 shrink-0 rounded-sm bg-white/95 object-contain" />
                          ) : (
                            <span className="h-10 w-10 shrink-0 rounded-sm bg-ink-800" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-100">{s.name}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {[s.setId ? cat.setById.get(s.setId)?.code : null, s.kind].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <span className="num shrink-0 text-sm font-semibold text-accent">
                            {h.cents == null ? "—" : `${h.kind === "reference" ? "≈ " : ""}${money(h.cents, country)}`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {items.length && sealedLead ? <h2 className="mt-6 text-base font-bold text-white">Cards</h2> : null}
            </section>
          ) : null}

          {items.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {items.map((card, i) => (
                <CardTile
                  key={card.id}
                  card={card}
                  setCode={cat.setById.get(card.setId)?.code ?? ""}
                  country={country}
                  priority={i < 4}
                />
              ))}
            </div>
          ) : sealedShown.length ? null : (
            <div className="mt-6">
              {q.q ? (
                <EmptyState
                  icon="browse"
                  title={`Nothing matches “${q.q}” yet`}
                  body="Check the spelling, or try a card name or number such as Luffy or OP01-001. Sealed boxes and decks have their own page."
                  primary={{ href: "/browse", label: "See every card" }}
                  secondary={{ href: "/sealed", label: "Sealed products" }}
                />
              ) : (
                <EmptyState icon="browse" title="No cards match those filters" body="Try fewer filters, or start over." primary={{ href: "/browse", label: "Start over" }} />
              )}
              {popular.length ? (
                <section className="mt-6" aria-label="Popular cards">
                  <h2 className="text-lg text-white">Popular cards right now</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {popular.map((card) => (
                      <CardTile key={card.id} card={card} setCode={cat.setById.get(card.setId)?.code ?? ""} country={country} />
                    ))}
                  </div>
                </section>
              ) : null}
              {/* A search we have no card for (a typo, a set not loaded yet, a
                  product that is not a single) can still be on eBay. */}
              <EbayBuyCta
                className="mt-4"
                {...(q.q ? { query: q.q, freeText: true } : {})}
                source="browse-no-results"
                page="browse"
              />
            </div>
          )}
          <Pagination page={page} totalPages={pages} params={searchParams} basePath="/browse" />
          {/* The same search on the other card-game sites (2026-10-28): a
              Pokémon or Riftbound name typed here finds its own site. */}
          {q.q && <FamilySearch q={q.q} className="mt-6" />}
          <InlineSignupPrompt className="mt-8" surface="browse" title="Find the cheap ones, free" body="A free account shows Deal Finder's three biggest savings in your market right now: real store listings under TCGplayer's market price." />
        </div>
      </div>
      {/* Ads sit below the page's own content, never above it (2026-11-19, core-update quality pass). */}
      <InlineAds page="browse" className="mt-12" />
    </div>
  );
}
