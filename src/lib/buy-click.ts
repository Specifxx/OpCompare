// The properties of a Vercel Web Analytics `buy_click` custom event. Pure and
// client-safe (tests/buy-click.test.ts). Sent to Vercel's own analytics, never
// to our database: outbound clicks stopped being written to Postgres on
// 2026-10-05 because every row cost network credits.
//
// A link opts in with the attributes every buy link already carries:
// data-retailer ("store:<key>", "tcgplayer", "ebay_search" …), data-page,
// data-card (the product's slug) and data-surface (the block on the page).
import { isCheckoutLink } from "./checkout-link";
import { normalizeCountry } from "./country";

// link_type: did the click open the store's checkout with the item in the cart, or a
// product page (lib/checkout-link.ts, 2026-11-06)?
//
// Growth report item 1 (2026-11-17), the click log: every click also says which market the visitor was on (`country`), whether the link
// pays (`paid`), where its row sits in its list (`pos`), its ITEM-price rank among the list's priced rows (`rank`, ties share) and how far
// above the cheapest that is (`gap_pct`). Read from the page's own markup at click time (data-* on a row), sent to Vercel with the rest:
// nothing is stored, fetched or sent to our server. Item price only, in the market's own currency, never converted, never postage.
export type BuyClickProps = {
  retailer: string;
  network: "store" | "tcgplayer" | "ebay" | "other";
  page: string;
  link_type: "checkout" | "product";
  surface?: string;
  card?: string;
  country?: string;
  paid?: boolean;
  pos?: number;
  rank?: number;
  gap_pct?: number;
};

/** The minimum of a DOM element this module reads, so the pure code needs no DOM types (and tests pass a plain object). */
export interface ClickEl {
  closest(sel: string): ClickEl | null;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  parentElement: { children: ArrayLike<ClickEl> } | null;
}

export interface ClickContext {
  country: string;
  paid?: boolean;
  pos?: number;
  rank?: number;
  gap_pct?: number;
}

const num = (v: string | null): number | undefined => {
  if (v == null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * The market the visitor was on: the region in the path (/au/…, /uk/…), else the `country` cookie the site sets, else the US (the
 * baseline market the cached pages render on).
 */
export function marketOf(pathname: string, cookie: string | null | undefined): string {
  const seg = (pathname.split("/")[1] ?? "").toLowerCase();
  if (["us", "au", "uk", "ca", "sg", "eu"].includes(seg)) return seg.toUpperCase();
  return normalizeCountry(cookie);
}

/**
 * Position, price rank and gap to the cheapest, from the row the link sits in: an element with data-price-row whose parent's other
 * children with data-price-row are the list. A row says its item price with data-cents (open and priced rows only), and whether it
 * pays with data-paid. A link may carry data-pos / data-rank / data-gap itself (the page's own top buy block knows its rank).
 */
export function clickContext(a: ClickEl, pathname: string, cookie: string | null | undefined, network: BuyClickProps["network"], retailer = ""): ClickContext {
  const out: ClickContext = { country: marketOf(pathname, cookie) };
  const row = a.closest("[data-price-row]");
  const paidAttr = (row ?? a).getAttribute("data-paid") ?? a.getAttribute("data-paid");
  out.paid = paidAttr != null ? paidAttr === "1" : network === "ebay" || network === "tcgplayer" || retailer.startsWith("amazon");
  const list = row?.parentElement;
  if (row && list) {
    const rows = Array.from(list.children).filter((c) => c.hasAttribute("data-price-row"));
    out.pos = rows.indexOf(row) + 1;
    const mine = num(row.getAttribute("data-cents"));
    const prices = rows.map((c) => num(c.getAttribute("data-cents"))).filter((n): n is number => n != null && n > 0);
    if (mine != null && mine > 0 && prices.length) {
      const cheapest = Math.min(...prices);
      out.rank = prices.filter((n) => n < mine).length + 1;
      out.gap_pct = Math.round(((mine - cheapest) / cheapest) * 1000) / 10;
    }
  }
  const pos = num(a.getAttribute("data-pos"));
  const rank = num(a.getAttribute("data-rank"));
  const gap = num(a.getAttribute("data-gap"));
  if (pos != null) out.pos = pos;
  if (rank != null) out.rank = rank;
  if (gap != null) out.gap_pct = gap;
  return out;
}

const clip = (v: string | null | undefined, max = 120): string | undefined => {
  const s = (v ?? "").trim().toLowerCase().slice(0, max);
  return s ? s : undefined;
};

/** Which kind of seller a data-retailer key is, so Vercel can break clicks down without a per-store list. */
export function networkOf(retailer: string): BuyClickProps["network"] {
  if (retailer.startsWith("ebay")) return "ebay";
  if (retailer.startsWith("tcgplayer")) return "tcgplayer";
  return retailer.startsWith("store:") || /^[a-z0-9][a-z0-9_.-]*$/.test(retailer) ? "store" : "other";
}

/** First path segment, or "home": the page type when a link carries no data-page. */
export function pageFromPath(pathname: string): string {
  return pathname.split("/")[1] || "home";
}

/** The event's properties for one clicked link, or null when it carries no retailer. */
export function buyClickProps(attrs: { retailer: string | null; page: string | null; card: string | null; surface: string | null; href?: string | null }, pathname: string, ctx?: ClickContext): BuyClickProps | null {
  const retailer = clip(attrs.retailer, 60);
  if (!retailer) return null;
  const out: BuyClickProps = { retailer, network: networkOf(retailer), page: clip(attrs.page, 40) ?? pageFromPath(pathname), link_type: isCheckoutLink(attrs.href) ? "checkout" : "product" };
  const surface = clip(attrs.surface, 60);
  const card = clip(attrs.card, 160);
  if (surface) out.surface = surface;
  if (card) out.card = card;
  if (ctx) {
    out.country = ctx.country;
    out.paid = ctx.paid ?? out.network !== "store";
    if (ctx.pos != null) out.pos = ctx.pos;
    if (ctx.rank != null) out.rank = ctx.rank;
    if (ctx.gap_pct != null) out.gap_pct = ctx.gap_pct;
  }
  return out;
}
