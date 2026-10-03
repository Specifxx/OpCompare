// Matching a store's listing title to ONE TCGplayer printing — pure, and pinned
// in tests/match.test.ts against real titles from the stores we read.
//
// One Piece makes the first half easy: nearly every store prints the card
// number ("OP01-120"). The hard half is the printing. OP01-120 Shanks exists as
// the standard print, a Parallel and a Manga art, at roughly $40, $400 and
// $4,000, so a listing matched to the wrong one is worse than no listing. The
// rule is RiftCompare's: understated, never wrong. A title is matched only when
// exactly one printing of that number fits it; anything ambiguous is skipped.

import type { SealedKind } from "./constants";

// ── Shared filters ───────────────────────────────────────────────────────────

// Non-English printings (ported from RiftCompare's lib/scrape-http.ts): any CJK
// character, or a language word an English title can still carry.
export const FOREIGN_LANG =
  /[㐀-鿿぀-ヿ가-힯]|\b(cn|chn|chs|cht|jp|jpn|jap|kr|kor|chinese|japanese|korean|asia|asian|simplified|traditional|mandarin|cantonese|french|francais|français|german|deutsch|italian|italiano|spanish|español)\b/i;

// Graded slabs, live breaks, lots and serialised prints are not the card a
// shopper is pricing.
const NOT_A_RAW_SINGLE =
  /\b(psa|bgs|cgc|beckett|sgc|graded|slab(bed)?|gem mint|live break|serialized|serialised|lot of|playset|proxy|proxies|custom|replica|sticker|sleeves?|playmat|binder|figure|pop!)\b|\b\d{1,4}\/\d{2,4}\b(?!\s*cards)|\bx\s?[2-9]\b|\b[2-9]\s?x\b/i;

export function isForeign(title: string): boolean {
  return FOREIGN_LANG.test(title);
}

// ── Card numbers ─────────────────────────────────────────────────────────────

/** Every One Piece card number in a title, normalised: "OP-01-003" → "OP01-003", "p-001" → "P-001". */
export function cardNumbersIn(title: string): string[] {
  const out = new Set<string>();
  for (const m of title.matchAll(/\b(OP|ST|EB|PRB)[-\s]?(\d{2})-(\d{3})\b/gi)) out.add(`${m[1].toUpperCase()}${m[2]}-${m[3]}`);
  for (const m of title.matchAll(/\bP-(\d{3})\b/gi)) out.add(`P-${m[1]}`);
  return [...out];
}

// ── Printing keys ────────────────────────────────────────────────────────────
// A printing is described by a small set of keys. A title fits a printing when
// its keys are EXACTLY the printing's keys and it names every extra word the
// printing's tag carries (e.g. "judge" for a "Judge Pack Vol. 2" print).

const KEY_PATTERNS: [string, RegExp][] = [
  ["superalt", /\bsuper\s+(?:alt(?:ernate)?\s*art|parallel)\b|\bsaa\b/i],
  ["alt", /\bparallel\b|\balt(?:ernate)?[\s-]*art\b|\bfull[\s-]*art\b|\baa\b|\balt\b/i],
  ["manga", /\bmanga\b/i],
  ["wanted", /\bwanted\b/i],
  ["sp", /\bsp\b(?!\s*played)|\bspecial card\b/i],
  ["treasure", /\btreasure rare\b|\btr\b/i],
  ["gold", /\bgold\b(?!\s*(?:roger|en))/i],
  ["jolly", /\bjolly roger\b/i],
  ["piratefoil", /\bpirate foil\b/i],
  ["textured", /\btextured\b/i],
  ["gem", /\(gem\)|\bgem foil\b/i],
  ["reprint", /\breprint\b/i],
];

const STOP = new Set([
  "the", "and", "vol", "pack", "packs", "edition", "version", "ver", "card", "cards", "set", "one", "piece", "game",
  "alternate", "art", "parallel", "foil", "special", "rare", "super",
]);

/** Keys for a TCGplayer printing, from its variant tokens ("Parallel · Manga"). */
export function printingKeys(variant: string | null): { keys: Set<string>; extras: string[] } {
  const keys = new Set<string>();
  const extras: string[] = [];
  if (!variant) return { keys, extras };
  for (const tok of variant.split(" · ")) {
    let rest = tok;
    for (const [k, re] of KEY_PATTERNS) {
      if (re.test(rest)) {
        keys.add(k);
        rest = rest.replace(new RegExp(re.source, "gi"), " ");
      }
    }
    // Whatever the keys did not explain must be named by the title too:
    // "Red Super Alternate Art" → "red"; "Judge Pack Vol. 2" → "judge", "2".
    for (const w of rest.toLowerCase().split(/[^a-z0-9]+/)) {
      if (w && !STOP.has(w) && (w.length >= 2 || /^\d$/.test(w))) extras.push(w);
    }
  }
  if (keys.has("superalt")) keys.delete("alt");
  return { keys, extras: [...new Set(extras)] };
}

