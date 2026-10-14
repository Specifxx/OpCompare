// The price snapshot: the ONLY persistent copy of the public data (catalogue,
// offers, eBay state), on the `snapshot` branch (lib/price-snapshot.ts). The
// site, the alert jobs and the next import all read it; the import and the eBay
// pass write it. Neon holds none of it.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  RANGE_SIZE,
  SNAPSHOT_FRESH_MS,
  SNAPSHOT_OFFER_KEEP_MS,
  SNAPSHOT_SHARDS,
  clearSnapshotMemo,
  isFreshAt,
  pack,
  rangeFile,
  rangeOf,
  shardOf,
  snapshotFile,
  unpack,
} from "../src/lib/price-snapshot";
import { ALERT_OUTAGE_MAX_MS } from "../src/lib/alert-price";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

beforeEach(() => clearSnapshotMemo());

test("files are gzipped JSON; a transport that already inflated one still reads", () => {
  const v = { a: [1, 2, 3], b: "x" };
  const bytes = pack(v);
  assert.equal(bytes[0], 0x1f);
  assert.equal(bytes[1], 0x8b);
  assert.deepEqual(unpack(bytes), v);
  assert.deepEqual(unpack(Buffer.from(JSON.stringify(v))), v);
});

test("offers are grouped by product-id RANGE (a set is one or two small files), and still by id % 64 for the older site", () => {
  assert.equal(RANGE_SIZE, 1024);
  assert.equal(rangeOf(0), "000");
  assert.equal(rangeOf(1023), "000");
  assert.equal(rangeOf(1024), "001");
  assert.equal(rangeOf(694932), String(Math.floor(694932 / 1024)).padStart(3, "0"));
  assert.equal(rangeFile(694932), `o/${rangeOf(694932)}.json.gz`);
  // A set's cards have near-consecutive ids: 150 of them land in at most two range files.
  const ids = Array.from({ length: 150 }, (_, i) => 685300 + i);
  assert.ok(new Set(ids.map(rangeOf)).size <= 2);
  assert.equal(SNAPSHOT_SHARDS, 64);
  assert.equal(shardOf(64), "00");
  assert.equal(shardOf(694932), String(694932 % 64).padStart(2, "0"));
});

test("the windows: pages treat a row older than 72 hours as sold out; store rows are KEPT 14 days for the alert engine", () => {
  assert.equal(SNAPSHOT_FRESH_MS, 72 * 3600 * 1000);
  assert.match(read("src/lib/data.ts"), /const STALE_MS = 72 \* 3600 \* 1000;/);
  assert.equal(SNAPSHOT_OFFER_KEEP_MS, ALERT_OUTAGE_MAX_MS, "the alert engine tells sold out from a dead scraper by rows this old");
  const now = Date.parse("2026-10-08T00:00:00Z");
  assert.equal(isFreshAt(new Date(now - 71 * 3600e3), now), true);
  assert.equal(isFreshAt(new Date(now - 73 * 3600e3), now), false);
  assert.equal(isFreshAt("not a date", now), false);
});

