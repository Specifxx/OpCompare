// Card search over the cached catalogue — pure, so /api/search and /browse
// share it and tests/search.test.ts can pin it. Every query word must appear in
// the card's name, number, printing, set code or set name; ranking prefers an
// exact card number, then names that start with the query, then value.
import type { CardLite, SetLite } from "./data";

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'"”“]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "op01 120", "OP01-120", "op01120" → "OP01-120" when the query is a card number. */
export function numberQuery(q: string): string | null {
  const m = /^\s*(op|st|eb|prb)[-\s]?(\d{2})[-\s]?(\d{3})\s*$/i.exec(q) ?? null;
  if (m) return `${m[1].toUpperCase()}${m[2]}-${m[3]}`;
  const p = /^\s*p[-\s]?(\d{3})\s*$/i.exec(q);
  return p ? `P-${p[1]}` : null;
}

export function haystack(c: CardLite, set: SetLite | undefined): string {
  return norm([c.name, c.number ?? "", (c.number ?? "").replace("-", ""), c.variant ?? "", set?.code ?? "", set?.name ?? ""].join(" "));
}

export function searchCards(cards: CardLite[], setById: Map<number, SetLite>, q: string, limit = Infinity): CardLite[] {
  const num = numberQuery(q);
  if (num) {
    return cards
      .filter((c) => c.number === num)
      .sort((a, b) => (a.printing === "standard" ? -1 : 0) - (b.printing === "standard" ? -1 : 0) || (b.marketUsd ?? 0) - (a.marketUsd ?? 0))
      .slice(0, limit);
  }
  const words = norm(q).split(" ").filter(Boolean);
  if (!words.length) return [];
  const qn = norm(q);
  const scored: { c: CardLite; s: number }[] = [];
  for (const c of cards) {
    const h = haystack(c, setById.get(c.setId));
    if (!words.every((w) => h.includes(w))) continue;
    const name = norm(c.name);
    let s = 0;
    if (name === qn) s += 100;
    else if (name.startsWith(qn)) s += 60;
    else if (name.includes(qn)) s += 30;
    if (c.printing === "standard") s += 5;
    s += Math.min(20, Math.log10((c.marketUsd ?? 0) + 1) * 5);
    scored.push({ c, s });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.c);
}
