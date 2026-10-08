// Copy OP Compare's STATE from the old Neon database to the new one (OP2).
//
//   SOURCE_DATABASE_URL=<old> TARGET_DATABASE_URL=<new> npx tsx scripts/migrate-db.ts [--dry]
//
// Run by .github/workflows/migrate-database.yml, after the target's schema has
// been created (scripts/db-push-safe.sh). The source is only ever READ.
//
// WHAT MOVES: every table that holds something the import cannot recreate:
// accounts, entitlement, watches, alerts, collections, notifications, the inbox
// and support tables, the launch-promo counter, Meta, the eBay check history
// and the import-run log (the eBay budget counts our last-24h spend from it).
// The catalogue (Set, Card, Sealed) moves too, because the user tables point at
// it. WHAT DOES NOT: Offer (650k rows the next import rebuilds, and the bulk of
// the transfer) and ClickEvent (retired). A table that is in neither list makes
// the run FAIL, so a model added later can never be dropped silently.
//
// Idempotent: rows are inserted ON CONFLICT DO NOTHING, so a second run only adds
// what arrived since the first. Only columns present in BOTH databases are
// copied, so a column added on one side takes its default on the other. Sequences
// are moved past the copied ids. Prints counts, never a connection string.
import { PrismaClient } from "@prisma/client";

/** Parents before children (foreign keys). */
export const COPY_ORDER = [
  "Set",
  "Card",
  "Sealed",
  "User",
  "Meta",
  "Counter",
  "ImportRun",
  "EbayCheck",
  "EbayListing",
  "EbayGradedListing",
  "RisingSnapshot",
  "PriceReport",
  "StoreSuggestion",
  "Feedback",
  "ContactMessage",
  "PremiumClick",
  "PriceAlert",
  "AlertMute",
  "SealedWatch",
  "DeckWatch",
  "Notification",
  "CollectionCard",
  "NewsletterSubscriber",
  "SetReleaseAlert",
  "PublishedDeck",
  "SupportTicket",
] as const;
/** Deliberately not copied. */
export const SKIPPED = ["Offer", "ClickEvent"] as const;

const BATCH = 500;
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const q = (name: string) => `"${name.replace(/"/g, '""')}"`;

function client(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } }, log: ["error"] });
}

async function columnsOf(db: PrismaClient, table: string): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    table,
  );
  return rows.map((r) => r.column_name);
}

async function tablesOf(db: PrismaClient): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  return rows.map((r) => r.table_name);
}

async function count(db: PrismaClient, table: string): Promise<number> {
  const r = await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM ${q(table)}`);
  return Number(r[0].n);
}

async function main() {
  const dry = process.argv.includes("--dry");
  const sourceUrl = (process.env.SOURCE_DATABASE_URL ?? "").trim();
  const targetUrl = (process.env.TARGET_DATABASE_URL ?? "").trim();
  if (!sourceUrl) throw new Error("SOURCE_DATABASE_URL is not set (the old database: the DATABASE_URL secret)");
  if (!targetUrl) throw new Error("TARGET_DATABASE_URL is not set (the new database: the OP2 secret or variable)");
  if (sourceUrl === targetUrl) throw new Error("source and target are the same database; refusing to copy a database onto itself");

  const src = client(sourceUrl);
  const dst = client(targetUrl);
  try {
    const [srcTables, dstTables] = await Promise.all([tablesOf(src), tablesOf(dst)]);
    const known = new Set<string>([...COPY_ORDER, ...SKIPPED]);
    const unknown = [...new Set([...srcTables, ...dstTables])].filter((t) => !known.has(t) && !t.startsWith("_"));
    if (unknown.length) throw new Error(`tables not in COPY_ORDER or SKIPPED: ${unknown.join(", ")} — add them to scripts/migrate-db.ts`);
    const missing = COPY_ORDER.filter((t) => !dstTables.includes(t));
    if (missing.length) throw new Error(`the target has no table ${missing.join(", ")}: run prisma db push against it first`);

    const report: { table: string; source: number; target: number; copied: number }[] = [];
    for (const table of COPY_ORDER) {
      if (!srcTables.includes(table)) {
        log(`${table}: not in the source, skipped`);
        continue;
      }
      const [sc, tc] = await Promise.all([columnsOf(src, table), columnsOf(dst, table)]);
      const cols = sc.filter((c) => tc.includes(c));
      const total = await count(src, table);
      let copied = 0;
      if (!dry) {
        const list = cols.map(q).join(", ");
        for (let offset = 0; offset < total; offset += BATCH) {
          const page = await src.$queryRawUnsafe<{ j: string }[]>(
            `SELECT COALESCE(json_agg(t), '[]'::json)::text AS j FROM (SELECT ${list} FROM ${q(table)} ORDER BY 1 LIMIT ${BATCH} OFFSET ${offset}) t`,
          );
          const n = await dst.$executeRawUnsafe(
            `INSERT INTO ${q(table)} (${list}) SELECT ${list} FROM json_populate_recordset(NULL::${q(table)}, $1::json) ON CONFLICT DO NOTHING`,
            page[0].j,
          );
          copied += Number(n);
        }
        // Serial ids continue after the copied ones.
        const seqs = await dst.$queryRawUnsafe<{ column_name: string }[]>(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_default LIKE 'nextval(%'`,
          table,
        );
        for (const { column_name } of seqs) {
          await dst.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(${q(column_name)}) FROM ${q(table)}), 1), (SELECT MAX(${q(column_name)}) FROM ${q(table)}) IS NOT NULL)`,
            q(table),
            column_name,
          );
        }
      }
      report.push({ table, source: total, target: await count(dst, table), copied });
      log(`${table}: ${total} in the source, ${report[report.length - 1].target} in the target${dry ? " (dry run)" : `, ${copied} copied`}`);
    }

    console.log("\ntable".padEnd(24) + "source".padStart(9) + "target".padStart(9));
    for (const r of report) console.log(r.table.padEnd(23) + String(r.source).padStart(9) + String(r.target).padStart(9));
    if (dry) return;
    const short = report.filter((r) => r.target < r.source);
    if (short.length) throw new Error(`the target has fewer rows than the source in: ${short.map((r) => `${r.table} (${r.target}/${r.source})`).join(", ")}`);
    log("migration verified: every copied table has at least the source's rows. The source was only read, and is untouched.");
  } finally {
    await Promise.all([src.$disconnect(), dst.$disconnect()]);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
