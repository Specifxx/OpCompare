// No imports on purpose: PriceBoardView is client code (tests/card-isr.test.ts).
/**
 * The two pinned marketplace rows in display order: eBay always first (owner,
 * 2026-11-06: eBay and Amazon "sit on the very top", eBay first, Amazon second),
 * then TCGplayer. From 2026-10-27 to 2026-11-06 the cheaper of the two led.
 */
export function pinnedOrder<T extends { priceCents: number }>(ebay: T | null, tcgplayer: T | null): T[] {
  return [ebay, tcgplayer].filter((o): o is T => o != null);
}

/** The pinned rows' outlines (owner, 2026-11-06): eBay green, Amazon amber. Inset, so the row keeps its layout. */
export const PIN_OUTLINE = {
  ebay: "outline outline-2 -outline-offset-2 outline-[#16a34a]",
  /** Fetch TCG (2026-11-11): its own row after eBay's, violet so it reads as a marketplace, never the cheapest. */
  fetch: "outline outline-2 -outline-offset-2 outline-[#7c3aed]",
  amazon: "outline outline-2 -outline-offset-2 outline-[#f59e0b]",
  /** The cheapest row (owner, 2026-11-07: "the cheapest listing should also have an outline too"): sky blue, never read as
   *  eBay's green or Amazon's amber; it wins over eBay's when eBay is itself the cheapest. */
  cheapest: "outline outline-2 -outline-offset-2 outline-[#0ea5e9]",
} as const;
