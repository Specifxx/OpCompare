// The loader behind the Black Friday / Cyber Monday pages' one deal list (lib/sale-deals.ts). Candidates are the products the two
// old US lists drew on: the in-stock sealed products that most stores carry, ranked by how far their catalogue low sits under their
// own 30-day typical price (components/RealDrops.tsx's rule), and underMarket() (under TCGplayer's market price). Each candidate's
// offers are read once (getSealedDetail, at most 2 × TAKE reads); its ONE row uses the cheapest store or TCGplayer row a shopper can
// order now (never eBay), and both discounts are measured against that price. Server only.
import { ebaySearchUrl } from "@/lib/affiliate";
import { underMarket } from "@/lib/black-friday";
import type { Country } from "@/lib/country";
import { getHistories, getSealedDetail, type SealedLite } from "@/lib/data";
import { buyRow, marketRows } from "@/lib/quick-view";
import { DROPS_WINDOW_DAYS, rankDrops, realDrop, type RealDrop } from "@/lib/real-drops";
import type { SaleDealRow } from "@/lib/sale-deals";
import { isEbaySource } from "@/lib/stores";

const CANDIDATES = 120;
const TAKE = 48;
const MIN_CENTS = 2000;

export async function saleDealRows(sealed: readonly SealedLite[], market: Country, page: string, source: string): Promise<SaleDealRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const cands = sealed
    .filter((s) => !s.presale && (s.low[market] ?? 0) >= MIN_CENTS && s.stores[market] > 0)
    .sort((a, b) => b.stores[market] - a.stores[market] || (b.low[market] ?? 0) - (a.low[market] ?? 0))
    .slice(0, CANDIDATES);
  const under = market === "US" ? underMarket([...sealed], TAKE) : [];
  const ids = [...new Set([...cands.map((s) => s.id), ...under.map((s) => s.id)])];
  const hist = await getHistories(ids).catch(() => ({}) as Record<number, never[]>);
  const idx = 0; // the US, MARKETS[0] (lib/country.ts): v1 history days carry only it
  const days = (id: number) => (hist[id] ?? []).map((p) => ({ day: p.day, cents: (p.lows ? p.lows[idx] : p.lowUsd) ?? null }));
  const pre: { s: SealedLite; name: string; drop: RealDrop }[] = [];
  for (const s of cands) {
    const drop = realDrop(days(s.id), s.low[market], today);
    if (drop) pre.push({ s, name: s.name, drop });
  }
  const pick = new Map<number, SealedLite>();
  for (const c of rankDrops(pre, TAKE)) pick.set(c.s.id, c.s);
  for (const s of under) pick.set(s.id, s);
  const out: SaleDealRow[] = [];
  for (const s of pick.values()) {
    const detail = await getSealedDetail(s.slug).catch(() => null);
    const best = detail ? marketRows(detail.offers, market).filter((o) => !isEbaySource(o.source))[0] : undefined;
    if (!best) continue;
    const buy = buyRow(best, market, `/${page}`);
    const price = buy.priceCents;
    const d = days(s.id);
    const drop = market === "US" ? realDrop(d, price, today) : null;
    const typical = drop ? { pct: drop.pct, cents: drop.typicalCents, lowest: drop.lowest, sinceDay: drop.sinceDay } : null;
    const m = market === "US" ? s.marketUsd : null;
    const tPct = m && m >= 1000 ? Math.round((1 - price / m) * 100) : null;
    const tcg = m && tPct != null && tPct >= 5 && tPct <= 60 ? { pct: tPct, cents: m } : null;
    if (!typical && !tcg) continue;
    out.push({
      slug: s.slug,
      name: s.name,
      productType: s.kind,
      imageUrl: s.imageUrl,
      preorder: s.presale,
      priceCents: price,
      storeName: buy.label,
      buyHref: buy.href,
      retailer: buy.retailer,
      ebayHref: ebaySearchUrl(market, `One Piece ${s.name}`, `${source}-list`),
      checkedAt: buy.updatedAt,
      packs: s.packCount,
      typical,
      tcg,
      spark: d.filter((x) => x.day < today).slice(-DROPS_WINDOW_DAYS).map((x) => x.cents),
    });
  }
  return out;
}
