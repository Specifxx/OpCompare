// Fetch TCG's price of a One Piece card in Australia (owner, 2026-11-11; Fetch's partner feed). Read by the card page
// and drawn as a labelled marketplace row after eBay's: never a store, never the cheapest, a deal, an alert, history
// or a basket line.
//
// Fetch's terms (Dhanish Semar, 2026-10-28): the feed is for showing Fetch's prices with a link back, and may not be
// passed on. So the 95 MB feed is NEVER committed: scripts/fetch-fetchtcg.ts runs first in every build, keeps only
// One Piece (English) and writes data/fetch-live/au.json, git-ignored, which this file reads. Links are used exactly as
// Fetch sends them (they already carry our referral tag).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface FetchLiveCard {
  /** set name as Fetch writes it, "[OP01] Romance Dawn" */
  s: string;
  /** card number, "OP01-035" */
  no: string;
  /** card name, bracketed printing included */
  n: string;
  /** "Normal" | "Foil" */
  f: string;
  /** condition the price is for (Near Mint, else the best raw condition) */
  c: string;
  /** AUD cents */
  p: number;
  /** Fetch's own page, tracked, used as sent */
  u: string;
}
export interface FetchLiveFile {
  fetchedAt: string;
  cards: FetchLiveCard[];
}
export interface FetchRow {
  condition: string;
  priceCents: number;
  url: string;
}
export interface FetchRows {
  rows: FetchRow[];
  /** ISO time the build fetched the feed */
  at: string;
}

export const FETCH_LIVE_FILE = path.join("data", "fetch-live", "au.json");
/** Fetch's prices are ignored once the file is older than this (the page copy is kept a day plus a day by the CDN). */
export const FETCH_MAX_AGE_MS = 3 * 86400e3;

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
/** Fetch adds the printing in brackets ("Okiku (SP)"); a plain name is the base printing. */
const hasPrinting = (s: string) => /\([^)]*\)/.test(s);
const bareName = (s: string) => norm(s.replace(/\s*\([^)]*\)/g, ""));
/** "[OP01] Romance Dawn" → "OP01"; null for a set with no code (promos). */
const setCodeOf = (s: string) => /^\[([A-Z0-9]+)\]/.exec(s)?.[1] ?? null;
/** "OP01-035" → "OP01" (also ST01, EB01, PRB01). */
const prefixOf = (n: string) => /^([A-Z]+\d+)-\d+$/.exec(n)?.[1] ?? null;

let cache: { index: Map<string, FetchLiveCard[]>; at: string } | null | undefined;

function load(): typeof cache {
  if (cache !== undefined) return cache;
  cache = null;
  try {
    const file = path.join(process.cwd(), FETCH_LIVE_FILE);
    if (!existsSync(file)) return cache;
    const f = JSON.parse(readFileSync(file, "utf8")) as FetchLiveFile;
    if (!f || !Array.isArray(f.cards) || typeof f.fetchedAt !== "string") return cache;
    if (Date.now() - Date.parse(f.fetchedAt) > FETCH_MAX_AGE_MS) return cache;
    const index = new Map<string, FetchLiveCard[]>();
    for (const c of f.cards) {
      const k = c.no.toUpperCase();
      const a = index.get(k);
      if (a) a.push(c);
      else index.set(k, [c]);
    }
    cache = { index, at: f.fetchedAt };
  } catch {
    cache = null;
  }
  return cache;
}

/**
 * Fetch's non-foil listing of this card's BASE printing: the same card number in the set the number belongs to (OP01-035
 * in [OP01], not a later reprint), the same name and no bracketed printing. Alternate arts, parallels and reprints get
 * no row yet (their names do not map one to one), and anything ambiguous is no row: a wrong price is worse than none.
 */
export function fetchRowsFor(card: { name: string; number: string | null; variant: string | null }): FetchRows | null {
  const l = load();
  if (!l || !card.number || card.variant) return null;
  const hits = l.index.get(card.number.toUpperCase());
  const prefix = prefixOf(card.number.toUpperCase());
  if (!hits || !prefix) return null;
  const want = norm(card.name);
  const named = hits.filter((h) => !hasPrinting(h.n) && h.f === "Normal" && setCodeOf(h.s) === prefix && bareName(h.n) === want);
  if (named.length !== 1) return null;
  const h = named[0];
  return h.p > 0 ? { rows: [{ condition: h.c, priceCents: h.p, url: h.u }], at: l.at } : null;
}

const GRADED = /^(psa|cgc|becketts|tag|pcg)\b/i;

/** Cents from Fetch's AUD price (a number in dollars). */
export const cents = (dollars: number) => Math.round(dollars * 100);

/** Near Mint if listed, else the cheapest raw (not graded, not Damaged) condition. */
export function pickCondition(conds: { condition: string; price: number }[]): { condition: string; price: number } | null {
  const raw = conds.filter((c) => c && typeof c.price === "number" && c.price > 0 && !GRADED.test(c.condition) && !/damaged/i.test(c.condition));
  const nm = raw.filter((c) => /^(near mint|mint)$/i.test(c.condition)).sort((a, b) => a.price - b.price)[0];
  return nm ?? raw.sort((a, b) => a.price - b.price)[0] ?? null;
}
