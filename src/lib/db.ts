// The Prisma client, one per process.
//
// ── EGRESS RULES (Neon free tier: 5 GB/month of transfer) ────────────────────
// RiftCompare learned these the expensive way (DECISIONS.md there, 2026-09-11):
//   1. A request path never reads the database directly. Pages and API routes
//      go through the self-cached loaders in lib/data.ts (unstable_cache, tag
//      "prices", purged by the import's POST /api/revalidate).
//   2. Never wrap one of those loaders in another unstable_cache, and never call
//      one from inside an unstable_cache callback: Next bypasses the inner cache
//      there and the loader recomputes on every outer miss.
//   3. Select only the columns a page renders. The catalogue loader is the one
//      wide read, and it stays under the Data Cache's ~2 MB item ceiling.
//   4. No generateStaticParams prewarming on database-backed dynamic routes, and
//      production deploys are gated to once a day (scripts/vercel-ignore-build.sh):
//      every deploy clears the ISR cache and re-renders from the database.
import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// The connection string is OP2 when set, else DATABASE_URL (lib/db-url.ts). The
// override is passed to the client AND mirrored into DATABASE_URL, which the
// schema's env() reads, so a tool that only looks at DATABASE_URL (prisma db
// push, a script) lands on the same database as the app.
const url = databaseUrl();
if (url && process.env.DATABASE_URL !== url) process.env.DATABASE_URL = url;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.PRISMA_LOG === "1" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function hasDatabase(): boolean {
  return Boolean(databaseUrl());
}
