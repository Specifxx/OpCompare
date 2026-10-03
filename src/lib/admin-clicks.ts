// /admin/clicks and /admin/premium reads (RiftCompare's admin pages of the same
// names). Owner-only traffic, so UNCACHED by design (unstable_cache lives in
// lib/data.ts only), grouped in the database, with a capped recent list.
import { prisma } from "./db";
import { tierOf } from "./premium";
import { STORE_BY_KEY } from "./stores";
import type { Tier } from "./plans";

const DAY = 86_400_000;
export const RECENT_CLICKS = 200;
export const PLAN_CLICK_SAMPLE = 2000;

/** A data-retailer key as a person reads it: a store's name, else the key. */
export function retailerLabel(key: string): string {
  if (key === "tcgplayer") return "TCGplayer";
  if (key === "ebay_search") return "eBay search";
  if (key.startsWith("ebay")) return `eBay (${key.slice(5).toUpperCase() || "listing"})`;
  return STORE_BY_KEY[key]?.name ?? key;
}

export interface RetailerRow {
  retailer: string;
  d7: number;
  d30: number;
  all: number;
}

/** Join three groupBy results into one row per retailer, busiest (30 d) first. */
export function mergeRetailerCounts(all: { k: string; n: number }[], d30: { k: string; n: number }[], d7: { k: string; n: number }[]): RetailerRow[] {
  const m30 = new Map(d30.map((r) => [r.k, r.n]));
  const m7 = new Map(d7.map((r) => [r.k, r.n]));
  return all.map((r) => ({ retailer: r.k, all: r.n, d30: m30.get(r.k) ?? 0, d7: m7.get(r.k) ?? 0 })).sort((a, b) => b.d30 - a.d30 || b.all - a.all || a.retailer.localeCompare(b.retailer));
}

export interface ClicksReport {
  rows: RetailerRow[];
  byCountry: { k: string; n: number }[];
  byPage: { k: string; n: number }[];
  topSlugs: { k: string; n: number }[];
  signedIn30: number;
  recent: { retailer: string; page: string; slug: string | null; country: string; signedIn: boolean; createdAt: Date }[];
}

export async function loadClicks(now = Date.now()): Promise<ClicksReport> {
  const d7 = new Date(now - 7 * DAY);
  const d30 = new Date(now - 30 * DAY);
  const counts = (g: { _count: { _all: number } }[], key: (r: never) => string | null) =>
    g.map((r) => ({ k: key(r as never) ?? "—", n: r._count._all })).sort((a, b) => b.n - a.n);
  const [all, last30, last7, country30, page30, slug30, signedIn30, recent] = await Promise.all([
    prisma.clickEvent.groupBy({ by: ["retailer"], _count: { _all: true } }),
    prisma.clickEvent.groupBy({ by: ["retailer"], _count: { _all: true }, where: { createdAt: { gte: d30 } } }),
    prisma.clickEvent.groupBy({ by: ["retailer"], _count: { _all: true }, where: { createdAt: { gte: d7 } } }),
    prisma.clickEvent.groupBy({ by: ["country"], _count: { _all: true }, where: { createdAt: { gte: d30 } } }),
    prisma.clickEvent.groupBy({ by: ["page"], _count: { _all: true }, where: { createdAt: { gte: d30 } } }),
    prisma.clickEvent.groupBy({ by: ["slug"], _count: { _all: true }, where: { createdAt: { gte: d30 }, slug: { not: null } }, orderBy: { _count: { slug: "desc" } }, take: 15 }),
    prisma.clickEvent.count({ where: { createdAt: { gte: d30 }, userId: { not: null } } }),
    prisma.clickEvent.findMany({ orderBy: { createdAt: "desc" }, take: RECENT_CLICKS, select: { retailer: true, page: true, slug: true, country: true, userId: true, createdAt: true } }),
  ]);
  const byKey = (g: { retailer: string; _count: { _all: number } }[]) => g.map((r) => ({ k: r.retailer, n: r._count._all }));
  return {
    rows: mergeRetailerCounts(byKey(all), byKey(last30), byKey(last7)),
    byCountry: counts(country30, (r: { country: string }) => r.country),
    byPage: counts(page30, (r: { page: string }) => r.page),
    topSlugs: counts(slug30, (r: { slug: string | null }) => r.slug),
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
  totals: { all: number; d7: number; d30: number; checkout30: number };
  bySurface30: { k: string; n: number }[];
  users: InterestUser[];
  anon: number;
  converted: number;
  sampled: boolean;
}

export async function loadPlanInterest(now = Date.now()): Promise<PlanInterestReport> {
  const d7 = new Date(now - 7 * DAY);
  const d30 = new Date(now - 30 * DAY);
  const [all, e7, e30, checkout30, surface30, recent] = await Promise.all([
    prisma.premiumClick.count(),
    prisma.premiumClick.count({ where: { createdAt: { gte: d7 } } }),
    prisma.premiumClick.count({ where: { createdAt: { gte: d30 } } }),
    prisma.premiumClick.count({ where: { createdAt: { gte: d30 }, surface: "checkout" } }),
    prisma.premiumClick.groupBy({ by: ["surface"], _count: { _all: true }, where: { createdAt: { gte: d30 } } }),
    prisma.premiumClick.findMany({ orderBy: { createdAt: "desc" }, take: PLAN_CLICK_SAMPLE, select: { userId: true, surface: true, createdAt: true } }),
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
    totals: { all, d7: e7, d30: e30, checkout30 },
    bySurface30: surface30.map((r) => ({ k: r.surface, n: r._count._all })).sort((a, b) => b.n - a.n),
    users,
    anon,
    converted: users.filter((u) => u.tier != null).length,
    sampled: all > PLAN_CLICK_SAMPLE,
  };
}
