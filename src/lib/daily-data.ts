// The Price Duel's card pool (lib/daily.ts), shared by /daily and the
// /embed/daily widget so both show the same puzzle. Reads only the cached
// catalogue loader, at the top level of a render (never inside another cache).
import { getCatalog } from "./data";
import { cardImage } from "./images";
import type { DailyCard } from "./daily";

export async function dailyCards(): Promise<DailyCard[]> {
  const cat = await getCatalog().catch(() => null);
  const cards: DailyCard[] = [];
  for (const c of cat?.cards ?? []) {
    if (!c.hasImage || c.marketUsd == null) continue;
    const set = cat!.setById.get(c.setId)?.name ?? "";
    // Token sets and DON!! cards are filler, not cards anyone collects for a price guess.
    if (/\btokens?\b|\bdon!!/i.test(`${set} ${c.cardType ?? ""}`)) continue;
    cards.push({ id: c.id, slug: c.slug, name: c.name, set, image: cardImage.tile(c.id), cents: Math.round(c.marketUsd * 100) });
  }
  return cards;
}
