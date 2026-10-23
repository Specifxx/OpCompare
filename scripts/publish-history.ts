// After the import workflow has pushed the history to the `data` branch: record
// the commit the site should read (Meta "historyRef") and purge the site's
// cache. Pinning the commit makes every history URL immutable, so GitHub's raw
// CDN (which caches a branch name for a few minutes) can never serve the site
// yesterday's file under today's cache entry.
//
//   HISTORY_REF=<sha> npx tsx scripts/publish-history.ts
import { prisma } from "../src/lib/db";
import { revalidateSite, shouldRevalidate } from "../src/lib/import";

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function main() {
  const ref = (process.env.HISTORY_REF ?? "").trim();
  if (!/^[0-9a-f]{40}$/.test(ref)) throw new Error(`HISTORY_REF must be a full commit sha, got "${ref}"`);
  const before = await prisma.meta.findUnique({ where: { key: "historyRef" }, select: { value: true } });
  await prisma.meta.upsert({ where: { key: "historyRef" }, create: { key: "historyRef", value: ref }, update: { value: ref } });
  log(`History ref → ${ref}`);
  // Purge only when something the pages show changed: a new history commit, or a
  // snapshot whose data differs (scripts/publish-snapshot.sh sets SNAPSHOT_CHANGED;
  // anything but an explicit "false" counts as changed).
  if (!shouldRevalidate(before?.value ?? null, ref, process.env.SNAPSHOT_CHANGED)) {
    log("Revalidate: skipped (no new history and the snapshot's data is unchanged)");
    return;
  }
  await revalidateSite(log);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
