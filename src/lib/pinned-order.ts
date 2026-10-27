// No imports on purpose: PriceBoardView is client code (tests/card-isr.test.ts).
/**
 * The two pinned marketplace rows in display order (2026-10-27): the cheaper on
 * top, TCGplayer on a tie. Both are the same market's rows, so their prices
 * compare directly. Before, eBay always led, above a cheaper TCGplayer row.
 */
export function pinnedOrder<T extends { priceCents: number }>(ebay: T | null, tcgplayer: T | null): T[] {
  if (ebay && tcgplayer) return tcgplayer.priceCents <= ebay.priceCents ? [tcgplayer, ebay] : [ebay, tcgplayer];
  return [ebay, tcgplayer].filter((o): o is T => o != null);
}
