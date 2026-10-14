// The public data (catalogue, offers, eBay state) is not in Neon: it lives in the
// `snapshot` branch, and a job works on a throwaway Postgres. These tests pin the
// boundaries that keep it that way, and the Prisma-shaped reader the old code uses.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { matches, productHints } from "../src/lib/public-db";

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (n === "generated" || n === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}

test("matches: equality, in, comparison, AND/OR/NOT", () => {
  const row = { productId: 5, market: "US", priceCents: 300, inStock: true };
  assert.equal(matches(row, { market: "US", inStock: true }), true);
  assert.equal(matches(row, { productId: { in: [1, 2] } }), false);
  assert.equal(matches(row, { priceCents: { gte: 300, lt: 400 } }), true);
  assert.equal(matches(row, { OR: [{ market: "AU" }, { productId: 5 }] }), true);
  assert.equal(matches(row, { NOT: { market: "US" } }), false);
});

test("productHints narrows to the ids a where names, or null when it names none", () => {
  assert.deepEqual([...(productHints({ productId: { in: [3, 4] } }) ?? [])].sort(), [3, 4]);
  assert.equal(productHints({ market: "US" }), null);
});

test("no code reads or writes the retired public models through the private client", () => {
  const allowed = new Set(["src/lib/migrate-db.ts", "scripts/migrate-db.ts", "scripts/pub-bootstrap.ts", "scripts/retire-public-tables.ts", "src/lib/pub-seed.ts"]);
  const bad: string[] = [];
  for (const f of [...walk("src"), ...walk("scripts")]) {
    if (allowed.has(f)) continue;
    const src = readFileSync(f, "utf8");
    if (/\bprisma\.(card|sealed|set|offer|ebayCheck|ebayListing|ebayGradedListing)\b/.test(src)) bad.push(f);
  }
  assert.deepEqual(bad, []);
});

test("the public Postgres client is script-side only and never a Neon URL", () => {
  const importers = [...walk("src/app"), ...walk("src/components")].filter((f) => /pubdb|pub-seed|price-snapshot-build/.test(readFileSync(f, "utf8")));
  assert.deepEqual(importers, []);
  const pubdb = readFileSync("src/lib/pubdb.ts", "utf8");
  assert.match(pubdb, /neon/i);
});

test("the one-time workflows are manual only", () => {
  for (const f of ["move-public-data.yml", "retire-public-tables.yml"]) {
    const y = readFileSync(`.github/workflows/${f}`, "utf8");
    assert.match(y, /workflow_dispatch/);
    assert.doesNotMatch(y, /^\s*schedule:/m);
    assert.doesNotMatch(y, /^\s*push:/m);
  }
  assert.match(readFileSync(".github/workflows/retire-public-tables.yml", "utf8"), /drop/);
});
