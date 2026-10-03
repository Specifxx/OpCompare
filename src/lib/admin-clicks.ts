// /admin/clicks and /admin/premium reads (RiftCompare's admin pages of the same
// names). Owner-only traffic, so UNCACHED by design (unstable_cache lives in
// lib/data.ts only), grouped in the database, with a capped recent list.
import { CLICK_RETENTION_DAYS } from "./beacons";
import { prisma } from "./db";
import { tierOf } from "./premium";
import { STORE_BY_KEY } from "./stores";
import type { Tier } from "./plans";

const DAY = 86_400_000;
export const RECENT_CLICKS = 200;
export const PLAN_CLICK_SAMPLE = 2000;

const NAMED_RETAILERS: Record<string, string> = {
  tcgplayer: "TCGplayer",
  tcgplayer_banner: "TCGplayer banner",
  ebay: "eBay (listing)",
  ebay_search: "eBay search",
  ebay_banner: "eBay banner",
  ebay_no_listing: "eBay (no listing on file)",
};

/** A data-retailer key as a person reads it: a store's name, else the key. */
export function retailerLabel(key: string): string {
  const named = NAMED_RETAILERS[key];
  if (named) return named;
  // ebay_us, ebay_au …: a listing on that market's eBay (lib/board.ts ebayRetailer).
  if (/^ebay_[a-z]{2}$/.test(key)) return `eBay (${key.slice(5).toUpperCase()})`;
  if (key.startsWith("ebay_")) return `eBay (${key.slice(5).replace(/_/g, " ")})`;
  return STORE_BY_KEY[key]?.name ?? key;
}

// Rows older than this are pruned (lib/beacons.ts pruneBeacons), so it is also
// the widest window the reports show.
export { CLICK_RETENTION_DAYS };

export interface RetailerRow {
  retailer: string;
  d7: number;
  d30: number;
  d90: number;
}

/** Join three groupBy results into one row per retailer, busiest (30 d) first. */
export function mergeRetailerCounts(d90: { k: string; n: number }[], d30: { k: string; n: number }[], d7: { k: string; n: number }[]): RetailerRow[] {
  const m30 = new Map(d30.map((r) => [r.k, r.n]));
  const m7 = new Map(d7.map((r) => [r.k, r.n]));
  return d90.map((r) => ({ retailer: r.k, d90: r.n, d30: m30.get(r.k) ?? 0, d7: m7.get(r.k) ?? 0 })).sort((a, b) => b.d30 - a.d30 || b.d90 - a.d90 || a.retailer.localeCompare(b.retailer));
}

/** Where a recorded slug lives: ClickEvent.slug holds card AND sealed slugs (lib/click-event.ts slugFromPath). */
export function slugHref(slug: string, sealedSlugs: ReadonlySet<string>): string {
  return sealedSlugs.has(slug) ? `/sealed/${slug}` : `/card/${slug}`;
}

export interface ClicksReport {
  rows: RetailerRow[];
  byCountry: { k: string; n: number }[];
  byPage: { k: string; n: number }[];
  /** First-touch traffic bucket (ClickEvent.entry, wave 2; "—" before it was stamped). */
  byEntry: { k: string; n: number }[];
  topSlugs: { k: string; n: number; href: string }[];
  signedIn30: number;
  recent: { retailer: string; page: string; slug: string | null; country: string; signedIn: boolean; createdAt: Date }[];
}

export async function loadClicks(now = Date.now()): Promise<ClicksReport> {
  const d7 = new Date(now - 7 * DAY);
  const d30 = new Date(now - 30 * DAY);
  const d90 = new Date(now - CLICK_RETENTION_DAYS * DAY);
  const counts = (g: { _count: { _all: number } }[], key: (r: never) => string | null) =>
    g.map((r) => ({ k: key(r as never) ?? "—", n: r._count._all })).sort((a, b) => b.n - a.n);
  const [last90, last30, last7, country30, page30, slug30, signedIn30, recent, entry30] = await Promise.all([
    prisma.clickEvent.groupBy({ by: ["retailer"], _count: { _all: true }, where: { createdAt: { gte: d90 } } }),
    prisma.clickEvent.groupBy({ by: ["retailer"], _count: { _all: true }, where: { createdAt: { gte: d30 } } }),
    prisma.clickEvent.groupBy({ by: ["retailer"], _count: { _all: true }, where: { createdAt: { gte: d7 } } }),
    prisma.clickEvent.groupBy({ by: ["country"], _count: { _all: true }, where: { createdAt: { gte: d30 } } }),
    prisma.clickEvent.groupBy({ by: ["page"], _count: { _all: true }, where: { createdAt: { gte: d30 } } }),
    prisma.clickEvent.groupBy({ by: ["slug"], _count: { _all: true }, where: { createdAt: { gte: d30 }, slug: { not: null } }, orderBy: { _count: { slug: "desc" } }, take: 15 }),
    prisma.clickEvent.count({ where: { createdAt: { gte: d30 }, userId: { not: null } } }),
    prisma.clickEvent.findMany({ where: { createdAt: { gte: d90 } }, orderBy: { createdAt: "desc" }, take: RECENT_CLICKS, select: { retailer: true, page: true, slug: true, country: true, userId: true, createdAt: true } }),
    prisma.clickEvent.groupBy({ by: ["entry"], _count: { _all: true }, where: { createdAt: { gte: d30 } } }),
  ]);
  const byKey = (g: { retailer: string; _count: { _all: number } }[]) => g.map((r) => ({ k: r.retailer, n: r._count._all }));
  const topSlugs = counts(slug30, (r: { slug: string | null }) => r.slug);
  // At most 15 slugs: one indexed lookup says which are sealed products.
  const sealed = topSlugs.length
    ? new Set((await prisma.sealed.findMany({ where: { slug: { in: topSlugs.map((t) => t.k) } }, select: { slug: true } })).map((r) => r.slug))
    : new Set<string>();
  return {
    rows: mergeRetailerCounts(byKey(last90), byKey(last30), byKey(last7)),
    byCountry: counts(country30, (r: { country: string }) => r.country),
    byPage: counts(page30, (r: { page: string }) => r.page),
    byEntry: counts(entry30, (r: { entry: string | null }) => r.entry),
    topSlugs: topSlugs.map((t) => ({ ...t, href: slugHref(t.k, sealed) })),
    signedIn30,
    recent: recent.map((r) => ({ retailer: r.retailer, page: r.page, slug: r.slug, country: r.country, signedIn: r.userId != null, createdAt: r.createdAt })),
  };
}

