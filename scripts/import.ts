// The daily import. Run by .github/workflows/import-prices.yml (07:00 and 19:00
// UTC) or by hand:
//
//   npm run import                      # catalogue + every store + aggregates
//   IMPORT_STORES=0 npm run import      # catalogue + TCGplayer only (fast, ~30 s)
//   IMPORT_ONLY_STORES=cherry,ozzie npm run import
//   IMPORT_ONLY_COUNTRY=UK npm run import
//   TCGCSV_CACHE_DIR=.cache npm run import   # reuse downloaded TCGCSV files (dev)
//
// Writes only to DATABASE_URL. Never calls the eBay API.
import fs from "node:fs";
import { prisma } from "../src/lib/db";
import { aggregate, importCatalog, importStores, recordHistory, recordIndex, revalidateSite } from "../src/lib/import";
import { normalizeCountry } from "../src/lib/country";

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function main() {
  const withStores = process.env.IMPORT_STORES !== "0";
  const cacheDir = process.env.TCGCSV_CACHE_DIR || undefined;
  if (cacheDir) fs.mkdirSync(cacheDir, { recursive: true });
  const run = await prisma.importRun.create({ data: { kind: withStores ? "full" : "catalog" } });
  const summary: Record<string, unknown> = {};
  try {
    const cat = await importCatalog(log, cacheDir);
    summary.catalog = { sets: cat.sets, cards: cat.cards, sealed: cat.sealed, tcgplayerOffers: cat.tcgplayerOffers };
    if (withStores) {
      const only = (process.env.IMPORT_ONLY_STORES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const market = process.env.IMPORT_ONLY_COUNTRY ? normalizeCountry(process.env.IMPORT_ONLY_COUNTRY) : undefined;
      log(`Stores: reading${only.length ? ` ${only.join(", ")}` : ""}${market ? ` in ${market}` : ""}…`);
      const stores = await importStores(log, { only, market });
      summary.stores = stores;
      const failed = stores.filter((s) => s.failed).map((s) => s.key);
      log(`Stores: ${stores.length} read, ${stores.reduce((a, s) => a + s.cards + s.sealed, 0)} offers, ${failed.length} failed${failed.length ? ` (${failed.join(", ")})` : ""}`);
    }
    await aggregate(log);
    await recordHistory(log);
    await recordIndex(log);
    await prisma.importRun.update({ where: { id: run.id }, data: { ok: true, finishedAt: new Date(), summary: summary as object } });
    await revalidateSite(log);
  } catch (e) {
    await prisma.importRun.update({ where: { id: run.id }, data: { ok: false, finishedAt: new Date(), summary: { ...summary, error: String(e) } as object } });
    throw e;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
