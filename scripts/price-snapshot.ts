// Build the price snapshot (lib/price-snapshot.ts) into SNAPSHOT_DIR (default
// .snapshot-out) at the end of a job that holds the public working copy
// (lib/pubdb.ts): the import, and the eBay pass. The workflow then force-pushes
// that directory as the single commit of the `snapshot` branch, which is the ONLY
// persistent copy of the public data. Reads Neon only for two facts about runs
// (when the last import finished, whether the eBay pass ran lately). Refuses to
// write a snapshot that is clearly empty, so a broken job can never replace the
// last good one.
//
//   SNAPSHOT_DIR=.snapshot-out npx tsx scripts/price-snapshot.ts
import { prisma } from "../src/lib/db";
import { pub, requirePublicDatabase } from "../src/lib/pubdb";
import { buildSnapshot } from "../src/lib/price-snapshot-build";

const log = (m: string) => console.log(new Date().toISOString().slice(11, 19), m);
const EBAY_LIVE_DAYS = 3;

async function main() {
  requirePublicDatabase();
  const dir = process.env.SNAPSHOT_DIR || ".snapshot-out";
  const now = Date.now();
  const [run, ebayRun] = await Promise.all([
    prisma.importRun.findFirst({ where: { ok: true, kind: { not: "ebay" } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } }),
    prisma.importRun.findFirst({ where: { kind: "ebay", ok: true, finishedAt: { gte: new Date(now - EBAY_LIVE_DAYS * 86_400_000) } }, select: { id: true } }),
  ]);
  const meta = await buildSnapshot(dir, { log, lastImportAt: run?.finishedAt ?? null, ebayLive: Boolean(ebayRun) });
  // An empty catalogue or no fresh offers means the job failed upstream: leave the old snapshot alone.
  if (meta.counts.cards < 1000 || meta.counts.offers < 1000) {
    throw new Error(`snapshot looks empty (${JSON.stringify(meta.counts)}); not publishing it`);
  }
  log(`snapshot written to ${dir}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([prisma.$disconnect(), pub.$disconnect()]));
