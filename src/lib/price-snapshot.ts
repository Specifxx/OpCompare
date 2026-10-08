// The price snapshot: a last-good copy of everything the public price pages
// read from Postgres, kept on the `snapshot` branch of the public repo so the
// site keeps serving prices when the database does not answer (an outage, a
// spent Neon transfer allowance). Owner's call, 2026-10-08.
//
// WRITTEN by scripts/price-snapshot.ts after every import (import-prices.yml):
// a handful of gzipped JSON files, force-pushed as ONE orphan commit, so the
// branch is always exactly the newest snapshot and never accumulates history.
// An offer not refreshed in 72 hours is not in it ("old prices are redundant"),
// and a read applies the same 72-hour rule to what it finds, so a snapshot that
// outlives a long outage fades to "sold out" instead of showing dead prices.
//
// READ FIRST (owner, 2026-10-08, to keep the free Neon allowance of 5 GB a month
// for the whole month): lib/data.ts wraps each public price loader in
// snapshotFirst(): the snapshot when it is under 48 hours old, the database when
// it is not there, stale, or has no answer, and the snapshot again as the last
// resort if the database then fails (dbOrSnapshot). Page loads therefore cost
// Neon nothing. Reads go to GitHub's raw CDN.
//
// No private data, ever: accounts, watches, alerts, collections and the inbox
// are not in it, and this directory is public.
import { gunzipSync, gzipSync } from "node:zlib";
import fs from "node:fs/promises";
import path from "node:path";

export const SNAPSHOT_BRANCH = "snapshot";
/** Offers are sharded by productId % 64, so a card page fetches one ~300 KB file. */
export const SNAPSHOT_SHARDS = 64;
/** An offer older than this is dropped by the writer and by the reader (lib/data.ts STALE_MS). */
export const SNAPSHOT_FRESH_MS = 72 * 3600 * 1000;
export const SNAPSHOT_VERSION = 1;
/** A snapshot older than this is not trusted as the first source; the database is asked first (the snapshot stays the last resort). */
export const SNAPSHOT_SERVE_MS = 48 * 3600 * 1000;

export interface SnapshotMeta {
  v: typeof SNAPSHOT_VERSION;
  generatedAt: string;
  /** finishedAt of the newest successful import, when the writer could read it. */
  lastImportAt: string | null;
  counts: { cards: number; sealed: number; offers: number; ebayListings: number };
}

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
const MEMO_MAX = 12;
const memo = new Map<string, { at: number; value: unknown }>();

/**
 * One snapshot file (e.g. "core.json.gz", "offers/07.json.gz"), or null when it
 * cannot be had. SNAPSHOT_LOCAL_DIR reads a local build (dev, tests). A warm
 * process keeps the decoded file for ten minutes; Next's fetch cache keeps the
 * bytes ten minutes more (the raw CDN caches a branch name for a few minutes).
 */
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

// ── The fallback gate ────────────────────────────────────────────────────────
const DB_TIMEOUT_MS = 6000;
/** After a database failure, skip the database for this long so each request does not wait out the timeout. */
const DB_COOLDOWN_MS = 60_000;
let dbDownUntil = 0;

/** Test hook: forget a recorded failure. */
export function resetDbCooldown(): void {
  dbDownUntil = 0;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(`database did not answer within ${ms} ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

/**
 * The database first. If it throws or does not answer in six seconds, serve the
 * GitHub snapshot's version of the same answer (and go straight to the snapshot
 * for the next minute). A "not found" is an ANSWER (null), not a failure: only a
 * thrown error falls back. When the snapshot cannot answer either, the original
 * error is thrown, exactly as before the snapshot existed.
 */
export async function dbOrSnapshot<T>(name: string, db: () => Promise<T>, snap: () => Promise<T | null>): Promise<T> {
  if (Date.now() < dbDownUntil) {
    const s = await snap().catch(() => null);
    if (s != null) return s;
  }
  try {
    return await withTimeout(db(), DB_TIMEOUT_MS);
  } catch (e) {
    dbDownUntil = Date.now() + DB_COOLDOWN_MS;
    console.error(`[price-snapshot] ${name}: database failed, trying the GitHub snapshot —`, e instanceof Error ? e.message : e);
    const s = await snap().catch(() => null);
    if (s != null) return s;
    throw e;
  }
}

/**
 * True when the snapshot is the first place to look: it exists, was built in the
 * last 48 hours, and nobody has switched it off. Outside production the database
 * is used (a dev checkout must not show production's prices), unless a local
 * snapshot is pointed at with SNAPSHOT_LOCAL_DIR. PRICES_FROM_DB=1 is the
 * escape hatch: set it in Vercel to read prices from Postgres as before.
 */
export async function snapshotIsFirst(): Promise<boolean> {
  if (process.env.PRICES_FROM_DB === "1") return false;
  if (process.env.NODE_ENV !== "production" && !process.env.SNAPSHOT_LOCAL_DIR) return false;
  const m = await snapshotFile<SnapshotMeta>("meta.json");
  const t = m ? Date.parse(m.generatedAt) : NaN;
  return Number.isFinite(t) && Date.now() - t < SNAPSHOT_SERVE_MS;
}

/**
 * The GitHub snapshot first, the database second. A snapshot answer of null
 * (a card the snapshot does not have yet) goes on to the database, which is then
 * asked with the usual fallback back to the snapshot.
 */
export async function snapshotFirst<T>(name: string, db: () => Promise<T>, snap: () => Promise<T | null>): Promise<T> {
  if (await snapshotIsFirst()) {
    const s = await snap().catch(() => null);
    if (s != null) return s;
  }
  return dbOrSnapshot(name, db, snap);
}
