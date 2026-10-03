import type { Metadata } from "next";
import Link from "next/link";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import { BrowseFilters } from "@/components/BrowseFilters";
import { CardTile } from "@/components/CardTile";
import { FormCleaner } from "@/components/FormCleaner";
import { EbaySearchPanel } from "@/components/EbaySearchPanel";
import { cardEbayQuery } from "@/lib/affiliate";
import { mostValuable, newestBoosterSet } from "@/lib/selectors";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs, EmptyState } from "@/components/ui";
import { SORTS, browseHref, parseBrowse, runBrowse, type SearchParams } from "@/lib/browse";
import { COUNTRIES } from "@/lib/country";
import { getCatalog } from "@/lib/data";
import { int } from "@/lib/format";
import { getCountry } from "@/lib/get-country";

export const metadata: Metadata = {
  title: "One Piece Card List — Every Card, Live Prices",
  description:
    "Browse every One Piece Card Game card with live prices compared across stores in the US, Australia, the UK, Singapore, Canada and the EU. Filter by set, colour, rarity, type and printing.",
  alternates: { canonical: "/browse" },
};

export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const country = getCountry();
  const c = COUNTRIES[country];
  const cat = await getCatalog();
  const q = parseBrowse(searchParams);
  const { total, pages, items } = runBrowse(cat.cards, cat.sets, cat.setById, q, country);
  const page = Math.min(q.page, pages);
  const newest = newestBoosterSet(cat.sets);
  const chase = newest ? mostValuable(cat.cards, 6, (x) => x.setId === newest.id) : [];
  const filtered = q.q || q.sets.length || q.colors.length || q.rarities.length || q.types.length || q.printings.length || q.priced || q.min != null || q.max != null;

  return (
    <div className="container-app py-6">
      <Breadcrumbs items={[{ label: "Card database" }]} />
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0">
          {/* One copy of the filters: a CSS-only toggle on phones, always open from lg. */}
          <input type="checkbox" id="filters-toggle" className="peer sr-only" />
          <label htmlFor="filters-toggle" className="btn-ghost w-full cursor-pointer lg:hidden">
            Filters &amp; sort
          </label>
          <div className="mt-3 hidden peer-checked:block lg:mt-0 lg:block">
            <BrowseFilters q={q} sets={cat.sets} country={country} />
            <FormCleaner formId="filters" defaults={{ sort: "value", per: "48" }} />
          </div>
        </aside>
        <div className="min-w-0">
          <h1 className="text-3xl text-white sm:text-4xl">{q.q ? `“${q.q}” — One Piece cards` : "One Piece Card List"}</h1>
          <div className="mt-2 max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-300">
            <p>
              Browse the full list of One Piece Card Game cards and buy for less — every printing, with live prices compared across stores in the US, Australia,
              the UK, Singapore, Canada and the EU to find the cheapest place to buy.
            </p>
            <p>
              A tile&apos;s “from” price is the cheapest in-stock listing we have for that printing in {c.place}, in {c.currency} — the item price, before
              postage. “≈” marks TCGplayer&apos;s market price converted to {c.currency} where no {c.adjective} store has it. Prices are read twice a day.
              Open a card for every store&apos;s price, cheapest first. For every card in one table, see the <Link href="/price-guide" className="link">One Piece price guide</Link>.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              <span className="num font-semibold text-white">{int(total)}</span> cards · page {page} of {pages}
              {filtered ? (
                <>
                  {" · "}
                  <Link href="/browse" className="link">
                    Clear filters
                  </Link>
                </>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <AutoSubmitSelect form="filters" name="per" value={String(q.per)} label="Show" options={[["24", "24"], ["48", "48"], ["100", "100"]]} />
              <AutoSubmitSelect form="filters" name="sort" value={q.sort} label="Sort" options={Object.entries(SORTS) as [string, string][]} />
            </div>
          </div>

          {!filtered && newest ? (
            <div className="mt-4">
              <EbaySearchPanel
                heading={`${newest.name} chase cards on eBay`}
                sub="Live listings for the newest set's most valuable printings, on your own eBay."
                country={country}
                page="browse"
                links={chase.map((c) => ({ label: `${c.name}${c.variant ? ` (${c.variant.split(" · ")[0]})` : ""}`, query: cardEbayQuery(c) }))}
              />
            </div>
          ) : null}

          {items.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {items.map((card, i) => (
                <CardTile key={card.id} card={card} setCode={cat.setById.get(card.setId)?.code ?? ""} country={country} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState title="No cards match those filters">
                Try fewer filters, or <Link href="/browse" className="link">start over</Link>.
              </EmptyState>
            </div>
          )}
          <Pagination page={page} pages={pages} href={(p) => browseHref(searchParams, { page: String(p) })} />
        </div>
      </div>
    </div>
  );
}
