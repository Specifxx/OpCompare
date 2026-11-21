import { DiscordCta } from "@/components/DiscordCta";
import Link from "next/link";
import { ebaySearchUrl, outboundRel } from "@/lib/affiliate";
import type { Country } from "@/lib/country";
import { getHistories, getSealedDetail, type SealedLite } from "@/lib/data";
import { money } from "@/lib/format";
import { buyRow, marketRows } from "@/lib/quick-view";
import { dropLine, rankDrops, realDrop, type RealDrop } from "@/lib/real-drops";
import { isEbaySource } from "@/lib/stores";

// The Black Friday / Cyber Monday pages' "furthest under their own 30-day price" list (lib/real-drops.ts holds the rules; code red
// plan 2026-11-20, Cyber Week buy sprint). One market per render (the US, as the rest of these pages). Candidates: the 120 in-stock sealed
// products there of 20.00 or more that most stores carry; their daily lows come from the same history bucket files the charts read. The cheapest store or
// TCGplayer row a shopper can order now (never eBay) must sit 10%+ under the product's own 30-day typical low, with the Black Friday
// strip's guards. Every line: that row's buy button and a tagged eBay search, with the buy-click beacon's data-* attributes.

const BTN = "inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-bold transition-colors";
const CANDIDATES = 120;
const MIN_CENTS = 2000;

interface Row {
  s: SealedLite;
  name: string;
  drop: RealDrop;
  buy: ReturnType<typeof buyRow>;
}

async function dropRows(sealed: readonly SealedLite[], market: Country, page: string, take = 10): Promise<Row[]> {
  const today = new Date().toISOString().slice(0, 10);
  const cands = sealed
    .filter((s) => !s.presale && (s.low[market] ?? 0) >= MIN_CENTS && s.stores[market] > 0)
    .sort((a, b) => b.stores[market] - a.stores[market] || (b.low[market] ?? 0) - (a.low[market] ?? 0))
    .slice(0, CANDIDATES);
  const hist = await getHistories(cands.map((s) => s.id)).catch(() => ({}) as Record<number, never[]>);
  const idx = 0; // the US, MARKETS[0] (lib/country.ts): v1 history days carry only it
  const pre: { s: SealedLite; name: string; drop: RealDrop; days: { day: string; cents: number | null }[] }[] = [];
  for (const s of cands) {
    const days = (hist[s.id] ?? []).map((p) => ({ day: p.day, cents: (p.lows ? p.lows[idx] : p.lowUsd) ?? null }));
    const drop = realDrop(days, s.low[market], today);
    if (drop) pre.push({ s, name: s.name, drop, days });
  }
  const out: Row[] = [];
  for (const c of rankDrops(pre, take * 2)) {
    const detail = await getSealedDetail(c.s.slug).catch(() => null);
    const best = detail ? marketRows(detail.offers, market).filter((o) => !isEbaySource(o.source))[0] : undefined;
    const drop = best ? realDrop(c.days, best.priceCents, today) : null;
    if (best && drop) out.push({ s: c.s, name: c.name, drop, buy: buyRow(best, market, page) });
  }
  return rankDrops(out, take);
}

export async function RealDrops({ sealed, market, page, source }: { sealed: readonly SealedLite[]; market: Country; page: string; source: string }) {
  const rows = await dropRows(sealed, market, `/${page}`).catch(() => []);
  if (!rows.length) return null;
  const fmt = (c: number) => money(c, market);
  return (
    <section id="real-drops" className="flex flex-col gap-2">
      <h2 className="text-xl font-bold">Furthest under their own 30-day price today ({market})</h2>
      <p className="text-sm text-slate-400">From our daily price records, with a buy button on every line.</p>
      <ol className="flex flex-col">
        {rows.map((r) => (
          <li key={r.s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink-800 py-2.5 first:border-t-0">
            <Link href={`/sealed/${r.s.slug}`} className="min-w-0 flex-1 basis-48 font-semibold hover:underline">
              {r.name}
              <span className="block text-xs font-normal text-slate-400">{r.s.kind} · {dropLine(r.drop, fmt)}</span>
            </Link>
            <b className="tabular-nums text-lg">{fmt(r.buy.priceCents)}</b>
            <span className="flex shrink-0 gap-2">
              <a href={r.buy.href} target="_blank" rel={outboundRel()} data-retailer={r.buy.retailer} data-page={page} data-card={r.s.slug} data-surface="bf_drops" className={`${BTN} bg-brand-500 text-white hover:bg-brand-400`}>
                Buy at {r.buy.label}
              </a>
              <a href={ebaySearchUrl(market, `One Piece ${r.name}`, `${source}-drops`)} target="_blank" rel={outboundRel()} data-retailer="ebay_search" data-page={page} data-card={r.s.slug} data-surface="bf_drops" className={`${BTN} bg-[#0064d2]/15 text-[#8ec5ff] hover:bg-[#0064d2]/30`}>
                eBay
              </a>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-400">
        The typical price is the median of the product&apos;s cheapest listing on each of the last 30 days we recorded (two weeks of records at least; a day far under
        the rest is left out as a wrong listing, and a product whose records swing more than twofold is not listed). It says what listings asked on those days, not
        what they will charge next. Item prices before shipping. The eBay button is a paid link.
      </p>
      {/* Cyber Weekend (2026-11-21): the Discord hub posts these drops as they happen. */}
      <DiscordCta className="mt-4" />
    </section>
  );
}
