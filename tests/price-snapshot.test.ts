// The price snapshot: a last-good copy of the public price data on the
// `snapshot` branch, read only when the database fails (lib/price-snapshot.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SNAPSHOT_FRESH_MS,
  SNAPSHOT_SHARDS,
  dbOrSnapshot,
  isFreshAt,
  pack,
  resetDbCooldown,
  shardOf,
  unpack,
} from "../src/lib/price-snapshot";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("files are gzipped JSON; a transport that already inflated one still reads", () => {
  const v = { a: [1, 2, 3], b: "x" };
  const bytes = pack(v);
  assert.equal(bytes[0], 0x1f);
  assert.equal(bytes[1], 0x8b);
  assert.deepEqual(unpack(bytes), v);
  assert.deepEqual(unpack(Buffer.from(JSON.stringify(v))), v);
});

test("offers shard by productId % 64, two digits", () => {
  assert.equal(SNAPSHOT_SHARDS, 64);
  assert.equal(shardOf(0), "00");
  assert.equal(shardOf(63), "63");
  assert.equal(shardOf(64), "00");
  assert.equal(shardOf(694932), String(694932 % 64).padStart(2, "0"));
});

test("the freshness window is the 72 hours the loaders use for a stale offer", () => {
  assert.equal(SNAPSHOT_FRESH_MS, 72 * 3600 * 1000);
  assert.match(read("src/lib/data.ts"), /const STALE_MS = 72 \* 3600 \* 1000;/);
  const now = Date.parse("2026-10-08T00:00:00Z");
  assert.equal(isFreshAt(new Date(now - 71 * 3600e3), now), true);
  assert.equal(isFreshAt(new Date(now - 73 * 3600e3), now), false);
  assert.equal(isFreshAt("not a date", now), false);
});

test("dbOrSnapshot: the database first; a thrown error falls back; null is an answer, not a failure", async () => {
  resetDbCooldown();
  assert.equal(await dbOrSnapshot("t", async () => "db", async () => "snap"), "db");
  // A card the database does not have is null: the snapshot is not consulted.
  let asked = 0;
  assert.equal(await dbOrSnapshot("t", async () => null, async () => ((asked++, "snap"))), null);
  assert.equal(asked, 0);
  // A failure serves the snapshot.
  resetDbCooldown();
  const silent = console.error;
  console.error = () => {};
  try {
    assert.equal(await dbOrSnapshot("t", async () => Promise.reject(new Error("neon is down")), async () => "snap"), "snap");
    // For the next minute the database is skipped, so no request waits out a timeout.
    let dbCalls = 0;
    assert.equal(await dbOrSnapshot("t", async () => ((dbCalls++, "db")), async () => "snap"), "snap");
    assert.equal(dbCalls, 0);
    // A snapshot that cannot answer either leaves the original error, as before the snapshot existed.
    resetDbCooldown();
    await assert.rejects(dbOrSnapshot("t", async () => Promise.reject(new Error("neon is down")), async () => null), /neon is down/);
  } finally {
    console.error = silent;
    resetDbCooldown();
  }
});

