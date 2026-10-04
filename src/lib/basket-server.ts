// The data half of Best Basket (RiftCompare's lib/basket-server.ts, for OP
// Compare). lib/basket.ts is the pure optimiser; this file is every read that
// feeds it.
//
// EGRESS. The listings are NOT a per-request query here: they come from the
// self-cached data.ts loader getBasketListings (one Data Cache entry per
// market and sorted 40-card chunk), so a list priced twice — a re-run after a
// region change, a shared deck — reads the cache, not Postgres. The only
// per-user reads are the member's own: their remembered minimum condition
// (User.basketPrefs, one row, one column) and, once the collection track's
// portfolio is live, the cards they hold (CollectionCard). Both are
// select-limited and uncached, and this module is called only from /api/*
// routes (CLAUDE.md, the accounts exception).
//
// Nothing here swallows a listing error: a failed read used to come back as
// `[]` on RiftCompare, which the optimiser priced as "nothing in stock" — a
// $0.00 plan across 0 stores. The callers answer 503 instead.

import { prisma } from "./db";
import type { Country } from "./country";
import type { BasketCard } from "./basket";
import { meetsMinCondition, parseBasketPrefs, type BasketPrefs, type MinCondition } from "./basket-condition";
import { BASKET_ID_CHUNK, getBasketListings, getCatalog, type BasketListingTuple } from "./data";
import { basketStoreKey } from "./shipping";

export { basketStoreKey };

/**
 * The listings for these cards at this market's stores, one (the cheapest at
 * the floor) per (card, store), keyed by card id string. `allowed` is the
 * basket's store map keys (lib/shipping.ts basketStoresFor) — stores that do
 * not post to the buyer included, so the optimiser can say which of them
 * stocked a card and why it left them out. `minCondition` (Premium's floor,
 * default "any") filters the store's row: OP Compare keeps each store's
 * best-condition copy, so a floor can only drop a row, never swap it for a
 * better copy the store also lists. Throws on failure.
 *
 * `read` is injectable so tests and the deck price watch run can price
 * against fixtures; the routes pass nothing.
 */