/** Keys a store title states. "Foil" alone is not a key: stores add it to every SR. */
export function titleKeys(title: string): Set<string> {
  const t = title.replace(/\bslightly played\b/gi, "");
  const keys = new Set<string>();
  for (const [k, re] of KEY_PATTERNS) if (re.test(t)) keys.add(k);
  if (keys.has("superalt")) keys.delete("alt");
  // "Shanks (Wanted) … Special Foil": the wanted-poster print, not an SP.
  if (keys.has("wanted")) keys.delete("sp");
  return keys;
}

export interface PrintingRef {
  id: number;
  name: string;
  number: string | null;
  variant: string | null;
  setCode?: string | null; // "OP01", "PRB-01", "ST-01"
  setName?: string | null;
}

type Indexed = PrintingRef & { keys: Set<string>; extras: string[]; nameWords: string[]; home: boolean };
export type CardIndex = Map<string, Indexed[]>;

const nameWords = (name: string): string[] => {
  const words = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
  const long = words.filter((w) => w.length >= 4);
  return long.length ? long : words.filter((w) => w.length >= 3);
};

/** Is this the card number's own set ("OP01-003" in OP01; "P-001" in OP-PR)? */
export function isHomeSet(number: string, setCode: string | null | undefined): boolean {
  if (!setCode) return false;
  const code = setCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const prefix = number.toUpperCase().split("-")[0];
  if (prefix === "P") return code.startsWith("OPPR");
  return code.includes(prefix);
}

