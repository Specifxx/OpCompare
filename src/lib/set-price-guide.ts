// Rows for a set page's "#price-guide" table (RiftCompare's lib/set-price-guide.ts):
// every card of the set, dearest first, each with its cheapest in-stock price in
// the page's market. Pure: the page hands in the cards it already read.
import type { Country } from "./country";
import type { CardLite } from "./data";

export interface SetPriceGuideRow {
  id: number;
  slug: string;
  /** Name with the printing, so two printings of one card can be told apart. */
  name: string;
  rarity: string | null;
  number: string | null;
  /** Cheapest in-stock listing in the market, cents; null = no live listing. */
  priceCents: number | null;
  /** In-stock stores in that market (never eBay). */
  stores: number;
}

/** Every card, dearest first; cards with no live price last, by card number. */
export function setPriceGuideRows(cards: readonly CardLite[], country: Country): SetPriceGuideRow[] {
  const rows = cards.map(
    (c): SetPriceGuideRow => ({
      id: c.id,
      slug: c.slug,
      name: `${c.name}${c.variant ? ` (${c.variant})` : ""}`,
      rarity: c.rarity,
      number: c.number,
      priceCents: c.low[country],
      stores: c.stores[country],
    }),
  );
  return rows.sort((a, b) => {
    if (a.priceCents != null && b.priceCents != null) return b.priceCents - a.priceCents || a.name.localeCompare(b.name) || a.id - b.id;
    if (a.priceCents != null) return -1;
    if (b.priceCents != null) return 1;
    return (a.number ?? "~").localeCompare(b.number ?? "~", "en", { numeric: true }) || a.id - b.id;
  });
}

export interface SetGuideFacts {
  /** The dearest priced card. */
  top: { name: string; priceCents: number } | null;
  /** The cheapest priced card, when there are two or more. */
  low: { name: string; priceCents: number } | null;
  /** The rarity that fills at least five of the ten dearest, when ten are priced. */
  topTenRarity: { rarity: string; n: number } | null;
}

/**
 * The facts only this set has, for "How to read <set> prices" (RiftCompare's set
 * template, lib/set-view.ts): a sentence that reads the same on every set page is
 * template chrome, so the middle paragraph is built from these. Pure; reads the rows
 * setPriceGuideRows already made (dearest first).
 */
export function setGuideFacts(rows: readonly SetPriceGuideRow[]): SetGuideFacts {
  const priced = rows.filter((r): r is SetPriceGuideRow & { priceCents: number } => r.priceCents != null);
  const fact = (r: (typeof priced)[number] | undefined) => (r ? { name: r.name, priceCents: r.priceCents } : null);
  const tally = new Map<string, number>();
  for (const r of priced.slice(0, 10)) if (r.rarity) tally.set(r.rarity, (tally.get(r.rarity) ?? 0) + 1);
  const [rarity, n] = [...tally].sort((x, y) => y[1] - x[1])[0] ?? [null, 0];
  return {
    top: fact(priced[0]),
    low: priced.length > 1 ? fact(priced[priced.length - 1]) : null,
    topTenRarity: rarity && priced.length >= 10 && n >= 5 ? { rarity, n } : null,
  };
}
