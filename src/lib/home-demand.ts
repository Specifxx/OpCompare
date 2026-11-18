// The home page's ranking input (lib/home-rank.ts; DECISIONS.md "Home pages rank items by demand", 2026-11-18): data/demand.json,
// product page views per card, last 28 and 7 days, from RiftCompare's /api/demand/oc, committed to main by import-prices.yml
// (scripts/pull-demand.sh, no deploy marker) and bundled with the weekly release. Imported: no file read, no database, no cache.
import raw from "../../data/demand.json";
import type { CardLite } from "./data";
import { DEFAULT_COUNTRY } from "./country";
import { rankItems, type DemandFile } from "./home-rank";

export const HOME_DEMAND = raw as DemandFile;

/** Cards, most likely to earn first: their page's views, US stores in stock, TCGplayer's market price. */
export const rankCards = (cards: readonly CardLite[]): CardLite[] =>
  rankItems(
    cards,
    (c) => ({ paths: [`/card/${c.slug}`], clickKey: c.slug, priceCents: c.marketUsd, inStock: c.stores?.[DEFAULT_COUNTRY] ?? 0, marketplace: c.marketUsd != null, paidRows: c.marketUsd != null ? 1 : 0 }),
    HOME_DEMAND,
  );
