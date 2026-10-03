// The two beacon writes (RiftCompare's /api/click and /api/premium/click).
// Server-only: the routes in src/app/api may not import @/lib/db themselves
// (tests/nested-cache.test.ts). Each is ONE small insert, per click, never
// read on a page: only /admin/clicks and /admin/premium read them back
// (src/lib/admin-clicks.ts, uncached).
import { prisma } from "./db";
import type { ClickInput } from "./click-event";
import type { Tier } from "./plans";

export async function recordClick(c: ClickInput, userId: string | null): Promise<void> {
  await prisma.clickEvent.create({ data: { retailer: c.retailer, page: c.page, slug: c.slug, country: c.country, userId } });
}

export async function recordPlanClick(surface: string, tier: Tier | null, userId: string | null): Promise<void> {
  await prisma.premiumClick.create({ data: { surface, tier, userId } });
}
