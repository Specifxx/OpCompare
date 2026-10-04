// "What would it cost to buy this collection again?" — the INTERIM answer,
// before the tools track's Best Basket (lib/basket.ts planBasket) is on main.
//
// RiftCompare runs its Best-Basket optimiser over the binder, so delivery is
// charged once per store and free past a store's threshold. OP Compare's port
// of that optimiser lands with the tools track; until the integrator swaps it in
// (wave2-plan track 4 item 5), /api/portfolio/replacement prices each held copy
// at its cheapest in-stock listing at a real store (or TCGplayer) in the
// visitor's market and says plainly that the figure is BEFORE POSTAGE. Never
// eBay: its postage is per listing and it is never a basket store (CLAUDE.md).
//
// Pure, so tests/portfolio-replacement-cost.test.ts runs it on fixtures.

export interface ReplacementListing {
  source: string; // "store:<key>" | "tcgplayer"
  storeName: string;
  priceCents: number;
  url: string;
}

export interface ReplacementWant {
  cardId: number;
  name: string;
  slug: string;
  qty: number;
  /** What these copies contribute to the headline value (condition-adjusted). */
  valueCents: number;
}

export interface ReplacementLine {
  cardId: number;
  name: string;
  slug: string;
  qty: number;
  unitCents: number;
  url: string;
}

export interface ReplacementStore {
  key: string;
  name: string;
  lines: ReplacementLine[];
  subtotalCents: number;
}

export interface ReplacementPlan {
  stores: ReplacementStore[];
}

export interface ReplacementResult {
  /** Item total of every copy in stock somewhere, before postage. */
  totalCents: number;
  shippingCents: 0;
  topUpCents: 0;
  savedCents: 0;
  storeCount: number;
  requested: number; // copies asked for
  covered: number; // copies in stock somewhere
  beforePostage: true;
  plan: ReplacementPlan;
}

/**
 * Each wanted copy at its cheapest eligible listing (ties go to the store
 * already used most, so the split does not scatter for nothing). A card with no
 * listing is left out of the total and counted as not covered.
 */
export function cheapestSplit(wanted: readonly ReplacementWant[], listings: ReadonlyMap<number, readonly ReplacementListing[]>): ReplacementResult {
  const byStore = new Map<string, ReplacementStore>();
  let requested = 0;
  let covered = 0;
  let total = 0;
  for (const w of wanted) {
    requested += w.qty;
    const ls = (listings.get(w.cardId) ?? []).filter((l) => l.priceCents > 0 && !l.source.startsWith("ebay"));
    if (!ls.length) continue;
    const best = [...ls].sort((a, b) => a.priceCents - b.priceCents || (byStore.get(b.source)?.lines.length ?? 0) - (byStore.get(a.source)?.lines.length ?? 0) || a.source.localeCompare(b.source))[0];
    const s = byStore.get(best.source) ?? byStore.set(best.source, { key: best.source, name: best.storeName, lines: [], subtotalCents: 0 }).get(best.source)!;
    s.lines.push({ cardId: w.cardId, name: w.name, slug: w.slug, qty: w.qty, unitCents: best.priceCents, url: best.url });
    s.subtotalCents += best.priceCents * w.qty;
    total += best.priceCents * w.qty;
    covered += w.qty;
  }
  const stores = [...byStore.values()].sort((a, b) => b.subtotalCents - a.subtotalCents);
  return {
    totalCents: total,
    shippingCents: 0,
    topUpCents: 0,
    savedCents: 0,
    storeCount: stores.length,
    requested,
    covered,
    beforePostage: true,
    plan: { stores },
  };
}

/** What a non-Premium response may carry: the aggregate, never store names, lines or links. */
export function replacementPreview(r: ReplacementResult): Omit<ReplacementResult, "plan"> {
  const { plan: _plan, ...rest } = r;
  void _plan;
  return rest;
}
