// The one counter WRITE a public request makes (DECISIONS, "Card view and
// search counters"): POST /api/card/[slug]/view adds to CardDemand.viewCount or
// CardDemand.searchCount and lastViewedAt for one card. Guarded in
// lib/card-views.ts (bots get a 204, a per-IP and a per-IP-per-card limit) and in
// the browser (once per card per kind per day). Best effort: a failure is
// swallowed, never a 500.
//
// COMPUTE (owner, 2026-10-19: OP2 hit Neon's compute limit): a database write per
// view kept the database awake whenever the site had any traffic. Views are now
// COUNTED IN MEMORY and written together, at most once per FLUSH_MS per server
// instance, by the first view that arrives after the interval. A buffer lost when
// an instance is recycled costs a few counts of an approximate popularity signal,
// never a page.
import { prisma } from "./db";
import { getCatalog } from "./data";

const SLUG = /^[a-z0-9-]{1,160}$/;

/** How long counts wait in memory before one batched write. */
export const FLUSH_MS = 30 * 60 * 1000;
/** A buffer never grows past this many cards (a flood of slugs cannot exhaust memory). */
const MAX_BUFFERED = 2000;

type Db = Pick<typeof prisma, "cardDemand">;
type Counts = { view: number; search: number };

const buffer = new Map<number, Counts>();
let bufferStarted = 0;

/** A card slug's id, from the public catalogue (the catalogue is not in this database). */
async function cardIdOf(slug: string): Promise<number | null> {
  return (await getCatalog()).bySlug.get(slug)?.id ?? null;
}

/** Write every buffered count in one go and empty the buffer. Swallows errors (the counts are dropped). */
export async function flushCardViews(db: Db = prisma, now: Date = new Date()): Promise<number> {
  if (!buffer.size) return 0;
  const rows = [...buffer];
  buffer.clear();
  bufferStarted = 0;
  let written = 0;
  for (const [cardId, c] of rows) {
    try {
      await db.cardDemand.upsert({
        where: { cardId },
        create: { cardId, searchCount: c.search, viewCount: c.view, lastViewedAt: now },
        update: { ...(c.search ? { searchCount: { increment: c.search } } : {}), ...(c.view ? { viewCount: { increment: c.view } } : {}), lastViewedAt: now },
      });
      written++;
    } catch {
      /* best-effort */
    }
  }
  return written;
}

export async function countCardView(
  slug: string,
  kind: "view" | "search",
  deps: { db?: Db; cardId?: (slug: string) => Promise<number | null>; now?: () => number } = {},
): Promise<void> {
  if (!SLUG.test(slug)) return;
  try {
    const cardId = await (deps.cardId ?? cardIdOf)(slug);
    if (cardId == null) return;
    const t = (deps.now ?? Date.now)();
    if (!buffer.size) bufferStarted = t;
    const c = buffer.get(cardId) ?? (buffer.size < MAX_BUFFERED ? { view: 0, search: 0 } : null);
    if (c) {
      c[kind]++;
      buffer.set(cardId, c);
    }
    if (t - bufferStarted >= FLUSH_MS) await flushCardViews(deps.db ?? prisma, new Date(t));
  } catch {
    /* best-effort */
  }
}
