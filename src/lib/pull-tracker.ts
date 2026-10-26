// The pull tracker, as pure functions (RiftCompare's lib/pull-tracker.ts, for
// One Piece). Tap what a real box or pack gave you; see what it is worth against
// what you paid; share it.
//
// Nothing is stored on the server. The pulls live in the browser
// (localStorage) and a shared result rides in the link's #fragment as card ids
// ("288228:1,288301:2"), which the server never sees: the page stays one cached
// render for everyone, and a link can never carry anything private.

export const MAX_PULL_LINES = 80;
export const MAX_PULL_QTY = 99;

export interface PullLine {
  id: number;
  qty: number;
}

/** Pulls → "288228:1,288301:2". Merges duplicates, drops bad lines, caps the size. */
export function encodePulls(lines: readonly PullLine[]): string {
  const merged = new Map<number, number>();
  for (const l of lines) {
    if (!Number.isInteger(l.id) || l.id <= 0) continue;
    merged.set(l.id, Math.min(MAX_PULL_QTY, (merged.get(l.id) ?? 0) + Math.max(0, Math.floor(l.qty))));
  }
  return [...merged]
    .filter(([, q]) => q > 0)
    .slice(0, MAX_PULL_LINES)
    .map(([id, q]) => `${id}:${q}`)
    .join(",");
}

/** The inverse, tolerant of anything a link might have picked up on the way. */
export function decodePulls(raw: string | null | undefined): PullLine[] {
  if (!raw) return [];
  const out: PullLine[] = [];
  for (const part of String(raw).slice(0, 2000).split(",")) {
    const [a, b] = part.split(":");
    const id = Number(a);
    const qty = Math.floor(Number(b ?? 1));
    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(qty) || qty < 1) continue;
    out.push({ id, qty: Math.min(MAX_PULL_QTY, qty) });
    if (out.length >= MAX_PULL_LINES) break;
  }
  return out;
}

/** What was paid, in cents, from "142.30". Bounded; null when absent or nonsense. */
export function parsePaid(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v <= 0 || v > 100_000) return null;
  return Math.round(v * 100);
}

/** The share fragment: "p=…&paid=…" (paid in the sharer's currency, named by `cur`). */
export function shareFragment(lines: readonly PullLine[], paidCents: number | null, currency: string): string {
  const q = new URLSearchParams();
  q.set("p", encodePulls(lines));
  if (paidCents) {
    q.set("paid", (paidCents / 100).toFixed(2));
    q.set("cur", currency);
  }
  return q.toString();
}

export function parseFragment(hash: string): { lines: PullLine[]; paidCents: number | null; currency: string | null } | null {
  const q = new URLSearchParams(hash.replace(/^#/, ""));
  const lines = decodePulls(q.get("p"));
  if (!lines.length) return null;
  const cur = q.get("cur");
  return { lines, paidCents: parsePaid(q.get("paid")), currency: cur && /^[A-Z]{3}$/.test(cur) ? cur : null };
}

export interface PullSummary {
  /** In USD cents (TCGplayer market). */
  totalUsdCents: number;
  copies: number;
  unpriced: number;
  bestId: number | null;
}

/** Totals for the tracked pulls; an unpriced card counts as nothing, as everywhere on the site. */
export function summarisePulls(lines: readonly PullLine[], usdOf: (id: number) => number | null): PullSummary {
  let total = 0;
  let copies = 0;
  let unpriced = 0;
  let best: { id: number; v: number } | null = null;
  for (const l of lines) {
    copies += l.qty;
    const v = usdOf(l.id);
    if (v == null || v <= 0) {
      unpriced += l.qty;
      continue;
    }
    total += v * l.qty;
    if (!best || v > best.v) best = { id: l.id, v };
  }
  return { totalUsdCents: total, copies, unpriced, bestId: best?.id ?? null };
}
