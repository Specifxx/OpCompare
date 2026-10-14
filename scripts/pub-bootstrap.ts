// ONE-TIME BOOTSTRAP (the "Move public data off Neon" workflow, once): copy the
// public tables out of the old Neon database into the public working copy and
// build the first snapshot of the new design from them, so nothing is lost: the
// eBay pass's memory of what it searched, panel titles, change7d/30d, offers.
// After this the snapshot branch is the only copy and Neon's tables are retired.
//
//   DATABASE_URL (or OP2) = Neon, PUBLIC_DATABASE_URL = the runner's Postgres
//   npx tsx scripts/pub-bootstrap.ts   then   npx tsx scripts/price-snapshot.ts
import { prisma } from "../src/lib/db";
import { pub, requirePublicDatabase } from "../src/lib/pubdb";
import { seedFromNeon } from "../src/lib/pub-seed";
import { snapshotFile, type SnapshotMeta } from "../src/lib/price-snapshot";

async function main() {
  requirePublicDatabase();
  // Refuse to overwrite a snapshot that already has the new layout with Neon's older copy.
  if (process.env.MOVE_FORCE !== "1") {
    const meta = await snapshotFile<SnapshotMeta>("meta.json");
    if (meta?.ranges?.length) throw new Error(`The snapshot (${meta.generatedAt}) already has the new layout: Neon's copy is older. Re-run with "force" only if you mean to overwrite it.`);
  }
  const r = await seedFromNeon(prisma as never, (...a) => console.log(new Date().toISOString().slice(11, 19), ...a));
  if (r.cards < 1000 || r.offers < 1000) throw new Error(`Neon looks empty (${JSON.stringify(r)}): not bootstrapping from it`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([prisma.$disconnect(), pub.$disconnect()]));
