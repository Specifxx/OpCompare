// The two beacon writes (RiftCompare's /api/click and /api/premium/click).
// Server-only: the routes in src/app/api may not import @/lib/db themselves
// (tests/nested-cache.test.ts). Each is ONE small insert, per click, never
// read on a page: only /admin/clicks and /admin/premium read them back
// (src/lib/admin-clicks.ts, uncached). Rows older than CLICK_RETENTION_DAYS are
// deleted by pruneBeacons, which the twice-daily import runs.
import { prisma } from "./db";
import type { ClickInput } from "./click-event";
import type { Tier } from "./plans";

/** How long beacon rows are kept; also the admin reports' widest window. */
export const CLICK_RETENTION_DAYS = 90;

export async function recordClick(c: ClickInput, userId: string | null): Promise<void> {
  await prisma.clickEvent.create({ data: { retailer: c.retailer, page: c.page, slug: c.slug, country: c.country, userId, entry: c.entry ?? null } });
}

export async function recordPlanClick(surface: string, tier: Tier | null, userId: string | null): Promise<void> {
  await prisma.premiumClick.create({ data: { surface, tier, userId } });
}

/**
 * A STARTED CHECKOUT (wave 2): written by /api/premium/checkout once Stripe
 * returned a session, with the surface that sent the buyer (or "checkout"
 * when none is known). source "checkout" tells it apart from a click, for
 * /admin/premium's "Started checkout by surface".
 */
export async function recordCheckoutStart(surface: string | null, tier: Tier, userId: string): Promise<void> {
  await prisma.premiumClick.create({ data: { surface: surface ?? "checkout", tier, userId, source: "checkout" } });
}

/** Delete beacon rows older than the retention window. Both tables are indexed on createdAt. */
export async function pruneBeacons(now = Date.now()): Promise<{ clicks: number; planClicks: number }> {
  const before = new Date(now - CLICK_RETENTION_DAYS * 86_400_000);
  const [clicks, planClicks] = await Promise.all([
    prisma.clickEvent.deleteMany({ where: { createdAt: { lt: before } } }),
    prisma.premiumClick.deleteMany({ where: { createdAt: { lt: before } } }),
  ]);
  return { clicks: clicks.count, planClicks: planClicks.count };
}
