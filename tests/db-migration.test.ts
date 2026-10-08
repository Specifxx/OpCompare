// The move to the new Neon database (OP2): which variable wins, and that the
// copy script and workflow can never drop a table or touch the old database.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { databaseUrl, resolveDatabaseUrl, usingOp2 } from "../src/lib/db-url";
import { COPY_ORDER, SKIPPED } from "../scripts/migrate-db";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("OP2 wins over DATABASE_URL; DATABASE_URL is the fallback; pasted quotes and spaces are tolerated", () => {
  assert.deepEqual(resolveDatabaseUrl({ OP2: "postgres://new", DATABASE_URL: "postgres://old" }), { url: "postgres://new", name: "OP2" });
  assert.deepEqual(resolveDatabaseUrl({ DATABASE_URL: "postgres://old" }), { url: "postgres://old", name: "DATABASE_URL" });
  assert.equal(resolveDatabaseUrl({}), null);
  assert.equal(resolveDatabaseUrl({ OP2: "   ", DATABASE_URL: "postgres://old" })?.name, "DATABASE_URL", "a blank OP2 is unset");
  assert.equal(databaseUrl({ OP2: ' "postgres://new" \n' }), "postgres://new");
  assert.equal(databaseUrl({ op2: "postgres://lower" }), "postgres://lower", "Vercel keeps the case it was typed in");
  assert.equal(usingOp2({ OP2: "postgres://new", DATABASE_URL: "postgres://old" }), true);
  assert.equal(usingOp2({ DATABASE_URL: "postgres://old" }), false);
});

test("the client is built from the resolved URL, and DATABASE_URL is mirrored for tools that read only it", () => {
  const db = read("src/lib/db.ts");
  assert.match(db, /datasources: \{ db: \{ url \} \}/);
  assert.match(db, /process\.env\.DATABASE_URL = url/);
  assert.match(db, /return Boolean\(databaseUrl\(\)\)/);
  assert.match(read("scripts/db-push-safe.sh"), /if \[ -n "\$\{OP2:-\}" \]; then export DATABASE_URL="\$OP2"; fi/);
});

test("the copy list covers every Prisma model exactly once: nothing is dropped silently", () => {
  const models = [...read("prisma/schema.prisma").matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
  const listed = [...COPY_ORDER, ...SKIPPED] as string[];
  assert.deepEqual([...models].sort(), [...listed].sort());
  assert.equal(new Set(listed).size, listed.length, "no table listed twice");
  // Parents come before children (foreign keys).
  const at = (t: string) => (COPY_ORDER as readonly string[]).indexOf(t);
  for (const child of ["PriceAlert", "CollectionCard"]) assert.ok(at("Card") < at(child) && at("User") < at(child), child);
  for (const child of ["SealedWatch"]) assert.ok(at("Sealed") < at(child) && at("User") < at(child), child);
  assert.deepEqual([...SKIPPED].sort(), ["ClickEvent", "Offer"], "only the rebuildable price rows and the retired beacons stay behind");
});

test("the script only ever reads the source, refuses a self-copy, and fails on a short target", () => {
  const s = read("scripts/migrate-db.ts");
  assert.doesNotMatch(s, /src\.\$executeRaw/, "no write on the source client");
  assert.doesNotMatch(s, /DELETE FROM|DROP |TRUNCATE/i);
  assert.match(s, /ON CONFLICT DO NOTHING/);
  // Paging by one column of a composite key skipped a row (EbayCheck, 2026-10-08): order by the whole primary key.
  assert.doesNotMatch(s, /ORDER BY 1\b/);
  assert.match(s, /ORDER BY \$\{order\} LIMIT/);
  assert.match(s, /indisprimary/);
  assert.match(s, /refusing to copy a database onto itself/);
  assert.match(s, /the target has fewer rows than the source/);
  assert.match(s, /tables not in COPY_ORDER or SKIPPED/);
});

test("the migration workflow is manual, read-only for the repo, in the import's group, and prints no secret", () => {
  const wf = read(".github/workflows/migrate-database.yml");
  assert.match(wf, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(wf, /^\s*(schedule|push):/m);
  assert.match(wf, /contents: read/);
  assert.match(wf, /group: import-prices/);
  assert.match(wf, /SOURCE_DATABASE_URL: \$\{\{ secrets\.DATABASE_URL \}\}/);
  assert.match(wf, /TARGET_DATABASE_URL: \$\{\{ secrets\.OP2 \|\| vars\.OP2 \}\}/);
  assert.doesNotMatch(wf, /echo[^\n]*\$\{?(OLD|NEW|DATABASE_URL|OP2)\b/, "never echo a connection string");
});
