// One-time (the "Move public data off Neon" workflow): copy the popularity
// counters (searchCount, viewCount, lastViewedAt) out of the retired Card table
// into CardDemand, the small private table that holds them now. Idempotent: a
// row already in CardDemand is left alone, so a re-run never rewinds a counter
// that has kept counting since.
import { prisma } from "../src/lib/db";

async function main() {
  const has = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_name = 'Card' AND column_name = 'searchCount'`);
  if (!has[0]?.n) {
    console.log("The Card table has no counters to move (already retired).");
    return;
  }
  const moved = await prisma.$executeRawUnsafe(
    `INSERT INTO "CardDemand" ("cardId", "searchCount", "viewCount", "lastViewedAt")
     SELECT id, "searchCount", "viewCount", "lastViewedAt" FROM "Card" WHERE "searchCount" > 0 OR "viewCount" > 0
     ON CONFLICT ("cardId") DO NOTHING`,
  );
  const total = await prisma.cardDemand.count();
  console.log(`Counters moved: ${moved} new CardDemand rows (${total} in all).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