// ── A real snapshot on disk, read through the reader ─────────────────────────
function fixture(opts: { ranges?: boolean; omit?: string[] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "snap-"));
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
  const set = { id: 7, slug: "op16", code: "OP16", name: "The Time of Battle", tcgName: "OP16: The Time of Battle", kind: "booster", releasedOn: "2026-06-12", cardCount: 155, sealedCount: 3 };
  const card = {
    id: 130, slug: "luffy-op01-001", name: "Luffy", tcgName: "Luffy", number: "OP01-001", rarity: "L", variant: null, printing: "standard", colors: ["Red"],
    cardType: "Leader", cost: null, power: 5000, counter: null, life: 5, attribute: "Strike", subtypes: ["Straw Hat Crew"], effect: "[Activate: Main] Draw 1.", finish: null, hasImage: true,
    tcgplayerUrl: "https://example.test/130", marketUsd: 500, change7d: null, change30d: null, setId: 7, firstSeen: hoursAgo(1000),
  };
  const offer = (source: string, priceCents: number, inStock: boolean, updatedAt: string, market = "US") => ({
    source, market, priceCents, currency: "USD", url: `https://s.test/${source}`, inStock, condition: null, shippingCents: null, updatedAt,
  });
  const offers = {
    "130": [
      offer("store:b", 900, true, hoursAgo(1)),
      offer("store:a", 500, true, hoursAgo(1)),
      offer("store:old", 100, true, hoursAgo(80)), // stale: shown as sold out
      offer("ebay", 50, true, hoursAgo(80)), // stale eBay: dropped
    ],
  };
  const files: Record<string, unknown> = {
    "meta.json": Buffer.from(JSON.stringify({ v: 1, generatedAt: hoursAgo(1), lastImportAt: hoursAgo(1), counts: { cards: 1, sealed: 0, offers: 4, ebayListings: 1 }, ...(opts.ranges === false ? {} : { ranges: [rangeOf(130)] }) })),
    "core.json.gz": pack({ cards: [], sets: [set] }),
    "prices.json.gz": pack({ ids: [130], prices: [[500, [450, null, null, null, null, null], [2, 0, 0, 0, 0, 0], null, null, 700]], at: hoursAgo(1) }),
    "cards.json.gz": pack({ [card.slug]: card }),
    "sealed.json.gz": pack([]),
    "ebay.json.gz": pack({ listings: { "130": [{ market: "US", rank: 0, priceCents: 700, shippingCents: 0, currency: "USD", url: "u", title: "t", imageUrl: null, u: Date.now() - 3600e3 }] }, graded: {} }),
    [opts.ranges === false ? `offers/${shardOf(130)}.json.gz` : rangeFile(130)]: pack(offers),
    "deal-inputs.json.gz": pack({ US: [[130, 500, 450, null, 0]], AU: [], UK: [], SG: [], CA: [], EU: [] }),
    "store-prices/US.json.gz": pack({ "store:a": [130, 500, 131, 800], "store:b": [130, 900] }),
    "store-stats.json.gz": pack([{ source: "store:a", market: "US", offers: 2, inStock: 2, singlesInStock: 2, sealedInStock: 0, cheapest: 1, newest: hoursAgo(1) }]),
    "store-listings/US.json.gz": pack({ "store:a": { top: [[130, 500, null, "u"]], cheapestHere: [] } }),
    "sealed-soldout.json.gz": pack({ US: [9], AU: [], UK: [], SG: [], CA: [], EU: [] }),
    "stats.json.gz": pack({ lastImportAt: hoursAgo(1), storeOffers: [], ebayLive: true }),
  };
  for (const [rel, bytes] of Object.entries(files)) {
    if (opts.omit?.includes(rel)) continue;
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), bytes as Buffer);
  }
  return { dir, card };
}

