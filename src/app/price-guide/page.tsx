import type { Metadata } from "next";
import Link from "next/link";
import CardQuickLink from "@/components/CardQuickLink";
import { Pagination } from "@/components/Pagination";
import { InlineSignupPrompt } from "@/components/InlineSignupPrompt";
import { Breadcrumbs, Delta, StatTile } from "@/components/ui";
import { rarityLabel } from "@/lib/constants";
import { COUNTRIES } from "@/lib/country";
import { getCatalog } from "@/lib/data";
import { int, money, usd } from "@/lib/format";
import { getCountry } from "@/lib/get-country";
import { cardImage } from "@/lib/images";
import { headline, sortPrice } from "@/lib/price";
import { median, releasedSets } from "@/lib/selectors";
import { pageOgOwnImage } from "@/lib/og/meta";
import { GuideBuyLinks } from "./GuideBuyLinks";
import { DATA_TABLE } from "@/components/prose";

export const metadata: Metadata = {
  title: "One Piece Price Guide — Every Card's Price in One Table",
  description:
    "Every One Piece Card Game printing in one sortable table with the cheapest in-stock price in your market, how many stores have it, and its 7-day move.",
  alternates: { canonical: "/price-guide" },
  openGraph: pageOgOwnImage("/price-guide"),
};

type SP = { page?: string; sort?: string; set?: string };
const PER = 100;

