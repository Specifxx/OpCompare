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
  /[㐀-鿿぀-ヿ가-힯]|\b(cn|chn|chs|cht|jp|jpn|jap|kr|kor|chinese|japanese|korean|asia|asian|simplified|traditional|mandarin|cantonese|french|francais|français|german|deutsch|italian|italiano|spanish|español|non[\s-]?english)\b/i;

// Graded slabs, live breaks, lots and serialised prints are not the card a
// shopper is pricing.
const NOT_A_RAW_SINGLE =
  /\b(psa|bgs|cgc|beckett|sgc|graded|slab(bed)?|gem mint|live break|serialized|serialised|lot of|playset|proxy|proxies|custom|replica|sticker|sleeves?|playmat|binder|figure|pop!|ace grading)\b|\b(?:tag|ags)\s?(?:10|[1-9](?:\.5)?)\b|\b\d{1,4}\/\d{2,4}\b(?!\s*cards)|\bx\s?[2-9]\b|\b[2-9]\s?x\b/i;

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
  // The red-bordered SAA and the Super Leader AA are their own printings; a
  // title has to say so in one phrase ("Sabo OP13-120 Red SAA"). A stray "Red"
  // (the card's colour) or "Leader" (its type) elsewhere in a title is not it.
  ["redsaa", /\bred\s+(?:super\s+(?:alt(?:ernate)?[\s-]*art|parallel)|saa)\b/i],
  ["superleader", /\bsuper\s+leader\b/i],
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
  normaliseKeys(keys);
  return { keys, extras: [...new Set(extras)] };
}

/**
 * Keys that imply others. A Manga is always an alternate art, but TCGplayer
 * writes the original-set Mangas "(Alternate Art) (Manga)" and the Premium
 * Booster ones just "(Manga)", while stores write "Manga Rare" for both — so
 * "manga" stands alone on both sides and the set decides between them.
 */
function normaliseKeys(keys: Set<string>): void {
  if (keys.has("redsaa")) keys.delete("superalt");
  if (keys.has("redsaa") || keys.has("superalt") || keys.has("manga")) keys.delete("alt");
}