async function withSnapshot<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  process.env.SNAPSHOT_LOCAL_DIR = dir;
  clearSnapshotMemo();
  try {
    return await fn();
  } finally {
    delete process.env.SNAPSHOT_LOCAL_DIR;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("the readers rebuild each loader's answer from the files, with the stale rules applied", async () => {
  const { dir, card } = fixture();
  await withSnapshot(dir, async () => {
    const { snapCardDetail, snapEbayPanel, snapOffersOf } = await import("../src/lib/price-snapshot-read");
    const d = await snapCardDetail(card.slug);
    assert.ok(d);
    assert.equal(d.set.code, "OP16");
    assert.equal("setId" in d, false);
    assert.equal("firstSeen" in d, false, "the page's CardDetail does not carry the first-seen date");
    assert.deepEqual(d.offers.map((o) => [o.source, o.inStock]), [["store:old", false], ["store:a", true], ["store:b", true]]);
    assert.equal(await snapCardDetail("no-such-card"), null, "a slug the snapshot does not have is null: a 404");
    assert.equal((await snapEbayPanel(130)).listings.length, 1);
    assert.deepEqual(await snapEbayPanel(999), { listings: [], graded: [] });
    // Raw rows by id: the range file, and nothing for an id in a range that has no file.
    assert.equal((await snapOffersOf([130])).get(130)?.length, 4);
    assert.equal((await snapOffersOf([5_000_000])).size, 0);
  });
});

test("a snapshot written before the range files still reads, through the legacy shards", async () => {
  const { dir, card } = fixture({ ranges: false });
  await withSnapshot(dir, async () => {
    const { snapCardDetail } = await import("../src/lib/price-snapshot-read");
    assert.equal((await snapCardDetail(card.slug))?.offers.length, 3);
  });
});

test("a file that cannot be read THROWS: it is never 'card not found' or 'no deals', which the cache would keep for hours", async () => {
  const { dir, card } = fixture({ omit: ["cards.json.gz", "deal-inputs.json.gz", "sealed-soldout.json.gz", "ebay.json.gz"] });
  await withSnapshot(dir, async () => {
    const r = await import("../src/lib/price-snapshot-read");
    await assert.rejects(() => r.snapCardDetail(card.slug), /cards\.json\.gz could not be read/);
    await assert.rejects(() => r.snapDealInputs("US"), /deal-inputs/);
    await assert.rejects(() => r.snapSoldOut(), /sealed-soldout/);
    await assert.rejects(() => r.snapEbayPanel(130), /ebay\.json\.gz/);
  });
  // A range the snapshot LISTS but cannot serve is an error too, not an empty product.
  const f = fixture({ omit: ["o/" + rangeOf(130) + ".json.gz"] });
  await withSnapshot(f.dir, async () => {
    const { snapOffersOf } = await import("../src/lib/price-snapshot-read");
    await assert.rejects(() => snapOffersOf([130]), /could not be read/);
  });
});

test("the derived answers come straight from their files", async () => {
  const { dir } = fixture();
  await withSnapshot(dir, async () => {
    const r = await import("../src/lib/price-snapshot-read");
    assert.deepEqual(await r.snapDealInputs("US"), [[130, 500, 450, null, 0]]);
    assert.deepEqual(await r.snapDealInputs("AU"), []);
    assert.deepEqual(await r.snapStorePrices("US"), { "store:a": [130, 500, 131, 800], "store:b": [130, 900] });
    const stats = await r.snapStoreStats();
    assert.equal(stats[0].offers, 2);
    assert.equal("newest" in stats[0], false, "the page's StoreStat does not carry the newest-row date");
    assert.deepEqual((await r.snapStoreListings("US", "store:a")).top, [[130, 500, null, "u"]]);
    assert.deepEqual(await r.snapStoreListings("US", "store:nobody"), { top: [], cheapestHere: [] });
    assert.deepEqual((await r.snapSoldOut()).US, [9]);
    const text = await r.snapCardTextRows();
    assert.deepEqual(text, [{ number: "OP01-001", subtypes: ["Straw Hat Crew"], effect: "[Activate: Main] Draw 1." }]);
  });
});

test("the catalogue as rows: sets, cards with their lows and set, and the first-seen date the newsletter uses", async () => {
  const { dir } = fixture();
  await withSnapshot(dir, async () => {
    const { publicCatalog } = await import("../src/lib/public-data");
    const c = await publicCatalog();
    assert.equal(c.sets[0].tcgName, "OP16: The Time of Battle");
    assert.ok(c.sets[0].releasedOn instanceof Date);
    const card = c.cards[0];
    assert.equal(card.set.code, "OP16");
    assert.equal(card.lowUS, 450);
    assert.equal(card.lowAU, null);
    assert.equal(card.storesUS, 2);
    assert.equal(card.high90Usd, 700);
    assert.ok(card.firstSeen instanceof Date && card.firstSeen.getTime() < Date.now() - 900 * 3600e3);
  });
});

test("snapshotFile: a local build wins, a missing file is null, and a read is remembered", async () => {
  const { dir } = fixture();
  await withSnapshot(dir, async () => {
    assert.deepEqual(await snapshotFile("deal-inputs.json.gz"), { US: [[130, 500, 450, null, 0]], AU: [], UK: [], SG: [], CA: [], EU: [] });
    assert.equal(await snapshotFile("nope.json.gz"), null);
  });
});

// ── The wiring ───────────────────────────────────────────────────────────────
test("no public loader reads the database: every price, catalogue and eBay loader is answered from the snapshot", () => {
  const data = read("src/lib/data.ts");
  // The only Prisma models data.ts still reads are private ones.
  const models = [...data.matchAll(/prisma\.(\w+)\./g)].map((m) => m[1]);
  assert.deepEqual([...new Set(models)].sort(), ["cardDemand", "counter", "feedback", "meta", "publishedDeck", "risingSnapshot"]);
  assert.doesNotMatch(data, /\$queryRaw|snapshotFirst|dbOrSnapshot|"Offer"|FROM "Card"/);
  for (const loader of ["loadCore", "loadPrices", "getCardDetail", "getSealedCatalog", "getSealedDetail", "getSiteStats", "getDealInputs", "getStoreStats", "getEbayPanel", "getEbayPicks", "getSealedSoldOut", "getChaseStrip"]) {
    const at = data.indexOf(`const ${loader} = unstable_cache(`);
    assert.ok(at > 0, loader);
    assert.match(data.slice(at, at + 400), /snap[A-Z]\w+\(/, `${loader} reads the snapshot`);
  }
  // The history ref survives a snapshot failure (it is Neon's Meta row, not a snapshot file).
  assert.match(data, /key: "historyRef"/);
});

test("the snapshot holds public data only, and no page imports its writer or the working copy", () => {
  const build = read("src/lib/price-snapshot-build.ts");
  assert.doesNotMatch(build, /prisma\.(user|priceAlert|collectionCard|notification|contactMessage|feedback|supportTicket|premiumClick)\b|\.email\b/);
  const walk = (d: string): string[] => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
  for (const f of [...walk("src/app"), ...walk("src/components")].filter((x) => /\.(ts|tsx)$/.test(x))) {
    assert.doesNotMatch(read(f), /price-snapshot-build|pubdb|pub-seed/, f);
  }
});

test("the writer keeps store offers 14 days and eBay offers 72 hours, writes both layouts, and the pass's memory", () => {
  const build = read("src/lib/price-snapshot-build.ts");
  assert.match(build, /new Date\(now - SNAPSHOT_OFFER_KEEP_MS\)/);
  assert.match(build, /r\.source\.startsWith\("ebay"\) && r\.updatedAt\.getTime\(\) <= ebaySinceMs\) continue/);
  assert.match(build, /`o\/\$\{key\}\.json\.gz`/);
  assert.match(build, /`offers\/\$\{key\}\.json\.gz`/);
  assert.match(build, /write\("ebay-checks\.json\.gz", checks\)/);
  assert.match(build, /SNAPSHOT_LEGACY_SHARDS/);
  // The stats count only rows inside 72 hours, as the snapshot path always did.
  assert.match(build, /!r\.source\.startsWith\("ebay"\) && r\.updatedAt\.getTime\(\) > ebaySinceMs/);
});

test("the jobs: the import and the eBay pass seed from the snapshot, build it and publish it, in one group; a failed publish fails the run", () => {
  for (const f of ["import-prices", "ebay-prices"]) {
    const y = read(`.github/workflows/${f}.yml`);
    assert.match(y, /image: postgres:16/, `${f} runs a throwaway Postgres`);
    assert.match(y, /PUBLIC_DATABASE_URL: postgresql:\/\/postgres:pub@localhost:5432\/pub/);
    assert.match(y, /bash scripts\/pub-setup\.sh/);
    assert.match(y, /npx tsx scripts\/price-snapshot\.ts/);
    assert.match(y, /bash scripts\/publish-snapshot\.sh/);
    assert.match(y, /group: import-prices/);
    assert.doesNotMatch(y.slice(y.indexOf("Build the price snapshot")), /continue-on-error: true\s+env:\s+(DATABASE_URL|SNAPSHOT_DIR)/, `${f}: building/publishing the snapshot must fail the run`);
  }
  const imp = read(".github/workflows/import-prices.yml");
  const at = imp.indexOf("name: Build the price snapshot");
  assert.ok(at > 0 && !/continue-on-error/.test(imp.slice(at, imp.indexOf("name: Store health report"))), "the build step is not continue-on-error");
  const pub = imp.slice(imp.indexOf("name: Publish the price snapshot"), imp.indexOf("name: Point the site"));
  assert.doesNotMatch(pub, /continue-on-error/);
  // The alert steps read the snapshot this very run built, not a CDN copy of the last one.
  assert.equal((imp.match(/SNAPSHOT_LOCAL_DIR: \.snapshot-out/g) ?? []).length, 4, "store health and the three alert steps");
  const scripts = read("scripts/publish-snapshot.sh");
  assert.match(scripts, /git push --quiet --force "\$REMOTE" snapshot/);
  assert.match(scripts, /deploymentEnabled": false/, "Vercel must never build this branch");
  assert.match(read("scripts/pub-setup.sh"), /neon\.tech/, "the setup refuses a Neon address");
});

test("an empty snapshot is never published, and the seed refuses an unreadable one", () => {
  const s = read("scripts/price-snapshot.ts");
  assert.match(s, /meta\.counts\.cards < 1000 \|\| meta\.counts\.offers < 1000/);
  assert.match(read("src/lib/pub-seed.ts"), /refusing to seed from it/);
  assert.match(read("src/lib/pub-seed.ts"), /the snapshot has no meta\.json/);
});
