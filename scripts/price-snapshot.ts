// Build the price snapshot (lib/price-snapshot.ts) into SNAPSHOT_DIR (default
// .snapshot-out) after an import. import-prices.yml then force-pushes that
// directory as the single commit of the `snapshot` branch. Read-only on the
// database. Refuses to write a snapshot that is clearly empty, so a broken
// import can never replace the last good one.
//
//   SNAPSHOT_DIR=.snapshot-out npx tsx scripts/price-snapshot.ts
import { prisma } from "../src/lib/db";
import { buildSnapshot } from "../src/lib/price-snapshot-build";

const log = (m: string) => console.log(new Date().toISOString().slice(11, 19), m);

async function main() {
  const dir = process.env.SNAPSHOT_DIR || ".snapshot-out";
  const meta = await buildSnapshot(dir, log);
  // An empty catalogue or no fresh offers means the import failed upstream: leave the old snapshot alone.
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
  .finally(() => prisma.$disconnect());