export type BasketListingReader = (country: Country, ids: number[]) => Promise<BasketListingTuple[]>;
export async function loadStoreListings(
  cardIds: string[],
  country: Country,
  allowed: string[],
  minCondition: MinCondition = "any",
  read: BasketListingReader = getBasketListings,
): Promise<Map<string, BasketCard["listings"]>> {
  const byCard = new Map<string, BasketCard["listings"]>();
  const ids = [...new Set(cardIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
  if (!ids.length || !allowed.length) return byCard;
  const ok = new Set(allowed);
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += BASKET_ID_CHUNK) chunks.push(ids.slice(i, i + BASKET_ID_CHUNK));
  const rows = (await Promise.all(chunks.map((c) => read(country, c)))).flat();
  const best = new Map<string, { cardId: string; retailer: string; priceCents: number; url: string; condition: string | null }>();
  for (const [productId, source, priceCents, condition, url] of rows) {
    const retailer = basketStoreKey(source);
    if (!retailer || !ok.has(retailer)) continue;
    if (!meetsMinCondition(condition, minCondition)) continue;
    const cardId = String(productId);
    const k = `${cardId}|${retailer}`;
    const prev = best.get(k);
    if (!prev || priceCents < prev.priceCents) best.set(k, { cardId, retailer, priceCents, url, condition });
  }
  for (const r of best.values()) {
    const arr = byCard.get(r.cardId) ?? [];
    arr.push({ retailer: r.retailer, priceCents: r.priceCents, url: r.url, condition: r.condition });
    byCard.set(r.cardId, arr);
  }
  return byCard;
}

/** What a plan line needs to say which card it is: "Monkey.D.Luffy OP01-024 (Parallel)", its slug, set and number. */
export interface BasketCardInfo {
  name: string;
  slug: string | null;
  setCode: string;
  collectorNumber: string;
}

/** "Monkey.D.Luffy OP01-024 (Parallel)": the name a basket line, a deck line or a watch shows. */
export function basketCardName(c: { name: string; number: string | null; variant: string | null }): string {
  return `${c.name}${c.number ? ` ${c.number}` : ""}${c.variant ? ` (${c.variant})` : ""}`;
}

/** Names for card ids from the cached catalogue (no query). Unknown ids are left out. */
export async function cardInfoFor(ids: string[]): Promise<Map<string, BasketCardInfo>> {
  const cat = await getCatalog();
  const out = new Map<string, BasketCardInfo>();
  for (const id of ids) {
    const c = cat.byId.get(Number(id));
    if (!c || c.printing === "don") continue;
    out.set(id, { name: basketCardName(c), slug: c.slug, setCode: cat.setById.get(c.setId)?.code ?? "", collectorNumber: c.number ?? "" });
  }
  return out;
}

// The member's remembered Best Basket choices (User.basketPrefs): one row,
// scoped to the user, one column. Never throws: a failed read is "no prefs".
export async function loadBasketPrefs(userId: string, db: { user: Pick<typeof prisma.user, "findUnique"> } = prisma): Promise<BasketPrefs> {
  try {
    const row = await db.user.findUnique({ where: { id: userId }, select: { basketPrefs: true } });
    return parseBasketPrefs(row?.basketPrefs);
  } catch {
    return {};
  }
}

// Remember the floor a member just chose. Read-merge so a later key survives;
// a no-op when it is already what is stored. Best effort: never fails a run.
export async function saveMinConditionPref(
  userId: string,
  minCondition: MinCondition,
  db: { user: Pick<typeof prisma.user, "findUnique" | "update"> } = prisma,
): Promise<void> {
  try {
    const row = await db.user.findUnique({ where: { id: userId }, select: { basketPrefs: true } });
    const prefs = parseBasketPrefs(row?.basketPrefs);
    if (prefs.minCondition === minCondition) return;
    const existing = row?.basketPrefs && typeof row.basketPrefs === "object" && !Array.isArray(row.basketPrefs) ? (row.basketPrefs as Record<string, unknown>) : {};
    await db.user.update({ where: { id: userId }, data: { basketPrefs: { ...existing, minCondition } } });
  } catch (e) {
    console.error("[basket] saving the minimum condition failed", e);
  }
}

// How many copies of each of these cards the account already holds, for "Skip
// copies I already own". Several rows per card are normal (one per condition
// and foil), hence the sum; 400 rows covers two per card at the 200-card cap.
export async function loadOwnedQty(userId: string, cardIds: string[]): Promise<Map<string, number>> {
  const owned = new Map<string, number>();
  const ids = cardIds.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) return owned;
  const rows = await prisma.collectionCard.findMany({
    where: { userId, cardId: { in: ids } },
    select: { cardId: true, quantity: true },
    take: 400,
  });
  for (const r of rows) owned.set(String(r.cardId), (owned.get(String(r.cardId)) ?? 0) + r.quantity);
  return owned;
}

// ── The binder, for replacement cost ─────────────────────────────────────────
// A CollectionCard row is a card you hold: the "binder" source prices
// REPLACEMENT — what re-buying them would cost today, delivered. A collection
// past MAX_HOLDINGS is priced on its dearest rows (by the catalogue's cheapest
// listing in the market), and the answer says so.
export const MAX_HOLDINGS = 200;
const BINDER_ROW_CAP = 3000;

export interface BinderHolding extends BasketCardInfo {
  cardId: string;
  qty: number;
  valueCents: number;
}

export async function loadBinderHoldings(userId: string, country: Country): Promise<{ wanted: BinderHolding[]; skipped: number; empty: boolean }> {
  const [rows, info] = await Promise.all([
    prisma.collectionCard.findMany({ where: { userId }, select: { cardId: true, quantity: true }, take: BINDER_ROW_CAP }),
    getCatalog(),
  ]);
  const merged = new Map<string, BinderHolding>();
  for (const r of rows) {
    const c = info.byId.get(r.cardId);
    if (!c) continue; // a stale id left by a restore: one bad row must not fail the request
    const id = String(r.cardId);
    const unit = c.low[country] ?? 0;
    const ex = merged.get(id);
    if (ex) {
      ex.qty += r.quantity;
      ex.valueCents += unit * r.quantity;
    } else {
      merged.set(id, {
        cardId: id,
        name: basketCardName(c),
        slug: c.slug,
        setCode: info.setById.get(c.setId)?.code ?? "",
        collectorNumber: c.number ?? "",
        qty: r.quantity,
        valueCents: unit * r.quantity,
      });
    }
  }
  const ranked = [...merged.values()].sort((a, b) => b.valueCents - a.valueCents);
  const wanted = ranked.slice(0, MAX_HOLDINGS);
  return { wanted, skipped: ranked.length - wanted.length, empty: merged.size === 0 };
}