export default async function PriceGuidePage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const country = getCountry();
  const c = COUNTRIES[country];
  const cat = await getCatalog();
  const set = searchParams.set
    ? cat.setBySlug.get(searchParams.set)
    : undefined;
  let rows = set ? cat.cards.filter((x) => x.setId === set.id) : cat.cards;
  const sort = searchParams.sort ?? "price";
  rows = [...rows].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "move")
      return (b.change7d ?? -Infinity) - (a.change7d ?? -Infinity);
    if (sort === "stores") return b.stores[country] - a.stores[country];
    return (sortPrice(b, country) ?? -1) - (sortPrice(a, country) ?? -1);
  });
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const page = Math.min(
    Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1),
    pages,
  );
  const slice = rows.slice((page - 1) * PER, page * PER);
  const priced = cat.cards.filter((x) => x.low[country] != null);
  const lows = priced.map((x) => x.low[country]!);
  const med = median(lows);
  const under1 = lows.filter((v) => v < 100).length;
  // Only cards TCGplayer can value: a lone listing with no sales behind it (a
  // serial-numbered print at US$199,999) is not "the dearest card".
  const dearest = [...priced]
    .filter((x) => x.marketUsd != null)
    .sort((a, b) => b.low[country]! - a.low[country]!)[0];
  const sets = releasedSets(cat.sets, ["booster", "extra", "premium"]);
  const href = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = {
      sort: searchParams.sort,
      set: searchParams.set,
      page: undefined as string | undefined,
      ...p,
    };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/price-guide?${s}` : "/price-guide";
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Price guide" }]} />
      <h1 className="text-3xl text-white sm:text-4xl">One Piece Price Guide</h1>
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-300">
        <p>
          Every One Piece Card Game printing in one sortable table, one row per
          printing, each with the cheapest in-stock price we track in your
          market and how many stores have it. A price is the item price from a
          store or TCGplayer seller, with postage added at checkout, and it is
          an asking price on a live listing rather than a record of a sale. We
          read every price twice a day.
        </p>
        <p>
          The 7-day column is TCGplayer&apos;s market price against seven days
          earlier. It stays blank until a card has a week of history. For why
          printings of one card are priced so differently, see{" "}
          <Link href="/cards" className="text-brand-400 hover:underline">
            cards by type &amp; rarity
          </Link>
          .
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Cards listed"
          value={int(cat.cards.length)}
          sub="Every printing has its own row"
        />
        <StatTile
          label={`Priced in ${c.label}`}
          value={int(priced.length)}
          sub={`${Math.round((priced.length / Math.max(1, cat.cards.length)) * 100)}% have a seller in stock`}
        />
        <StatTile
          label="Median price"
          value={med != null ? money(med, country) : "—"}
          sub={
            lows.length
              ? `${Math.round((under1 / lows.length) * 100)}% of priced cards cost under ${c.symbol}1`
              : undefined
          }
        />
        <StatTile
          label="Dearest card"
          value={dearest ? money(dearest.low[country], country) : "—"}
          sub={
            dearest ? (
              <CardQuickLink slug={dearest.slug} className="text-brand-400 hover:underline">
                {dearest.name}
                {dearest.variant ? ` (${dearest.variant})` : ""}{" "}
                {dearest.number}
              </CardQuickLink>
            ) : undefined
          }
        />
      </div>

      <section className="card-surface mt-6 overflow-hidden">
        <div className="border-b border-ink-800 px-5 py-4">
          <h2 className="text-xl text-white">Prices by set</h2>
          <p className="text-sm text-slate-400">
            How each released booster set prices in {c.place}, in {c.currency}.
            A set&apos;s name opens its own price guide.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className={`${DATA_TABLE} min-w-[640px]`}>
            <thead>
              <tr>
                <th>Set</th>
                <th className="text-right">Priced</th>
                <th className="text-right">Median</th>
                <th>Dearest card</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s) => {
                const cs = cat.cards.filter((x) => x.setId === s.id);
                const ps = cs.filter((x) => x.low[country] != null);
                const top = [...ps].sort(
                  (a, b) => b.low[country]! - a.low[country]!,
                )[0];
                return (
                  <tr key={s.id}>
                    <td>
                      <Link
                        href={href({ set: s.slug })}
                        className="font-semibold text-brand-400 hover:underline"
                      >
                        {s.name}
                      </Link>{" "}
                      <span className="text-xs text-slate-500">{s.code}</span>
                    </td>
                    <td className="num text-right text-slate-300">
                      {ps.length}/{cs.length}
                    </td>
                    <td className="num text-right font-semibold text-accent">
                      {money(median(ps.map((x) => x.low[country]!)), country)}
                    </td>
                    <td className="truncate text-slate-200">
                      {top ? (
                        <CardQuickLink
                          slug={top.slug}
                          className="hover:text-brand-400 hover:underline"
                        >
                          {top.name}
                          {top.variant ? ` (${top.variant})` : ""}{" "}
                          <span className="num text-xs text-slate-400">
                            {money(top.low[country], country)}
                          </span>
                        </CardQuickLink>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-surface mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 px-5 py-4">
          <div>
            <h2 className="text-xl text-white">
              {set ? `${set.name} (${set.code}) prices` : "Every card"}
            </h2>
            <p className="text-sm text-slate-400">
              {int(rows.length)} printings · page {page} of {pages}
              {set ? (
                <>
                  {" · "}
                  <Link href="/price-guide" className="text-brand-400 hover:underline">
                    All sets
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 text-sm">
            {[
              ["price", "Price"],
              ["move", "7-day move"],
              ["stores", "Stores"],
              ["name", "Name"],
            ].map(([k, l]) => (
              <Link
                key={k}
                href={href({ sort: k === "price" ? undefined : k })}
                className={`rounded-md border px-3 py-1.5 font-semibold ${sort === k ? "border-brand-500 bg-brand-500/15 text-white" : "border-ink-700 text-slate-300 hover:border-ink-600"}`}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
        {/* One table at every width, never a horizontal scroll: fixed layout,
            so the Card column takes what is left and truncates. Phones show
            Card · Price (7-day under it) · Buy; the rest join as room allows.
            A plain click on a card opens its QuickView. */}
        <div>
          <table className={`${DATA_TABLE} table-fixed`}>
            <thead>
              <tr>
                <th>Card</th>
                <th className="hidden w-32 md:table-cell">Set · No.</th>
                <th className="hidden w-28 xl:table-cell">Rarity</th>
                <th className="w-[5.5rem] text-right sm:w-28">Price ({c.currency})</th>
                <th className="hidden w-16 text-right sm:table-cell">Stores</th>
                <th className="hidden w-20 text-right sm:table-cell">7 days</th>
                <th className="w-[6.5rem] text-right sm:w-40 xl:w-60">Buy</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((x) => {
                const h = headline(x, country);
                return (
                  <tr key={x.id}>
                    <td>
                      <CardQuickLink
                        slug={x.slug}
                        className="group flex min-w-0 items-center gap-3"
                      >
                        {x.hasImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cardImage.thumb(x.id)}
                            alt=""
                            loading="lazy"
                            className="h-10 w-7 shrink-0 rounded-sm bg-ink-800 object-cover"
                          />
                        ) : (
                          <span className="h-10 w-7 shrink-0 rounded-sm bg-ink-800" />
                        )}
                        <span className="min-w-0">
                          <span
                            data-card-name
                            className="block truncate font-semibold text-slate-100 group-hover:text-brand-400 group-hover:underline"
                          >
                            {x.name}
                          </span>
                          {x.variant ? (
                            <span className="block truncate text-xs text-slate-500">
                              {x.variant}
                            </span>
                          ) : null}
                          <span className="num block truncate text-[11px] text-slate-500 md:hidden">
                            {cat.setById.get(x.setId)?.code} · {x.number ?? "—"}
                          </span>
                        </span>
                      </CardQuickLink>
                    </td>
                    <td className="num hidden whitespace-nowrap text-xs text-slate-400 md:table-cell">
                      {cat.setById.get(x.setId)?.code} · {x.number ?? "—"}
                    </td>
                    <td className="hidden text-xs text-slate-300 xl:table-cell">
                      {rarityLabel(x.rarity)}
                    </td>
                    <td className="num whitespace-nowrap text-right font-semibold text-accent">
                      {h.kind === "listing" ? (
                        money(h.cents, country)
                      ) : h.kind === "reference" ? (
                        <span className="text-slate-400">
                          ≈ {money(h.cents, country)}
                        </span>
                      ) : (
                        "—"
                      )}
                      {x.change7d != null ? (
                        <span className="block sm:hidden">
                          <Delta v={x.change7d} className="text-[11px]" />
                        </span>
                      ) : null}
                    </td>
                    <td className="num hidden text-right text-slate-300 sm:table-cell">
                      {x.stores[country] || ""}
                    </td>
                    <td className="hidden text-right sm:table-cell">
                      <Delta v={x.change7d} className="text-xs" />
                    </td>
                    <td className="px-2 text-right">
                      <GuideBuyLinks
                        id={x.id}
                        slug={x.slug}
                        name={x.name}
                        number={x.number}
                        variant={x.variant}
                        tcg={x.marketUsd != null ? usd(x.marketUsd) : null}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-ink-800 px-5 py-3 text-xs leading-relaxed text-slate-500">
          Buy: <span className="text-slate-400">TCGplayer</span> opens the
          card&apos;s TCGplayer page (the figure is its US market price, in US
          dollars); <span className="text-slate-400">eBay</span> searches your
          own eBay for the card. Affiliate links: as an eBay Partner Network
          affiliate and a TCGplayer affiliate, OP Compare earns from qualifying
          purchases — at no extra cost to you.
        </p>
      </section>
      <Pagination
        page={page}
        pages={pages}
        href={(p) => href({ page: p > 1 ? String(p) : undefined })}
      />
      <InlineSignupPrompt className="mt-8" surface="price-guide" title="Track the cards you want, free" body="Heart cards to keep them on your watchlist, and a free account adds Deal Finder's three biggest savings in your market right now." />
    </div>
  );
}
