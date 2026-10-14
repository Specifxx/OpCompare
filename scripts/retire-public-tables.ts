// Drop the retired public tables from Neon (the "Retire the public tables"
// workflow). Destructive, so it checks first and says what it is doing: it only
// goes ahead when CONFIRM is "drop", the snapshot on GitHub has the new layout and
// is fresh, and the popularity counters have been moved.
import { prisma } from "../src/lib/db";
import { snapshotFile, SNAPSHOT_SERVE_MS, type SnapshotMeta } from "../src/lib/price-snapshot";

export const RETIRED_TABLES = ["Offer", "EbayCheck", "EbayListing", "EbayGradedListing", "Card", "Sealed", "Set"] as const;

async function main() {
  if (process.env.CONFIRM !== "drop") throw new Error('Type "drop" in the confirm box to run this.');
  const meta = await snapshotFile<SnapshotMeta>("meta.json");
  if (!meta?.ranges?.length) throw new Error("The snapshot does not have the new layout: run the move workflow first.");
  const age = Date.now() - Date.parse(meta.generatedAt);
  if (!(age < SNAPSHOT_SERVE_MS * 0.75)) throw new Error(`The snapshot is ${Math.round(age / 3_600_000)} hours old: wait for a fresh import before dropping anything.`);
  if (meta.counts.cards < 1000 || meta.counts.offers < 1000) throw new Error(`The snapshot looks empty (${JSON.stringify(meta.counts)}).`);

  const exists = async (t: string) => (await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${t}'`))[0].n > 0;
  const present = [];
  for (const t of RETIRED_TABLES) if (await exists(t)) present.push(t);
  if (!present.length) {
    console.log("The retired tables are already gone.");
    return;
  }
  for (const t of present) console.log(`  ${t}: ${(await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM "${t}"`))[0].n} rows`);

  if (present.includes("Card")) {
    const [{ n: counted }] = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM "Card" WHERE "searchCount" > 0 OR "viewCount" > 0`);
    const moved = await prisma.cardDemand.count();
    if (moved < counted) throw new Error(`Only ${moved} CardDemand rows for ${counted} cards with a counter: run the move workflow's counter step first.`);
    console.log(`Counters: ${moved} CardDemand rows cover the ${counted} cards that had one.`);
  }
  console.log(`Snapshot ${meta.generatedAt}: ${meta.counts.cards} cards, ${meta.counts.offers} offers. Dropping ${present.join(", ")}…`);
  await prisma.$executeRawUnsafe(`DROP TABLE ${present.map((t) => `"${t}"`).join(", ")} CASCADE`);
  const size = (await prisma.$queryRawUnsafe<{ b: bigint }[]>(`SELECT pg_database_size(current_database())::bigint AS b`))[0].b;
  console.log(`Dropped. The database is now ${(Number(size) / 1048576).toFixed(0)} MB.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
