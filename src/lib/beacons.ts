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
  await prisma.clickEvent.create({ data: { retailer: c.retailer, page: c.page, slug: c.slug, country: c.country, userId } });
}

export async function recordPlanClick(surface: string, tier: Tier | null, userId: string | null): Promise<void> {
  await prisma.premiumClick.create({ data: { surface, tier, userId } });
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
