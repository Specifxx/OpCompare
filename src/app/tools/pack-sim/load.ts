import { getCatalog, getSealedCatalog, getSealedDetail, type SetLite } from "@/lib/data";
import { MARKETS } from "@/lib/country";
import { affiliateUrl } from "@/lib/affiliate";
import { sourceLabel, storeForSource } from "@/lib/stores";
import { BOOSTER_SET_KINDS, cheapestBoxOffer } from "@/lib/box-ev";
import { PACKS_PER_BOX } from "@/lib/pack-composition";
import { canDeal, simPools, type SimPools } from "@/lib/pack-sim";
import type { BoxEvOffer } from "@/components/BoxEvCalculator";

// What both pack simulator pages read: the sets a pack can be opened from, and
// for ONE set its pull pools and the cheapest real box per market. Every read
// is a cached data.ts loader, called at the top level (never inside another
// cache). Prices are TCGplayer US market (USD), converted in the browser, so
// one render serves every visitor.

export interface SimSet {
  code: string;
  slug: string;
  name: string;
}

export interface SimSetData extends SimSet {
  packs: number;
  pools: SimPools;
  /** market → the cheapest in-stock booster box a tracked store has. */
  offers: Partial<Record<string, BoxEvOffer>>;
}

/** Booster, extra and premium sets already released whose pools can fill a pack, newest first. */
export async function simSets(): Promise<{ sets: SimSet[]; bySlug: Map<string, SetLite> }> {
  const cat = await getCatalog().catch(() => null);
  if (!cat) return { sets: [], bySlug: new Map() };
  const today = new Date().toISOString().slice(0, 10);
  const cardsBySet = new Map<number, typeof cat.cards>();
  for (const c of cat.cards) {
    const list = cardsBySet.get(c.setId) ?? [];
    list.push(c);
    cardsBySet.set(c.setId, list);
  }
  const ok = cat.sets
    .filter((s) => BOOSTER_SET_KINDS.has(s.kind) && s.releasedOn != null && s.releasedOn <= today)
    .filter((s) => canDeal(simPools((cardsBySet.get(s.id) ?? []).map((c) => ({ ...c, usdCents: c.marketUsd })))))
    .sort((a, b) => (b.releasedOn ?? "").localeCompare(a.releasedOn ?? ""));
  return { sets: ok.map((s) => ({ code: s.code, slug: s.slug, name: s.name })), bySlug: new Map(ok.map((s) => [s.slug, s])) };
}

export async function simSetData(slug: string, path: string): Promise<SimSetData | null> {
  const [cat, sealed] = await Promise.all([getCatalog().catch(() => null), getSealedCatalog().catch(() => [])]);
  const set = cat?.setBySlug.get(slug);
  if (!cat || !set) return null;
  const pools = simPools(cat.cards.filter((c) => c.setId === set.id).map((c) => ({ ...c, usdCents: c.marketUsd })));
  if (!canDeal(pools)) return null;

  const boxes = sealed.filter((s) => s.kind === "Booster Box" && s.setId === set.id);
  const packs = boxes.find((b) => b.packCount != null && b.packCount > 1)?.packCount ?? PACKS_PER_BOX;
  const details = await Promise.all(boxes.map((b) => getSealedDetail(b.slug).catch(() => null)));
  const listings = details.flatMap((d) => (d ? d.offers.map((o) => ({ ...o, boxSlug: d.slug })) : []));
  const offers: SimSetData["offers"] = {};
  for (const market of MARKETS) {
    const o = cheapestBoxOffer(listings, market);
    if (!o) continue;
    const retailer = storeForSource(o.source)?.key ?? o.source;
    offers[market] = {
      priceCents: o.priceCents,
      retailer,
      retailerName: sourceLabel(o.source, market),
      href: affiliateUrl(o.url, retailer, path),
      boxSlug: o.boxSlug,
    };
  }
  return { code: set.code, slug: set.slug, name: set.name, packs, pools, offers };
}
