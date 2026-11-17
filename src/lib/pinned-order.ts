// No imports on purpose: PriceBoardView is client code (tests/card-isr.test.ts).
/**
 * The pinned marketplace rows in display order (owner, 2026-11-17, final): eBay first, then TCGplayer, then Amazon's "Check" row
 * (`thirdRow`), which follows the last of them.
 */
export function pinnedOrder<T extends { priceCents: number }>(ebay: T | null, tcgplayer: T | null): T[] {
  return [ebay, tcgplayer].filter((o): o is T => o != null);
}

/** The rows' marks. Since 2026-11-12 (owner: "too many colors … all the colored rows") the pinned eBay, Fetch and Amazon rows
 *  carry no outline: their place on top and their "Ad" tag tell them apart. The cheapest row keeps the one mark, a green edge
 *  (green is the colour of money here); it still wins over eBay's when eBay is itself the cheapest. */
export const PIN_OUTLINE = {
  ebay: "",
  fetch: "",
  amazon: "",
  cheapest: "shadow-[inset_3px_0_0_#16a34a]",
} as const;
