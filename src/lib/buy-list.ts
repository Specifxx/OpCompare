// The Buy List Planner (Premium; RiftCompare's "Best Basket"): given a list of
// cards and sealed products and every live offer for them in ONE market, the
// cheapest single store that stocks the most of the list, and the cheapest way
// to split the order across stores. Pure — tests/buy-list.test.ts pins it.
// Shipping is not modelled: stores' postage differs too much to guess, so the
// page says so instead of pretending.
export interface PlanOffer {
  source: string;
  priceCents: number;
  url: string;
  inStock: boolean;
}
export interface PlanItem {
  slug: string;
  name: string;
  offers: PlanOffer[]; // this market's only
}
export interface PlanPick {
  slug: string;
  name: string;
  priceCents: number;
  url: string;
}
export interface StoreBasket {
  source: string;
  picks: PlanPick[];
  totalCents: number;
}
export interface SingleStore extends StoreBasket {
  missing: string[]; // item names this store doesn't stock
}
export interface BuyPlan {
  split: StoreBasket[];
  splitTotalCents: number;
  single: SingleStore[]; // best first: most items covered, then cheapest
  unavailable: string[]; // item names no store in the market has in stock
}

/**
 * Offers a basket can be built from: real stores and TCGplayer. eBay rows are
 * excluded — every eBay row shares source "ebay", so the planner would offer
 * "buy all 12 from eBay" as one basket when they are 12 sellers with 12 postage
 * charges (RiftCompare's Best Basket prices real-store listings only).
 */
export function isBasketSource(source: string): boolean {
  return !source.startsWith("ebay");
}

export function planBuyList(items: PlanItem[], topStores = 5): BuyPlan {
  const byStore = new Map<string, Map<string, PlanPick>>();
  const split = new Map<string, StoreBasket>();
  const unavailable: string[] = [];
  for (const item of items) {
    const live = item.offers.filter((o) => o.inStock).sort((a, b) => a.priceCents - b.priceCents);
    if (!live.length) {
      unavailable.push(item.name);
      continue;
    }
    for (const o of live) {
      const m = byStore.get(o.source) ?? byStore.set(o.source, new Map()).get(o.source)!;
      if (!m.has(item.slug)) m.set(item.slug, { slug: item.slug, name: item.name, priceCents: o.priceCents, url: o.url });
    }
    const best = live[0];
    const basket = split.get(best.source) ?? split.set(best.source, { source: best.source, picks: [], totalCents: 0 }).get(best.source)!;
    basket.picks.push({ slug: item.slug, name: item.name, priceCents: best.priceCents, url: best.url });
    basket.totalCents += best.priceCents;
  }
  const available = items.filter((i) => !unavailable.includes(i.name));
  const single: SingleStore[] = [...byStore.entries()]
    .map(([source, picks]) => {
      const list = [...picks.values()];
      return {
        source,
        picks: list,
        totalCents: list.reduce((s, p) => s + p.priceCents, 0),
        missing: available.filter((i) => !picks.has(i.slug)).map((i) => i.name),
      };
    })
    .sort((a, b) => b.picks.length - a.picks.length || a.totalCents - b.totalCents)
    .slice(0, topStores);
  const splitList = [...split.values()].sort((a, b) => b.picks.length - a.picks.length || b.totalCents - a.totalCents);
  return { split: splitList, splitTotalCents: splitList.reduce((s, b) => s + b.totalCents, 0), single, unavailable };
}
