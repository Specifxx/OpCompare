// The PUBLIC-data Prisma client (prisma/public/schema.prisma): the catalogue,
// offers and eBay state, in the throwaway Postgres a job runs on its own runner
// (PUBLIC_DATABASE_URL), seeded from the `snapshot` branch (lib/pub-seed.ts) and
// published back to it. Never in Neon, so this refuses a Neon address outright:
// a mistyped secret must not put 600,000 offer rows back into the free tier.
//
// Script-side only. Nothing under src/app or src/components may import it
// (tests/public-data.test.ts): the site reads the snapshot, not a database.
import { PrismaClient } from "../generated/public-client";

const url = process.env.PUBLIC_DATABASE_URL?.trim() || "";

if (url && /neon\.tech|neon\.build|\.neon\./i.test(url)) {
  throw new Error("PUBLIC_DATABASE_URL points at Neon. Public data lives on GitHub and in a throwaway database on the runner, never in Neon (lib/pubdb.ts).");
}

const globalForPub = globalThis as unknown as { pub?: PrismaClient };

/** The client. With no PUBLIC_DATABASE_URL it points at nothing, so a query fails loudly instead of landing elsewhere. */
export const pub =
  globalForPub.pub ??
  new PrismaClient({
    datasources: { db: { url: url || "postgresql://unset:unset@127.0.0.1:1/unset" } },
    log: process.env.PRISMA_LOG === "1" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPub.pub = pub;

export const hasPublicDatabase = (): boolean => Boolean(url);

/** Throw a clear error (for a script's first line) when the working copy is not configured. */
export function requirePublicDatabase(): void {
  if (!url) throw new Error("PUBLIC_DATABASE_URL is not set: this job needs the throwaway Postgres (a service container in the workflow; locally, any empty local database).");
}

export type PubClient = PrismaClient;
