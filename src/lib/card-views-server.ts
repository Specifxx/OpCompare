// The one counter WRITE a public request makes (DECISIONS, "Card view and
// search counters"): POST /api/card/[slug]/view bumps CardDemand.viewCount or
// CardDemand.searchCount and lastViewedAt for one card — a single-row upsert of a
// few bytes, no read, no response body. Guarded in lib/card-views.ts (bots get
// a 204, a per-IP and a per-IP-per-card limit) and in the browser (once per
// card per kind per day). Best effort: a failure is swallowed, never a 500.
import { prisma } from "./db";
import { getCatalog } from "./data";

const SLUG = /^[a-z0-9-]{1,160}$/;

/** A card slug's id, from the public catalogue (the catalogue is not in this database). */
async function cardIdOf(slug: string): Promise<number | null> {
  return (await getCatalog()).bySlug.get(slug)?.id ?? null;
}

// The counters are CardDemand rows (keyed by the card's TCGplayer id, private, in Neon): the catalogue
// they used to sit on is on GitHub now.
export async function countCardView(
  slug: string,
  kind: "view" | "search",
  deps: { db?: Pick<typeof prisma, "cardDemand">; cardId?: (slug: string) => Promise<number | null> } = {},
): Promise<void> {
  if (!SLUG.test(slug)) return;
  try {
    const cardId = await (deps.cardId ?? cardIdOf)(slug);
    if (cardId == null) return;
    const now = new Date();
    await (deps.db ?? prisma).cardDemand.upsert({
      where: { cardId },
      create: { cardId, searchCount: kind === "search" ? 1 : 0, viewCount: kind === "view" ? 1 : 0, lastViewedAt: now },
      update: kind === "search" ? { searchCount: { increment: 1 }, lastViewedAt: now } : { viewCount: { increment: 1 }, lastViewedAt: now },
    });
  } catch {
    /* best-effort */
  }
}
