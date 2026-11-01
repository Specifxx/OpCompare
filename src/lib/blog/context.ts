import type { Country } from "../country";
import {
  getCardText,
  getCatalog,
  getCatalogForImages,
  getIndexSeries,
  getIndexSeriesForImages,
  getSealedCatalog,
  getSealedCatalogForImages,
  getSiteStats,
  getSiteStatsForImages,
} from "../data";
import type { PostContext } from "./types";

export async function postContext(country: Country): Promise<PostContext> {
  const [cat, sealed, stats, index, text] = await Promise.all([getCatalog(), getSealedCatalog(), getSiteStats(), getIndexSeries(), getCardText().catch(() => undefined)]);
  return { cat, sealed, stats, index, country, text };
}

/** The same context for a post's share image: the day-old image loaders (lib/data.ts, getCatalogForImages). */
export async function postContextForImages(country: Country): Promise<PostContext> {
  const [cat, sealed, stats, index] = await Promise.all([getCatalogForImages(), getSealedCatalogForImages(), getSiteStatsForImages(), getIndexSeriesForImages()]);
  return { cat, sealed, stats, index, country };
}
