// Pack opening simulator — RiftCompare's /games/pack-sim, for One Piece. The
// dealing, with no React and no data loading, so it can be unit-tested.
//
// THE PACK IS THE BOX EV CALCULATOR'S PACK (lib/pack-composition.ts), and the
// odds are the SAME per-pack rates lib/box-ev.ts derivedRates() gives, so the
// simulator and the calculator never disagree about a set:
//   • 7 commons and 3 uncommons, no card twice in one pack;
//   • the rare slot: a Secret Rare at the SEC rate, a Super Rare at the SR rate,
//     otherwise a Rare (rare + SR + SEC = one rare-or-better card a pack);
//   • the extra slot: a Manga, Treasure, SP, Parallel or Leader at each one's
//     per-pack rate, rarest first, otherwise one more common.
// Bandai publishes no pull rates: every rate is a COMMUNITY ESTIMATE set LOW on
// purpose, and the page says so. A pool this set does not have (no Manga yet,
// say) never pays out; its share falls through to the next card down.

import { derivedRates, poolOf, type PoolCard, type PoolKey } from "./box-ev";
import { PACK_SLOTS } from "./pack-composition";

/** A card as the simulator ships it to the browser: the few fields a revealed card shows. */
export interface SimCard {
  id: number;
  slug: string;
  name: string;
  number: string | null;
  /** TCGplayer US market price (Card.marketUsd), converted in the browser. */
  usdCents: number | null;
  hasImage: boolean;
}

export type SimPools = Partial<Record<PoolKey, SimCard[]>>;

export interface DealtCard extends SimCard {
  pool: PoolKey;
}

/** Group a set's cards into pull pools (promos, reprints, foils and DON!! are not pack pulls). */
export function simPools<T extends PoolCard & SimCard>(cards: readonly T[]): SimPools {
  const out: SimPools = {};
  for (const c of cards) {
    const pool = poolOf(c);
    if (!pool) continue;
    (out[pool] ??= []).push({ id: c.id, slug: c.slug, name: c.name, number: c.number, usdCents: c.usdCents, hasImage: c.hasImage });
  }
  return out;
}

/** Can a pack be dealt from these pools at all? Commons, uncommons and rares are the floor. */
export function canDeal(pools: SimPools): boolean {
  const n = (k: PoolKey) => pools[k]?.length ?? 0;
  return n("Common") >= slot("common") + 1 && n("Uncommon") >= slot("uncommon") && n("Rare") >= 1;
}

const slot = (key: string) => PACK_SLOTS.find((s) => s.key === key)?.count ?? 0;

/** The extra slot's chase pools, rarest first. */
const EXTRA_ORDER: PoolKey[] = ["Manga", "Treasure", "SP", "Parallel", "Leader"];

/** Per-pack rates for these pools, as the Box EV calculator derives them. */
export function simRates(pools: SimPools, packs: number): Record<PoolKey, number> {
  const counts = new Map<PoolKey, number>(Object.entries(pools).map(([k, v]) => [k as PoolKey, v?.length ?? 0]));
  return derivedRates({ counts, packs });
}

/** A small seeded generator (mulberry32), so a test can pin a deal. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(pool: SimCard[] | undefined, taken: Set<number>, rng: () => number): SimCard | null {
  if (!pool?.length) return null;
  const free = pool.filter((c) => !taken.has(c.id));
  const from = free.length ? free : pool;
  const card = from[Math.floor(rng() * from.length)] ?? from[0]!;
  taken.add(card.id);
  return card;
}

/** Pick a pool by cumulative per-pack rate; null when the roll lands past every one. */
function roll(order: PoolKey[], rates: Record<PoolKey, number>, pools: SimPools, rng: () => number): PoolKey | null {
  const r = rng();
  let acc = 0;
  for (const k of order) {
    if (!pools[k]?.length) continue;
    acc += Math.max(0, rates[k] ?? 0);
    if (r < acc) return k;
  }
  return null;
}

/**
 * One pack, in reveal order: commons, uncommons, the extra slot, then the rare
 * slot last (the card a pack is opened for). Returns [] if the set cannot fill
 * a pack yet (see canDeal).
 */
export function dealPack(pools: SimPools, packs: number, rng: () => number = Math.random): DealtCard[] {
  if (!canDeal(pools)) return [];
  const rates = simRates(pools, packs);
  const taken = new Set<number>();
  const out: DealtCard[] = [];
  const add = (pool: PoolKey) => {
    const c = pick(pools[pool], taken, rng);
    if (c) out.push({ ...c, pool });
  };
  for (let i = 0; i < slot("common"); i++) add("Common");
  for (let i = 0; i < slot("uncommon"); i++) add("Uncommon");
  add(roll(EXTRA_ORDER, rates, pools, rng) ?? "Common");
  add(roll(["SecretRare", "SuperRare"], rates, pools, rng) ?? "Rare");
  return out;
}

/** The pack's value in USD cents; an unpriced card counts as nothing, as in the Box EV calculator. */
export function packValueUsdCents(cards: readonly SimCard[]): number {
  return cards.reduce((a, c) => a + (c.usdCents ?? 0), 0);
}

/** The pulls worth calling out: the pack's most valuable card, if it has a price. */
export function bestPull<T extends SimCard>(cards: readonly T[]): T | null {
  let best: T | null = null;
  for (const c of cards) if ((c.usdCents ?? 0) > (best?.usdCents ?? 0)) best = c;
  return best;
}