export interface InterestUser {
  userId: string;
  count: number;
  last: Date;
  surfaces: string[];
  displayName: string;
  email: string;
  tier: Tier | null;
}

/** Fold recent PremiumClick rows into one entry per signed-in user (pure). */
export function foldPlanClicks(rows: { userId: string | null; surface: string; createdAt: Date }[]): { byUser: Map<string, { count: number; last: Date; surfaces: Set<string> }>; anon: number } {
  const byUser = new Map<string, { count: number; last: Date; surfaces: Set<string> }>();
  let anon = 0;
  for (const r of rows) {
    if (!r.userId) {
      anon++;
      continue;
    }
    const cur = byUser.get(r.userId) ?? { count: 0, last: r.createdAt, surfaces: new Set<string>() };
    cur.count++;
    if (r.createdAt > cur.last) cur.last = r.createdAt;
    cur.surfaces.add(r.surface);
    byUser.set(r.userId, cur);
  }
  return { byUser, anon };
}

export interface PlanInterestReport {
  totals: { d90: number; d7: number; d30: number; checkout30: number };
  bySurface30: { k: string; n: number }[];
  /** Checkouts STARTED (PremiumClick source "checkout", wave 2), by the surface that sent the buyer. */
  checkoutBySurface30: { k: string; n: number }[];
  users: InterestUser[];
  anon: number;
  converted: number;
  sampled: boolean;
}

export async function loadPlanInterest(now = Date.now()): Promise<PlanInterestReport> {
  const d7 = new Date(now - 7 * DAY);
  const d30 = new Date(now - 30 * DAY);
  const d90 = new Date(now - CLICK_RETENTION_DAYS * DAY);
  const [e90, e7, e30, checkout30, surface30, recent, started30] = await Promise.all([
    prisma.premiumClick.count({ where: { createdAt: { gte: d90 } } }),
    prisma.premiumClick.count({ where: { createdAt: { gte: d7 } } }),
    prisma.premiumClick.count({ where: { createdAt: { gte: d30 } } }),
    // A started checkout: the route's row (source "checkout"), or a wave-1 client "checkout" beacon.
    prisma.premiumClick.count({ where: { createdAt: { gte: d30 }, OR: [{ source: "checkout" }, { surface: "checkout" }] } }),
    prisma.premiumClick.groupBy({ by: ["surface"], _count: { _all: true }, where: { createdAt: { gte: d30 }, source: "click" } }),
    prisma.premiumClick.findMany({ where: { createdAt: { gte: d90 } }, orderBy: { createdAt: "desc" }, take: PLAN_CLICK_SAMPLE, select: { userId: true, surface: true, createdAt: true } }),
    prisma.premiumClick.groupBy({ by: ["surface"], _count: { _all: true }, where: { createdAt: { gte: d30 }, source: "checkout" } }),
  ]);
  const { byUser, anon } = foldPlanClicks(recent);
  const ids = [...byUser.keys()];
  const found = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true, email: true, isAdmin: true, premiumUntil: true, premiumTier: true } })
    : [];
  const users: InterestUser[] = found
    .map((u) => {
      const a = byUser.get(u.id)!;
      return { userId: u.id, count: a.count, last: a.last, surfaces: [...a.surfaces], displayName: u.displayName, email: u.email, tier: tierOf(u, now) };
    })
    .sort((a, b) => b.last.getTime() - a.last.getTime());
  return {
    totals: { d90: e90, d7: e7, d30: e30, checkout30 },
    bySurface30: surface30.map((r) => ({ k: r.surface, n: r._count._all })).sort((a, b) => b.n - a.n),
    checkoutBySurface30: started30.map((r) => ({ k: r.surface, n: r._count._all })).sort((a, b) => b.n - a.n),
    users,
    anon,
    converted: users.filter((u) => u.tier != null).length,
    sampled: e90 > PLAN_CLICK_SAMPLE,
  };
}
