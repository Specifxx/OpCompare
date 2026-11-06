import Link from "next/link";
import { AffiliateDisclosure, PaidLinkTag } from "@/components/AffiliateDisclosure";
import { cardEbayQuery, ebayAffiliateUrl, ebayLabel, ebaySearchUrl, outboundRel } from "@/lib/affiliate";
import { COUNTRIES, type Country } from "@/lib/country";
import { getPriceWatch } from "@/lib/data";
import { money, moneyCode, usd } from "@/lib/format";

// The price watch sections of /black-friday and /cyber-monday (lib/price-watch.ts
// says what each lists and why). Server-rendered: every row, price and eBay link
// is in the HTML a crawler reads. One market per render (the US by default: the
// market that earns), passed in by the page; nothing here reads the visitor.
// Each eBay link is a plain tagged <a> with the data-* attributes the buy-click
// beacon reads, labelled "Paid link". After the deals, never inside them: an
// eBay row is never a store or a deal.

const SECTION = "card p-4 sm:p-5";
const H2 = "text-lg font-bold text-white sm:text-xl";
const SUB = "mt-1 text-xs leading-relaxed text-slate-400";
const ROW = "flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink-800 py-2.5 first:border-t-0";
const EBAY_BTN = "inline-flex min-h-9 items-center rounded-lg bg-[#0064d2]/15 px-3 text-xs font-bold text-[#8ec5ff] transition-colors hover:bg-[#0064d2]/30";

