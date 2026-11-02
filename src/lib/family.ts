// This site's side of the Compare Empire network (lib/family-network.ts, DECISIONS.md "Sites that grow
// each other", 2026-11-02). Script-side: scripts/family-sync.ts builds OP Compare's own feed from the
// snapshot a job just wrote (SNAPSHOT_LOCAL_DIR) and copies the sister card sites' feeds; both files go
// into that snapshot, which is how the site and the sisters read them. Pages read the cluster file only
// through getFamilyFeeds() in lib/data.ts (six hours, like every snapshot read).
import { freshFromSnapshot, snapOffersOf, snapSealedCatalog } from "./price-snapshot-read";
import { STORES } from "./stores";
import { SITE_URL } from "./site";
import type { FamilyFeed, FamilyItem } from "./family-network";

export const FAMILY_ID = "op" as const;
// Offer sources are "store:<key>" for an independent store (alert-price.ts); eBay and TCGplayer never count.
const STORE_NAME = new Map(STORES.map((s) => [`store:${s.key}`, s.name]));

/** US sealed whose cheapest in-stock store is 10–50% under TCGplayer's market price, and every pre-order's cheapest store. */
export async function familyItems(): Promise<FamilyItem[]> {
  const sealed = (await snapSealedCatalog()).filter((s) => (s.marketUsd ?? 0) >= 1000 || s.presale);
  const offers = await snapOffersOf(sealed.map((s) => s.id));
  const out: FamilyItem[] = [];
  for (const s of sealed) {
    const best = freshFromSnapshot(offers.get(s.id) ?? [])
      .filter((o) => o.market === "US" && o.currency === "USD" && o.inStock && STORE_NAME.has(o.source))
      .sort((a, b) => a.priceCents - b.priceCents)[0];
    if (!best) continue;
    const base = { cluster: "cards" as const, region: "US" as const, title: s.name, url: `${SITE_URL}/sealed/${s.slug}`, image: s.imageUrl, cents: best.priceCents, currency: "USD", store: STORE_NAME.get(best.source)! };
    if (s.presale) {
      out.push({ ...base, kind: "preorder", releaseDate: s.releasedOn });
    } else if (s.marketUsd) {
      const saving = 1 - best.priceCents / s.marketUsd;
      if (saving >= 0.1 && saving <= 0.5) out.push({ ...base, kind: "deal", refCents: s.marketUsd, refLabel: "TCGplayer market price" });
    }
  }
  return out;
}

export function familyLinks(): FamilyFeed["links"] {
  return { US: { deals: `${SITE_URL}/black-friday`, preorders: `${SITE_URL}/preorders` } };
}