export function buildCardIndex(cards: PrintingRef[]): CardIndex {
  const idx: CardIndex = new Map();
  for (const c of cards) {
    if (!c.number) continue;
    const { keys, extras } = printingKeys(c.variant);
    const key = c.number.toUpperCase();
    const list = idx.get(key) ?? [];
    list.push({ ...c, keys, extras, nameWords: nameWords(c.name), home: isHomeSet(c.number, c.setCode) });
    idx.set(key, list);
  }
  return idx;
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

/** Does a set code named in a title ("OP-01" → "OP01", "PRB01" → "PRB-01") name this set? */
export function codeNamesSet(titleCode: string, setCode: string | null | undefined): boolean {
  if (!setCode) return false;
  const sc = setCode.toUpperCase();
  return sc === titleCode || sc.startsWith(`${titleCode}-`) || sc.endsWith(`-${titleCode.replace("-", "")}`);
}

export type MatchMiss = "foreign" | "not-single" | "no-number" | "many-numbers" | "unknown-number" | "name" | "no-printing" | "ambiguous";

/** The one printing a store title names, or why not. */
export function matchCardTitle(title: string, idx: CardIndex): { id: number } | { miss: MatchMiss } {
  if (isForeign(title)) return { miss: "foreign" };
  if (NOT_A_RAW_SINGLE.test(title)) return { miss: "not-single" };
  const nums = cardNumbersIn(title);
  if (!nums.length) return { miss: "no-number" };
  if (nums.length > 1) return { miss: "many-numbers" };
  const cands = idx.get(nums[0]);
  if (!cands?.length) return { miss: "unknown-number" };
  const lower = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  // The number must belong to the card the title names (catches a typo'd number).
  const named = cands.filter((c) => c.nameWords.some((w) => lower.includes(w)));
  if (!named.length) return { miss: "name" };
  const tk = titleKeys(title);
  const words = new Set(lower.replace(/[’']/g, "").split(/[^a-z0-9]+/).filter(Boolean));
  let fits = named.filter((c) => sameSet(c.keys, tk) && c.extras.every((w) => words.has(w)));
  if (!fits.length) return { miss: "no-printing" };
  if (fits.length === 1) return { id: fits[0].id };

  // Several printings fit. Narrow, in order, by what the title says:
  // 1. a set code it names ("… PRB-01 …" → the Premium Booster reprint);
  const codes = setCodesIn(title);
  if (codes.length) {
    const byCode = fits.filter((c) => codes.some((tc) => codeNamesSet(tc, c.setCode)));
    if (byCode.length) fits = byCode;
  }
  // 2. a set name it names ("… The Best …", "… Demo Deck …");
  if (fits.length > 1) {
    const flat = lower.replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ");
    const byName = fits.filter((c) => {
      const n = (c.setName ?? "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
      return n.length >= 6 && flat.includes(n);
    });
    if (byName.length) fits = byName;
  }
  // 3. the most specific tag (a "Judge Pack" print over the standard one);
  if (fits.length > 1) {
    const best = Math.max(...fits.map((c) => c.extras.length));
    fits = fits.filter((c) => c.extras.length === best);
  }
  // 4. and, when nothing else separates them, the card number's own set: a
  //    store selling "Luffy OP01-024" with no other word sells the OP01 print.
  if (fits.length > 1 && !codes.length) {
    const home = fits.filter((c) => c.home);
    if (home.length === 1) fits = home;
  }
  return fits.length === 1 ? { id: fits[0].id } : { miss: "ambiguous" };
}

// ── The name path ────────────────────────────────────────────────────────────
// Stores on BinderPOS-style catalogues title singles exactly as TCGplayer does,
// with the set instead of the number: "Arlong (Alternate Art) [A Fist of Divine
// Speed]", "Kuzan (Parallel) - Royal Blood Foil". Exact TCGplayer name + set
// name is as unambiguous as a number, so it is a second, strict path.

export function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'"”“]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "ST-01: Starter Deck 1 Straw Hat Crew" → also "starter deck 1 straw hat crew". */
function setNameForms(names: string[]): string[] {
  const out = new Set<string>();
  for (const n of names) {
    if (!n) continue;
    out.add(normName(n));
    out.add(normName(n.replace(/^[A-Z]{2,3}-?\d{2}(?:-[A-Z]{2}\d{2})?:\s*/, "")));
  }
  out.delete("");
  return [...out];
}

export type NameIndex = Map<string, number>; // -1 = more than one product

export function buildNameIndex(items: { id: number; tcgName: string; setNames: string[] }[]): NameIndex {
  const idx: NameIndex = new Map();
  for (const it of items) {
    const n = normName(it.tcgName);
    for (const s of setNameForms(it.setNames)) {
      const k = `${n}|${s}`;
      const prev = idx.get(k);
      idx.set(k, prev == null || prev === it.id ? it.id : -1);
    }
  }
  return idx;
}

/** A product id from "Name (Variant) [Set]" or "Name (Variant) - Set Foil", or null. */
export function matchByName(title: string, idx: NameIndex): number | null {
  if (isForeign(title) || NOT_A_RAW_SINGLE.test(title)) return null;
  const t = title.replace(/\s+(?:foil|non-foil|normal|holofoil)\s*$/i, "").trim();
  let m = /^(.+?)\s*\[([^\]]+)\]\s*$/.exec(t);
  if (!m) m = /^(.+?)\s+-\s+(.+)$/.exec(t);
  if (!m) return null;
  const id = idx.get(`${normName(m[1])}|${normName(m[2])}`);
  return id != null && id > 0 ? id : null;
}

// ── Conditions ───────────────────────────────────────────────────────────────

/** 0 = Near Mint / unstated … 4 = Damaged. Ported from RiftCompare. */
export function conditionRank(label: string): number {
  const t = label.toLowerCase();
  if (/damaged|\bdmg\b|poor/.test(t)) return 4;
  if (/heav(il)?y|\bhp\b/.test(t)) return 3;
  if (/moderate|\bmp\b|played(?!.*light)/.test(t) && !/light|slight/.test(t)) return 2;
  if (/light|slight|\blp\b|\bsp\b|excellent|\bex\b/.test(t)) return 1;
  return 0;
}

export function conditionLabel(label: string | null | undefined): string | null {
  if (!label || /default title/i.test(label)) return null;
  const r = conditionRank(label);
  return ["NM", "LP", "MP", "HP", "DMG"][r];
}

export interface StoreVariant {
  title: string;
  price: string;
  available: boolean;
}

/** Best condition first, then cheapest, among in-stock variants. Null = nothing buyable. */
export function bestVariant(variants: StoreVariant[]): { priceCents: number; condition: string | null } | null {
  const ok = variants.filter((v) => v.available && parseFloat(v.price) > 0 && !/japanese|jp\b|chinese/i.test(v.title));
  if (!ok.length) return null;
  const best = ok.reduce((a, b) => {
    const ra = conditionRank(a.title);
    const rb = conditionRank(b.title);
    if (ra !== rb) return ra < rb ? a : b;
    return parseFloat(a.price) <= parseFloat(b.price) ? a : b;
  });
  return { priceCents: Math.round(parseFloat(best.price) * 100), condition: conditionLabel(best.title) };
}

/** Cheapest variant of any condition (for out-of-stock listings we still show greyed). */
export function anyVariant(variants: StoreVariant[]): number | null {
  const ps = variants.map((v) => parseFloat(v.price)).filter((p) => p > 0);
  return ps.length ? Math.round(Math.min(...ps) * 100) : null;
}

// ── Sanity against TCGplayer's market price ──────────────────────────────────

/**
 * A matched single far below or far above the card's TCGplayer market price is
 * a wrong match (a base print priced as its parallel, or the other way round)
 * far more often than a deal. Dropped, not shown.
 */
export function plausibleSinglePrice(priceUsdCents: number, marketUsdCents: number | null): boolean {
  if (marketUsdCents == null) return true;
  if (marketUsdCents >= 300 && priceUsdCents < marketUsdCents * 0.3) return false;
  if (priceUsdCents > marketUsdCents * 4 + 500) return false;
  return true;
}

export function plausibleSealedPrice(priceUsdCents: number, marketUsdCents: number | null): boolean {
  if (marketUsdCents == null) return true;
  return priceUsdCents >= marketUsdCents * 0.5 && priceUsdCents <= marketUsdCents * 3;
}

// ── Sealed ───────────────────────────────────────────────────────────────────

export interface SealedRef {
  id: number;
  name: string;
  kind: SealedKind;
  setCode: string | null; // "OP01", "EB-01", "ST-01", "PRB-01", "OP15-EB04"
  setName: string | null;
}

/** "OP-13" / "op13" / "[OP-13]" → "OP13"; "ST36" → "ST-36"; "EB-02" → "EB-02". */
export function setCodesIn(title: string): string[] {
  const out = new Set<string>();
  for (const m of title.matchAll(/\b(OP|EB|PRB|ST|SD)[-\s]?(\d{2})\b(?!-\d{3})/gi)) {
    const p = m[1].toUpperCase();
    out.add(p === "OP" || p === "SD" ? `${p}${m[2]}` : `${p}-${m[2]}`);
  }
  return [...out];
}

/** The product type a store's sealed title names, in TCGplayer's vocabulary. */
export function sealedKindOfTitle(title: string): SealedKind | null {
  const t = title.toLowerCase();
  // Products we do not match from store titles (their names vary too much to
  // tell apart safely), and singles that name the product they came from.
  if (/illustration box|tin pack|gift collection|premium card collection|devil fruits|don!!|\bdon card\b|alternate art|parallel|\bmanga\b|\bleader\b|\[sp\]|\(sp\)/.test(t)) return null;
  const deck = /starter deck|ultra deck|deck set|\bst-?\d{2}\b/.test(t);
  const dbl = /double pack/.test(t);
  if (/\bcase\b/.test(t)) return deck || dbl ? "Display Case" : "Booster Case";
  if (dbl) return /display/.test(t) ? "Display" : "Double Pack Set";
  if (deck) return /display/.test(t) ? "Display" : "Starter Deck";
  if (/sleeved/.test(t)) return "Sleeved Booster Pack";
  // European stores call a booster box a "display".
  if (/booster box|\bbox\b|\bdisplay\b/.test(t)) return "Booster Box";
  if (/booster pack|\bpack\b/.test(t)) return "Booster Pack";
  return null;
}

const NOT_SEALED_PRODUCT = /\b(empty|opened|open box|damaged|dented|live break|storage box|deck box|sleeves?|playmat|binder|card case|toploader|lot of|bundle of|\d+\s?x\b|x\s?\d+\b)\b/i;

export function matchSealedTitle(title: string, sealed: SealedRef[]): { id: number } | { miss: string } {
  if (isForeign(title)) return { miss: "foreign" };
  if (NOT_SEALED_PRODUCT.test(title)) return { miss: "not-sealed" };
  if (cardNumbersIn(title).length) return { miss: "single" };
  const kind = sealedKindOfTitle(title);
  if (!kind) return { miss: "no-kind" };
  const lower = title.toLowerCase().replace(/[’']/g, "");
  const codes = setCodesIn(title);
  const bySet = (s: SealedRef) => {
    if (!s.setCode) return false;
    const sc = s.setCode.toUpperCase();
    if (codes.length) return codes.some((c) => sc === c || sc.startsWith(`${c}-`) || sc.endsWith(`-${c.replace("-", "")}`));
    const n = (s.setName ?? "").toLowerCase().replace(/[’']/g, "");
    return n.length >= 6 && lower.includes(n);
  };
  let cands = sealed.filter((s) => s.kind === kind && bySet(s));
  if (!cands.length) return { miss: "no-product" };
  if (cands.length > 1) {
    // Romance Dawn's two box waves, and similar: only a title that says which.
    const wave = /wave\s*1|blue/.test(lower) ? "wave 1" : /wave\s*2|white/.test(lower) ? "wave 2" : null;
    if (wave) cands = cands.filter((s) => s.name.toLowerCase().includes(wave));
  }
  return cands.length === 1 ? { id: cands[0].id } : { miss: "ambiguous" };
}
