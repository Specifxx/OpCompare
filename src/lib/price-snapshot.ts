// THE PUBLIC DATA: the catalogue, prices, offers and eBay state of OP Compare,
// kept as files on the `snapshot` branch of the public repo (owner, 2026-10-14:
// "offload everything public from Neon to GitHub"). It is the ONLY persistent
// copy. Neon holds what is private (accounts, alerts, collections, the inbox,
// Stripe, run records); nothing public is ever written to it.
//
// WRITTEN by scripts/price-snapshot.ts at the end of the import and of the eBay
// pass (import-prices.yml, ebay-prices.yml): a few dozen gzipped JSON files,
// force-pushed as ONE orphan commit, so the branch is always exactly the newest
// state and never accumulates history. Each job starts by SEEDING a throwaway
// Postgres on its runner from the branch (lib/pub-seed.ts), runs against it with
// the same code and SQL as ever, then writes the result back
// (lib/price-snapshot-build.ts). The two jobs share one concurrency group, so
// they never publish from the same seed.
//
// READ by every public loader (lib/price-snapshot-read.ts) and by the alert,
// newsletter, inbox and admin code (lib/public-data.ts, lib/public-db.ts), from
// GitHub's raw CDN, or from a local directory when SNAPSHOT_LOCAL_DIR is set (the
// alert steps read the snapshot the import just built).
//
// Offers carry their own timestamps: the pages treat a row older than 72 hours as
// sold out (an eBay row as gone), so a snapshot that outlives a long outage fades
// instead of showing dead prices. Store rows are KEPT 14 days (the alert engine
// tells a sold-out card from a dead scraper by them); eBay rows are dropped at 72.
//
// No private data, ever: this branch is public.
import { gunzipSync, gzipSync } from "node:zlib";
import fs from "node:fs/promises";
import path from "node:path";

export const SNAPSHOT_BRANCH = "snapshot";
/** The legacy layout: offers sharded by productId % 64 (the site deployed before 2026-10-14 reads it). */
export const SNAPSHOT_SHARDS = 64;
/** An offer older than this is dropped by the writer and by the reader (lib/data.ts STALE_MS). */
export const SNAPSHOT_FRESH_MS = 72 * 3600 * 1000;
/**
 * A store's offers stay in the snapshot this long (the pages show them as sold out after 72 hours):
 * the alert engine needs rows up to ALERT_OUTAGE_MAX_MS old to tell a sold-out card from a store whose
 * scraper is down (tests/public-data.test.ts pins the two equal).
 */
export const SNAPSHOT_OFFER_KEEP_MS = 14 * 24 * 3600 * 1000;
export const SNAPSHOT_VERSION = 1;
/** A snapshot older than this is not trusted as the first source; the database is asked first (the snapshot stays the last resort). */
export const SNAPSHOT_SERVE_MS = 48 * 3600 * 1000;

export interface SnapshotMeta {
  v: typeof SNAPSHOT_VERSION;
  generatedAt: string;
  /** finishedAt of the newest successful import, when the writer could read it. */
  lastImportAt: string | null;
  counts: { cards: number; sealed: number; offers: number; ebayListings: number };
  /** The `o/<range>` files present, so a reader (the seed) need not guess. Absent in older snapshots. */
  ranges?: string[];
  /** Pairs in ebay-checks.json.gz (the eBay pass's memory of what it searched and when). */
  ebayChecks?: number;
}

/**
 * The newer layout (owner, 2026-10-14): offers grouped by product-id RANGE, not
 * id % 64. A set's cards have near-consecutive ids, so a basket, a set checklist
 * or a deal page reads one or two small files (~40 KB each) instead of up to 64.
 * Written as `o/<range>.json.gz` beside the legacy `offers/NN.json.gz` (which the
 * site deployed before the migration still reads) until SNAPSHOT_LEGACY_SHARDS=0.
 */
export const RANGE_SIZE = 1024;
export const rangeOf = (productId: number) => String(Math.floor(productId / RANGE_SIZE)).padStart(3, "0");
export const rangeFile = (productId: number) => `o/${rangeOf(productId)}.json.gz`;

export const shardOf = (productId: number) => (((productId % SNAPSHOT_SHARDS) + SNAPSHOT_SHARDS) % SNAPSHOT_SHARDS).toString().padStart(2, "0");

export function pack(value: unknown): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(value)), { level: 9 });
}

export function unpack<T>(bytes: Buffer | Uint8Array): T {
  const b = Buffer.from(bytes);
  // GitHub's raw CDN serves the file as stored; tolerate a transport that already inflated it.
  const text = b.length > 2 && b[0] === 0x1f && b[1] === 0x8b ? gunzipSync(b).toString("utf8") : b.toString("utf8");
  return JSON.parse(text) as T;
}

/** True for an offer row still inside the freshness window at `now`. */
export function isFreshAt(updatedAt: Date | string, now: number = Date.now()): boolean {
  const t = typeof updatedAt === "string" ? Date.parse(updatedAt) : updatedAt.getTime();
  return Number.isFinite(t) && now - t < SNAPSHOT_FRESH_MS;
}

// ── Reading ──────────────────────────────────────────────────────────────────
const RAW = (process.env.SNAPSHOT_RAW_BASE || "https://raw.githubusercontent.com/Specifxx/OpCompare").replace(/\/+$/, "");
const MEMO_MS = 10 * 60 * 1000;
const MEMO_MAX = 64; // the range files are small; a script reads a few hundred of them
const memo = new Map<string, { at: number; value: unknown }>();

/**
 * One snapshot file (e.g. "core.json.gz", "offers/07.json.gz"), or null when it
 * cannot be had. SNAPSHOT_LOCAL_DIR reads a local build (dev, tests). A warm
 * process keeps the decoded file for ten minutes; Next's fetch cache keeps the
 * bytes ten minutes more (the raw CDN caches a branch name for a few minutes).
 */
/** Test hook: forget every file read so far. */
export function clearSnapshotMemo(): void {
  memo.clear();
}

export async function snapshotFile<T>(rel: string): Promise<T | null> {
  const hit = memo.get(rel);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.value as T;
  let value: T | null = null;
  try {
    const local = process.env.SNAPSHOT_LOCAL_DIR;
    if (local) {
      value = unpack<T>(await fs.readFile(path.join(local, rel)));
    } else {
      const r = await fetch(`${RAW}/${SNAPSHOT_BRANCH}/${rel}`, { next: { revalidate: 600 } });
      if (r.ok) value = unpack<T>(new Uint8Array(await r.arrayBuffer()));
    }
  } catch {
    value = null;
  }
  if (value != null) {
    if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value as string);
    memo.set(rel, { at: Date.now(), value });
  }
  return value;
}
