// What the FRONT PAGE features (owner, 2026-11-12): the dearer items, because a click on a
// US$150 booster box or a US$40 chase card earns far more commission than one on a 50c
// common. Cheap items stay searchable, listed and linkable; they are only not featured on the
// home pages and deal shelves. Selection only: store rows inside a product stay in price order.
//
// Cents. US$5 for a card (TCGplayer market; also applied to a deal's buy price in the
// visitor's own currency, roughly: the floor is a featuring cut, not a price claim) and
// US$50 for sealed, so boxes, cases and premium collections lead while packs and starter
// decks do not.
export const FEATURE_CARD_MIN_CENTS = 500;
export const FEATURE_SEALED_MIN_CENTS = 5000;

/** Keep the items at or above the floor; fall back to the full list when fewer than `minKeep` clear it. */
export function dearFirst<T>(xs: T[], cents: (x: T) => number | null | undefined, floor: number, minKeep = 3): T[] {
  const dear = xs.filter((x) => (cents(x) ?? 0) >= floor);
  return dear.length >= minKeep ? dear : xs;
}