export async function SalePriceWatch({ market, page, source }: { market: Country; page: string; source: string }) {
  const data = await getPriceWatch(market).catch(() => ({ sealed: [], drops: [], graded: [] }));
  const c = COUNTRIES[market];
  const site = ebayLabel(market);
  const hasAny = data.sealed.length + data.drops.length + data.graded.length > 0;

  return (
    <div id="price-watch" className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold">Price watch: sealed boxes, price drops and graded cards ({c.label})</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
          What the high-value end of the {c.adjective} market asks today, each row ending in a live listing on {site}. Asking prices at our last
          check, not sales; an eBay seller is never counted as a store or a deal.
        </p>
      </div>

      {!hasAny && <p className={`${SECTION} text-sm text-slate-400`}>Nothing to watch in {c.place} right now. The sections fill in on their own from the daily store read and the eBay pass.</p>}

      {data.sealed.length > 0 && (
        <section className={SECTION} aria-labelledby="pw-sealed">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="pw-sealed" className={H2}>Sealed boxes: store price beside eBay</h3>
            <PaidLinkTag />
          </div>
          <p className={SUB}>Booster boxes and cases in stock at a {c.adjective} store today, dearest first: the cheapest store we track beside the cheapest eBay listing the daily pass captured. Item prices before postage.</p>
          <ul className="mt-3">
            {data.sealed.map((r) => (
              <li key={r.sealed.id} className={ROW}>
                <div className="min-w-0 flex-1">
                  <Link href={`/sealed/${r.sealed.slug}`} prefetch={false} className="block truncate text-sm font-semibold text-white hover:text-brand-300">{r.sealed.name}</Link>
                  <p className="text-xs text-slate-500">
                    {r.sealed.kind} · {r.sealed.stores[market]} store{r.sealed.stores[market] === 1 ? "" : "s"}
                    {r.sealed.marketUsd != null ? ` · TCGplayer market ${usd(r.sealed.marketUsd)}` : ""}
                  </p>
                </div>
                <div className="num text-right text-sm">
                  <span className="font-extrabold text-white">{money(r.storeCents, market)}</span>
                  <span className="block text-[11px] text-slate-500">cheapest store</span>
                </div>
                {r.ebay ? (
                  <a href={ebayAffiliateUrl(r.ebay.url, source)} target="_blank" rel={outboundRel()} data-retailer={r.ebay.source} data-page={page} data-card={r.sealed.slug} data-surface="price_watch" className={EBAY_BTN}>
                    eBay {money(r.ebay.priceCents, market)}
                  </a>
                ) : (
                  <a href={ebaySearchUrl(market, `One Piece ${r.sealed.name}`, `${source}-sealed-search`)} target="_blank" rel={outboundRel()} data-retailer="ebay_search" data-page={page} data-card={r.sealed.slug} data-surface="price_watch" className={EBAY_BTN}>
                    Search eBay
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.drops.length > 0 && (
        <section className={SECTION} aria-labelledby="pw-drops">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="pw-drops" className={H2}>Biggest price drops this week</h3>
            <PaidLinkTag />
          </div>
          <p className={SUB}>
            The cards whose TCGplayer market price fell furthest over the last seven days (US$5 and up), with the headline eBay listing in {c.place} when the pass has one. The{" "}
            <Link href="/movers" prefetch={false} className="text-brand-300 hover:underline">movers</Link> page has the full lists.
          </p>
          <ul className="mt-3">
            {data.drops.map((d) => (
              <li key={d.card.id} className={ROW}>
                <div className="min-w-0 flex-1">
                  <Link href={`/card/${d.card.slug}`} prefetch={false} className="block truncate text-sm font-semibold text-white hover:text-brand-300">{d.card.name}</Link>
                  <p className="text-xs text-slate-500">{[d.card.number, d.card.variant, d.card.rarity].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="num text-right text-sm">
                  <span className="font-extrabold text-white">{usd(d.card.marketUsd)}</span>
                  <span className="block text-[11px] text-slate-500">
                    <span className="font-semibold text-emerald-400">{Math.round(d.pct)}%</span> in 7 days, TCGplayer market
                  </span>
                </div>
                {d.ebay ? (
                  <a href={ebayAffiliateUrl(d.ebay.url, source)} target="_blank" rel={outboundRel()} data-retailer={`ebay_${market.toLowerCase()}`} data-page={page} data-card={d.card.slug} data-surface="price_watch" className={EBAY_BTN}>
                    eBay {moneyCode(d.ebay.priceCents, d.ebay.currency)}
                  </a>
                ) : (
                  <a href={ebaySearchUrl(market, cardEbayQuery(d.card), `${source}-drop-search`)} target="_blank" rel={outboundRel()} data-retailer="ebay_search" data-page={page} data-card={d.card.slug} data-surface="price_watch" className={EBAY_BTN}>
                    Search eBay
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.graded.length > 0 && (
        <section className={SECTION} aria-labelledby="pw-graded">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="pw-graded" className={H2}>Graded cards live on {site}</h3>
            <PaidLinkTag />
          </div>
          <p className={SUB}>
            The dearest live PSA, BGS and CGC slab for each card, one row per card, from the eBay pass that feeds every card page and the{" "}
            <Link href="/graded" prefetch={false} className="text-brand-300 hover:underline">graded price guide</Link>. Asking prices; a seller sets them.
          </p>
          <ul className="mt-3">
            {data.graded.map((g) => (
              <li key={g.card.id} className={ROW}>
                {g.imageUrl ? (
                  <img src={g.imageUrl} alt={`${g.grade} ${g.card.name}`} width={36} height={48} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-12 w-9 shrink-0 rounded object-cover" />
                ) : (
                  <span className="h-12 w-9 shrink-0 rounded bg-ink-800" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/card/${g.card.slug}`} prefetch={false} className="block truncate text-sm font-semibold text-white hover:text-brand-300">{g.card.name}</Link>
                  <p className="truncate text-xs text-slate-500">
                    <span className="font-semibold text-brand-300">{g.grade}</span>
                    {[g.card.number, g.card.variant].filter(Boolean).map((x) => ` · ${x}`).join("")}
                    {g.card.marketUsd != null ? ` · raw ${usd(g.card.marketUsd)} on TCGplayer` : ""}
                  </p>
                </div>
                <a href={ebayAffiliateUrl(g.url, source)} target="_blank" rel={outboundRel()} data-retailer="ebay_graded" data-page={page} data-card={g.card.slug} data-surface="ebay_graded" className={EBAY_BTN}>
                  {moneyCode(g.priceCents, g.currency)}
                  {g.shippingCents != null && g.shippingCents > 0 ? ` + ${moneyCode(g.shippingCents, g.currency)} post` : ""}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasAny && <AffiliateDisclosure partner="ebay" tight />}
    </div>
  );
}
