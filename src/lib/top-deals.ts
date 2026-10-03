// The homepage's "Today's Top Deals" (RiftCompare's lib/top-deals.ts), for the
// visitor's market:
//   • Biggest savings (Plus) — Deal Finder's default "Underpriced vs TCGplayer"
//     ranking, sorted by % (a chase card's modest % would otherwise outrank an
//     everyday card's big one on money alone), 4 rows + the REAL total.
//   • Price drops (free) — biggest 7-day falls in TCGplayer's market price.
//   • Biggest 7-day climbs (free) — RiftCompare's column here is its Rising
//     Cards screener (demand + price timing). OP Compare has no demand signal,
//     so this is honestly what it is: the biggest 7-day rises, and free.
//
// Only the 4 rows per column the homepage can show ever leave the server; the
// Plus gate (1 savings row for non-members) is decided in the browser by
// useMe(), so the page HTML stays the same for everyone. Showing 4 rows to a
// member and 1 to everyone else is the homepage teaser RiftCompare runs; the
// full list stays limited in the query on /tools/deal-finder.
//
// NO CACHE IN THIS FILE: it is an assembly over getDealInputs + getCatalog,
// which cache themselves (tests/nested-cache.test.ts).
import type { Country } from "./country";
import { rankDefaultVsTcg } from "./deal-pages";
import type { CardLite, Catalog } from "./data";
import { headline } from "./price";
import { movers } from "./selectors";

export interface HomeDeal {
  id: number;
  slug: string;
  title: string;
  variant: string | null;
  subtitle: string; // "OP05 · OP05-119"
  hasImage: boolean;
  priceCents: number; // in the market's currency
  approx: boolean; // true when the price is TCGplayer's converted reference (no listing here)
  badge: string; // "Save 31.4%", "−12.0%", "+8.5%"
}

export interface TopDeals {
  country: Country;
  savings: HomeDeal[];
  savingsTotal: number; // every card on the default Deal Finder list today
  drops: HomeDeal[];
  rising: HomeDeal[];
}

const subtitle = (cat: Catalog, c: CardLite) => `${cat.setById.get(c.setId)?.code ?? ""} · ${c.number ?? "DON!!"}`;

function moverDeal(cat: Catalog, c: CardLite, country: Country): HomeDeal | null {
  const h = headline(c, country);
  if (h.cents == null || c.change7d == null) return null;
  return {
    id: c.id, slug: c.slug, title: c.name, variant: c.variant, subtitle: subtitle(cat, c), hasImage: c.hasImage,
    priceCents: h.cents, approx: h.kind === "reference",
    badge: `${c.change7d > 0 ? "+" : "−"}${Math.abs(c.change7d).toFixed(1)}%`,
  };
}

export async function getTopDeals(country: Country, perType = 4): Promise<TopDeals> {
  try {
    const { cat, ranked } = await rankDefaultVsTcg(country, "pct");
    const savings = ranked.slice(0, perType).flatMap((r): HomeDeal[] => {
      const c = cat.byId.get(r.id);
      return c
        ? [{ id: c.id, slug: c.slug, title: c.name, variant: c.variant, subtitle: subtitle(cat, c), hasImage: c.hasImage, priceCents: r.buy, approx: false, badge: `Save ${r.pct}%` }]
        : [];
    });
    const pick = (dir: "up" | "down") =>
      movers(cat.cards, dir, perType)
        .map((c) => moverDeal(cat, c, country))
        .filter((d): d is HomeDeal => d != null);
    return { country, savings, savingsTotal: ranked.length, drops: pick("down"), rising: pick("up") };
  } catch {
    return { country, savings: [], savingsTotal: 0, drops: [], rising: [] };
  }
}

/** How many cards are on today's default Deal Finder list in a market — the Premium proof line. */
export async function dealCount(country: Country): Promise<number> {
  try {
    return (await rankDefaultVsTcg(country)).ranked.length;
  } catch {
    return 0;
  }
}
