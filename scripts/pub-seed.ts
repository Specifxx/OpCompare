// Seed the public working copy (PUBLIC_DATABASE_URL, a throwaway Postgres on the
// runner) from the `snapshot` branch on GitHub: the first step of every job that
// needs the catalogue, offers or eBay state. See lib/pub-seed.ts.
//
//   npx tsx scripts/pub-seed.ts                          # from GitHub's raw CDN
//   SNAPSHOT_LOCAL_DIR=.snapshot-out npx tsx scripts/pub-seed.ts   # from a local build (tests, dev)
import { pub, requirePublicDatabase } from "../src/lib/pubdb";
import { seedFromSnapshot } from "../src/lib/pub-seed";

async function main() {
  requirePublicDatabase();
  await seedFromSnapshot((...a) => console.log(new Date().toISOString().slice(11, 19), ...a));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pub.$disconnect());
