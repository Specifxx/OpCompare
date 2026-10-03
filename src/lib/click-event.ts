// The outbound-click beacon's input rules (OutboundBeacon → /api/click →
// ClickEvent). Pure and client-safe so tests/click-event.test.ts pins them.
//
// What a row may hold: the retailer key and page type the link already
// carries (data-retailer / data-page), the card or sealed slug when the click
// came from one, and the market. Never a URL, an IP, a user agent or free text.
import { isCountry, type Country } from "./country";
import { isEntrySource, type EntrySource } from "./entry-source";

export interface ClickInput {
  retailer: string;
  page: string;
  slug: string | null;
  country: Country;
  /** First-touch traffic bucket of the tab (lib/entry-source.ts), or null. */
  entry?: EntrySource | null;
}

const RETAILER = /^[a-z0-9][a-z0-9_.:-]{0,47}$/;
const PAGE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,159}$/;

/** A validated click, or null (the route then answers 204 and writes nothing). */
export function parseClick(body: unknown): ClickInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const retailer = typeof b.retailer === "string" ? b.retailer.trim().toLowerCase() : "";
  const page = typeof b.page === "string" && b.page.trim() ? b.page.trim().toLowerCase() : "home";
  const slugRaw = typeof b.slug === "string" ? b.slug.trim().toLowerCase() : "";
  if (!RETAILER.test(retailer) || !PAGE.test(page)) return null;
  if (!isCountry(b.country)) return null;
  return { retailer, page, slug: SLUG.test(slugRaw) ? slugRaw : null, country: b.country, entry: isEntrySource(b.entry) ? b.entry : null };
}

/**
 * The slug a click came from, read from the page's path: /card/<slug> and
 * /sealed/<slug> only. Anything else (a list page, the footer) has none.
 */
export function slugFromPath(pathname: string): string | null {
  const m = /^\/(card|sealed)\/([a-z0-9-]+)\/?$/i.exec(pathname);
  return m ? m[2].toLowerCase() : null;
}

/** data-page when the link has none: the first path segment, "home" for /. */
export function pageFromPath(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";
  return seg ? seg.toLowerCase() : "home";
}