test("the readers rebuild each loader's answer from the files, with the stale rules applied", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "snap-"));
  fs.mkdirSync(path.join(dir, "offers"));
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
  const set = { id: 7, slug: "op16", code: "OP16", name: "The Time of Battle", kind: "booster", releasedOn: "2026-06-12", cardCount: 155, sealedCount: 3 };
  const card = {
    id: 130, slug: "luffy-op01-001", name: "Luffy", tcgName: "Luffy", number: "OP01-001", rarity: "L", variant: null, printing: "standard", colors: ["Red"],
    cardType: "Leader", cost: null, power: 5000, counter: null, life: 5, attribute: "Strike", subtypes: [], effect: null, finish: null, hasImage: true,
    tcgplayerUrl: "https://example.test/130", marketUsd: 500, change7d: null, change30d: null, setId: 7,
  };
  const offer = (source: string, priceCents: number, inStock: boolean, updatedAt: string) => ({
    source, market: "US", priceCents, currency: "USD", url: `https://s.test/${source}`, inStock, condition: null, shippingCents: null, updatedAt,
  });
  fs.writeFileSync(path.join(dir, "core.json.gz"), pack({ cards: [], sets: [set] }));
  fs.writeFileSync(path.join(dir, "cards.json.gz"), pack({ [card.slug]: card }));
  fs.writeFileSync(
    path.join(dir, "offers", `${shardOf(130)}.json.gz`),
    pack({
      "130": [
        offer("store:b", 900, true, hoursAgo(1)),
        offer("store:a", 500, true, hoursAgo(1)),
        offer("store:old", 100, true, hoursAgo(80)), // stale: shown as sold out
        offer("ebay", 50, true, hoursAgo(80)), // stale eBay: dropped
      ],
    }),
  );
  fs.writeFileSync(path.join(dir, "ebay.json.gz"), pack({ listings: { "130": [{ market: "US", rank: 0, priceCents: 700, shippingCents: 0, currency: "USD", url: "u", title: "t", imageUrl: "i" }] }, graded: {} }));
  process.env.SNAPSHOT_LOCAL_DIR = dir;
  try {
    const { snapCardDetail, snapEbayPanel } = await import("../src/lib/price-snapshot-read");
    const d = await snapCardDetail(card.slug);
    assert.ok(d);
    assert.equal(d.set.code, "OP16");
    assert.equal("setId" in d, false);
    assert.deepEqual(d.offers.map((o) => [o.source, o.inStock]), [["store:old", false], ["store:a", true], ["store:b", true]]);
    assert.equal(await snapCardDetail("no-such-card"), null);
    assert.equal((await snapEbayPanel(130))?.listings.length, 1);
    assert.deepEqual(await snapEbayPanel(999), { listings: [], graded: [] });
  } finally {
    delete process.env.SNAPSHOT_LOCAL_DIR;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("every public price loader falls back to the snapshot, and the history ref survives a database failure", () => {
  const data = read("src/lib/data.ts");
  for (const [key, snap] of [
    ["catalog-core", "snapCore()"],
    ["catalog-prices", "snapPrices()"],
    ["card-detail", "snapCardDetail(slug)"],
    ["sealed-catalog", "snapSealedCatalog()"],
    ["sealed-detail", "snapSealedDetail(slug)"],
    ["site-stats", "snapSiteStats()"],
    ["ebay-panel", "snapEbayPanel(productId)"],
    ["chase-strip", "snapChaseStrip()"],
  ] as const) {
    assert.ok(data.includes(`dbOrSnapshot("${key}", async () => {`), `${key} is wrapped`);
    assert.ok(data.includes(`}, () => ${snap}),`), `${key} falls back to ${snap}`);
  }
  // A database error is not "no ref": the charts read the branch instead of going blank.
  assert.match(data, /prisma\.meta\.findUnique\(\{ where: \{ key: "historyRef" \}[^)]*\)\.then\(\(m\) => m\?\.value \?\? null, \(\) => null\)/);
});

test("the snapshot holds public price data only, and no page imports its writer", () => {
  const build = read("src/lib/price-snapshot-build.ts");
  assert.doesNotMatch(build, /prisma\.(user|account|session|notification|watch|collection|inbox|alert|deck|review|counter|meta)/i, "no private table");
  for (const f of fs.readdirSync(path.join(ROOT, "src/app"), { recursive: true }) as string[]) {
    if (!/\.(ts|tsx)$/.test(f)) continue;
    assert.doesNotMatch(read(path.join("src/app", f)), /price-snapshot-build/, `${f} must not import the writer`);
  }
  // Rows older than the window never go in.
  assert.match(build, /updatedAt: \{ gt: since \}/);
});

test("the import builds and force-pushes ONE orphan commit, never failing the import, and Vercel never builds the branch", () => {
  const wf = read(".github/workflows/import-prices.yml");
  const build = wf.slice(wf.indexOf("- name: Build the price snapshot"), wf.indexOf("- name: Point the site at it"));
  assert.match(build, /npx tsx scripts\/price-snapshot\.ts/);
  assert.match(build, /steps\.import\.outcome == 'success'/);
  assert.equal((build.match(/continue-on-error: true/g) ?? []).length, 2);
  assert.match(build, /git init --quiet -b snapshot/);
  assert.match(build, /git push --quiet --force "\$REMOTE" snapshot/);
  assert.doesNotMatch(build, /git (pull|fetch|merge|rebase)/, "no history is carried over");
  assert.match(build, /deploymentEnabled": false/);
  assert.equal(JSON.parse(read("vercel.json")).git.deploymentEnabled.snapshot, false);
  // An empty-looking snapshot is not published.
  assert.match(read("scripts/price-snapshot.ts"), /throw new Error\(`snapshot looks empty/);
});