/** Keys a store title states. "Foil" alone is not a key: stores add it to every SR. */
export function titleKeys(title: string): Set<string> {
  const t = title.replace(/\bslightly played\b/gi, "");
  const keys = new Set<string>();
  for (const [k, re] of KEY_PATTERNS) if (re.test(t)) keys.add(k);
  normaliseKeys(keys);
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

// Words that name a printing other than the plain one: event stamps, promo
// distributions, reprint products. The keys above only ever ASK a title for
// words; these work the other way. A printing fits a title that says one only
// if the printing's own name, tag or set says it too, so "Koala (3rd Anniversary
// Stamp) OP13-081" or "Rayleigh (OP14-108) - Unnumbered Promos" is skipped when
// TCGplayer has no such printing, instead of being priced as the plain card.
const PRINTING_WORDS: [string, RegExp][] = [
  ["prerelease", /\bpre[\s-]?release\b|\b(?:OP|ST|EB)-?\d{2}\s+PRE\b/i],
  ["releaseevent", /\brelease event\b|\b(?:OP|ST|EB)-?\d{2}\s+RE\b/i],
  ["judge", /\bjudge\b/i],
  ["promo", /\bpromo(?:s|tion|tional)?\b/i],
  ["anniversary", /\banniversary\b|\b(?:OP|ST|EB)-?\d{2}\s+ANN\b/i],
  ["tournament", /\btournament\b/i],
  ["winner", /\bwinner\b/i],
  ["finalist", /\bfinalist\b/i],
  ["participa", /\bparticipa(?:nt|tion)\b/i],
  ["championship", /\bchampionships?\b/i],
  ["regional", /\bregionals?\b/i],
  ["treasurecup", /\btreasure cup\b/i],
  ["celebration", /\bcelebration\b/i],
  ["eventpack", /\bevent pack\b/i],
  ["dashpack", /\bdash pack\b/i],
  ["stamp", /\bstamp(?:ed)?\b/i],
  ["illustrationbox", /\billustration box\b/i],
  ["demodeck", /\bdemo deck\b/i],
  ["thebest", /\bthe best\b/i],
  ["premiumbooster", /\bpremium booster\b/i],
];
const compact = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
const PRB_TITLE = /\bthe best\b|\bpremium booster\b/i;
const EVENT_CODE = /\b(?:OP|ST|EB)-?\d{2}\s+(PRE|RE|ANN)\b/gi;
const EVENT_WORDS: Record<string, string[]> = { PRE: ["pre", "release"], RE: ["release", "event"], ANN: ["anniversary", "tournament"] };
// "(V.2)": the store's second version of the card, never the plain print.
const LATER_VERSION = /\(\s*v(?:er(?:sion)?)?\.?\s*[2-9]\s*\)/i;

/** Drop printings the title rules out: it names a stamp, promo or reprint they don't carry. */
function ruledOut(title: string, codes: string[]): (c: Indexed) => boolean {
  const said = PRINTING_WORDS.filter(([, re]) => re.test(title)).map(([w]) => w);
  const later = LATER_VERSION.test(title);
  const prb = codes.filter((c) => c.startsWith("PRB-"));
  const flat = compact(title);
  return (c) => {
    // A P- number is a promo by definition, whatever set TCGplayer files it in;
    // and "Uta - ST08-002 - Starter Deck 8: Monkey.D.Luffy Promo" is one store's
    // word for a deck card: "promo" right after the card's own set is allowed.
    const set = compact(c.setName ?? "");
    const promo = c.number?.startsWith("P-") || (set.length >= 6 && flat.includes(`${set}promo`));
    const own = compact(`${c.name} ${c.variant ?? ""} ${c.setName ?? ""}`) + (promo ? "promo" : "");
    if (!said.every((w) => own.includes(w))) return true;
    if (later && !c.keys.size && !c.extras.length) return true;
    // A Premium Booster code ("PRB01-ST14-013") names that reprint.
    return prb.length > 0 && !prb.some((tc) => codeNamesSet(tc, c.setCode));
  };
}

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
  // "[OP03 PRE - OP03-111]": the stamp written as a suffix to the set code.
  for (const m of title.matchAll(EVENT_CODE)) for (const w of EVENT_WORDS[m[1].toUpperCase()] ?? []) words.add(w);
  const codes = setCodesIn(title);
  const flat = lower.replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ");
  const setNamed = (c: Indexed) => codes.some((tc) => codeNamesSet(tc, c.setCode)) || nameInTitle(flat, c.setName);
  const out = ruledOut(title, codes);
  // When the title names the set of one of this number's printings, only
  // printings in a set it names fit: "Roronoa Zoro (OP06-118) - Wings of the
  // Captain (Manga Rare)" is OP06's Manga, not the Premium Booster's, and "Van
  // Augur (OP09-083) - Starter Deck: Black Marshall.D.Teach [ST-27-OP09-083]"
  // is not OP09's card.
  const namesSet = named.some(setNamed);
  const fit = (keys: Set<string>) =>
    named.filter((c) => sameSet(c.keys, keys) && c.extras.every((w) => words.has(w)) && !out(c) && (!namesSet || setNamed(c)));
  let fits = fit(tk);
  // A reprint title with no printing words sells the plain reprint, which
  // TCGplayer tags "(Reprint)": "Premium Booster 02 - Sabo (Common) - ST13-007"
  // is "Sabo - ST13-007 (Reprint)" [PRB-02].
  if (!fits.length && !tk.size && (namesSet || PRB_TITLE.test(title) || codes.some((c) => c.startsWith("PRB-")))) fits = fit(new Set(["reprint"]));
  if (!fits.length) return { miss: "no-printing" };
  // A plain printing outside the number's own set, which the title doesn't
  // name, is only a guess when the number has other printings: "Monkey.D.Luffy
  // (P-001)" is not the Demo Deck card just because every promo P-001 is tagged.
  const accept = (c: Indexed) =>
    c.home || c.keys.size > 0 || c.extras.length > 0 || setNamed(c) || named.length === 1 ? { id: c.id } : { miss: "ambiguous" as const };
  if (fits.length === 1) return accept(fits[0]);

  // Several printings fit. Narrow, in order, by what the title says:
  // 1. a set code it names ("… PRB-01 …" → the Premium Booster reprint);
  if (codes.length) {
    const byCode = fits.filter((c) => codes.some((tc) => codeNamesSet(tc, c.setCode)));
    if (byCode.length) fits = byCode;
  }
  // 2. a set name it names ("… The Best …", "… Demo Deck …");
  if (fits.length > 1) {
    const byName = fits.filter((c) => nameInTitle(flat, c.setName));
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
  return fits.length === 1 ? accept(fits[0]) : { miss: "ambiguous" };
}

/** Does the title (flattened to "a z 0 9" words) name this set? */
function nameInTitle(flat: string, setName: string | null | undefined): boolean {
  const n = (setName ?? "").toLowerCase().normalize("NFKD").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  return n.length >= 6 && ` ${flat} `.includes(` ${n} `);
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
  for (const m of title.matchAll(/\b(OP|EB|PRB|ST|SD)[-\s]?(\d{2})\b(?!-\d{3})(?:\s+(PRE|RE|ANN)\b)?/gi)) {
    const p = m[1].toUpperCase();
    const code = p === "OP" || p === "SD" ? `${p}${m[2]}` : `${p}-${m[2]}`;
    // "OP03 PRE", "OP15 RE", "OP09 ANN": the event group, as TCGplayer codes it.
    out.add(m[3] ? `${code} ${m[3].toUpperCase()}` : code);
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
  // A case is said in so many words ("Booster Box Case", "Booster Case (12
  // Boxes)", "Display Case"). "Booster Box (Case Fresh)" is a box; a title with
  // any other "case" in it is an accessory or a puzzle, and is not matched.
  const u = t.replace(/\bcase[\s-]fresh\b/g, "");
  if (/\b(?:box|booster|display|sealed|master)\s+case\b|\bcase\s+of\s+\d+|\bcase\s*\(\s*\d+\s*(?:x\s*)?(?:booster\s+)?(?:boxes|displays)\b/.test(u)) return deck || dbl ? "Display Case" : "Booster Case";
  if (/\bcase\b/.test(u)) return null;
  if (dbl) return /display/.test(t) ? "Display" : "Double Pack Set";
  if (deck) return /display/.test(t) ? "Display" : "Starter Deck";
  if (/sleeved/.test(t)) return "Sleeved Booster Pack";
  // European stores call a booster box a "display".
  if (/booster box|\bbox\b|\bdisplay\b/.test(t)) return "Booster Box";
  if (/booster pack|\bpack\b/.test(t)) return "Booster Pack";
  return null;
}

const NOT_SEALED_PRODUCT = /\b(empty|opened|open box|damaged|dented|live break|storage box|deck box|sleeves?|playmat|binder|card case|toploader|acrylic|protector|magnetic|lot of|bundle of|\d+\s?x\b|x\s?\d+\b)\b/i;

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
  // "Super Pre-Release Starter Deck 1" is not Starter Deck 1.
  if (/pre[\s-]?release/.test(lower)) cands = cands.filter((s) => /pre[\s-]?release/i.test(`${s.name} ${s.setName ?? ""}`));
  if (!cands.length) return { miss: "no-product" };
  if (cands.length > 1) {
    // Romance Dawn's two box waves, and similar: only a title that says which.
    const wave = /wave\s*1|blue/.test(lower) ? "wave 1" : /wave\s*2|white/.test(lower) ? "wave 2" : null;
    if (wave) cands = cands.filter((s) => s.name.toLowerCase().includes(wave));
  }
  return cands.length === 1 ? { id: cands[0].id } : { miss: "ambiguous" };
}
