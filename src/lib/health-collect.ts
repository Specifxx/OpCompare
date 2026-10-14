// Gathers the numbers the health evaluators (lib/health.ts) judge. Script-side
// only (scripts/watchdog.ts, in GitHub Actions): it reads the database and the
// network, and imports nothing from Next. EVERY source is wrapped, so one that
// cannot be reached becomes an "unknown" check and the rest still report; the
// watchdog is the thing that must keep working when something else is broken.
//
// It never calls eBay (eBay stays inside lib/ebay*.ts): the eBay checks read the
// ImportRun summaries the eBay pass itself wrote.
import { prisma } from "./db";
import {
  buildReport,
  ebayRunOf,
  evalEbay,
  evalEmail,
  evalImportAge,
  evalInbox,
  evalJobs,
  evalNeon,
  evalSite,
  evalSnapshotAge,
  evalStores,
  unknown,
  type Check,
  type EbayRunLite,
  type HealthReport,
  type InboxCounts,
  type Probe,
  type WorkflowRun,
} from "./health";
import { STORES } from "./stores";

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return v && Number.isFinite(n) && n > 0 ? n : d;
};
const GB = 1024 ** 3;
const MB = 1024 ** 2;

/** Run one collector; a throw is reported as `unknown` checks, never propagated. */
async function guarded<T>(label: string, fn: () => Promise<T>, fallback: (why: string) => T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const why = (e instanceof Error ? e.message : String(e)).replace(/postgres(ql)?:\/\/\S+/gi, "[db url]").slice(0, 160);
    console.warn(`[watchdog] ${label}: ${why}`);
    return fallback(why);
  }
}

const withTimeout = async (url: string, init: RequestInit = {}, ms = 15_000) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
};

// ── Neon ─────────────────────────────────────────────────────────────────────
export async function collectNeon(now: Date): Promise<Check[]> {
  const databaseBytes = await guarded("database size", async () => Number((await prisma.$queryRaw<{ b: bigint }[]>`SELECT pg_database_size(current_database())::bigint AS b`)[0].b), () => null);
  let transferBytes: number | null = null;
  let computeSeconds: number | null = null;
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  const key = process.env.NEON_API_KEY;
  const project = process.env.NEON_PROJECT_ID;
  if (key && project) {
    await guarded(
      "Neon API",
      async () => {
        const res = await withTimeout(`https://console.neon.tech/api/v2/projects/${encodeURIComponent(project)}`, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" } });
        if (!res.ok) throw new Error(`Neon API answered ${res.status}`);
        const p = ((await res.json()) as { project?: Record<string, unknown> }).project ?? {};
        const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
        transferBytes = n(p.data_transfer_bytes);
        computeSeconds = n(p.compute_time_seconds) ?? n(p.cpu_used_sec);
        const d = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v) : null);
        periodStart = d(p.consumption_period_start);
        periodEnd = d(p.consumption_period_end);
      },
      () => undefined,
    );
  }
  return evalNeon(
    {
      transferBytes,
      computeSeconds,
      periodStart,
      periodEnd,
      databaseBytes,
      limits: { transferBytes: num(process.env.NEON_TRANSFER_LIMIT_GB, 5) * GB, computeHours: num(process.env.NEON_COMPUTE_LIMIT_HOURS, 100), storageBytes: num(process.env.NEON_STORAGE_LIMIT_MB, 512) * MB },
    },
    now,
  );
}

// ── Prices, stores, eBay, email (all from our own tables) ────────────────────
export async function collectPrices(now: Date): Promise<Check[]> {
  const importAt = await guarded(
    "last import",
    async () => (await prisma.importRun.findFirst({ where: { ok: true, kind: { not: "ebay" } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } }))?.finishedAt ?? null,
    () => null as Date | null,
  );
  const snapshotAt = await guarded(
    "snapshot",
    async () => {
      const base = (process.env.SNAPSHOT_RAW_BASE || "https://raw.githubusercontent.com/Specifxx/OpCompare").replace(/\/+$/, "");
      const res = await withTimeout(`${base}/snapshot/meta.json`);
      if (!res.ok) throw new Error(`snapshot meta answered ${res.status}`);
      const m = (await res.json()) as { generatedAt?: string };
      return m.generatedAt ? new Date(m.generatedAt) : null;
    },
    () => null as Date | null,
  );
  return [importAt ? evalImportAge(importAt, now) : unknown("import-age", "prices", "Price import", "The last import could not be read."), snapshotAt ? evalSnapshotAge(snapshotAt, now) : unknown("snapshot-age", "prices", "GitHub price snapshot", "The snapshot's date could not be read.")];
}

export async function collectStores(): Promise<Check[]> {
  const keys = new Set(STORES.map((s) => s.key));
  const failed = await guarded(
    "stores",
    async () => {
      const rows = await prisma.$queryRaw<{ key: string }[]>`
        SELECT key FROM (
          SELECT DISTINCT ON (s->>'key') s->>'key' AS key, (s->>'failed')::boolean AS failed
          FROM "ImportRun" r CROSS JOIN LATERAL jsonb_array_elements(r.summary->'stores') s
          WHERE r.ok AND r.summary ? 'stores' AND r."finishedAt" > now() - interval '8 days'
          ORDER BY s->>'key', r.id DESC
        ) latest
        WHERE failed`;
      return rows.filter((r) => keys.has(r.key)).length;
    },
    () => null as number | null,
  );
  return [evalStores({ failed, total: keys.size })];
}

export async function collectEbay(now: Date): Promise<Check[]> {
  return guarded(
    "eBay runs",
    async () => {
      const rows = await prisma.importRun.findMany({ where: { kind: "ebay" }, orderBy: { startedAt: "desc" }, take: 12, select: { startedAt: true, ok: true, summary: true } });
      const runs: EbayRunLite[] = rows.map((r) => ebayRunOf(r.startedAt, r.ok, (r.summary as Record<string, unknown> | null) ?? null));
      return evalEbay(runs, now);
    },
    (why) => [unknown("ebay-run", "ebay", "eBay pass", `The eBay runs could not be read: ${why}`)],
  );
}

export async function collectEmail(): Promise<Check[]> {
  const v = await guarded("email status", async () => (await prisma.meta.findUnique({ where: { key: "email" } }))?.value ?? null, () => null as string | null);
  return [evalEmail(v)];
}

/** Unread inbox counts and the oldest unread item's date (dates only; no content). */
export async function collectInbox(now: Date): Promise<{ checks: Check[]; counts: InboxCounts | null }> {
  const out = await guarded(
    "inbox",
    async () => {
      const [reports, suggestions, feedback, contact, support] = await Promise.all([
        prisma.priceReport.count({ where: { status: "NEW" } }),
        prisma.storeSuggestion.count({ where: { status: "pending" } }),
        prisma.feedback.count({ where: { status: "NEW" } }),
        prisma.contactMessage.count({ where: { status: "NEW" } }),
        prisma.supportTicket.count({ where: { status: "OPEN" } }),
      ]);
      const oldest = await Promise.all([
        prisma.priceReport.findFirst({ where: { status: "NEW" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        prisma.storeSuggestion.findFirst({ where: { status: "pending" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        prisma.feedback.findFirst({ where: { status: "NEW" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        prisma.contactMessage.findFirst({ where: { status: "NEW" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        prisma.supportTicket.findFirst({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      ]);
      const dates = oldest.flatMap((o) => (o ? [o.createdAt] : [])).sort((a, b) => a.getTime() - b.getTime());
      const counts: InboxCounts = { reports, suggestions, feedback, contact, support };
      return { counts, check: evalInbox(counts, dates[0] ?? null, now) };
    },
    () => null as { counts: InboxCounts; check: Check } | null,
  );
  return out ? { checks: [out.check], counts: out.counts } : { checks: [evalInbox(null, null, now)], counts: null };
}

// ── The live site ────────────────────────────────────────────────────────────
const PROBES: { path: string; critical: boolean; marker: RegExp }[] = [
  { path: "/", critical: true, marker: /OP Compare/i },
  { path: "/price-guide", critical: true, marker: /OP Compare/i },
  { path: "/sealed", critical: false, marker: /OP Compare/i },
  { path: "/sitemap.xml", critical: false, marker: /<urlset/i },
];

export async function collectSite(): Promise<Check[]> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://opcompare.app").replace(/\/+$/, "");
  const probes: Probe[] = [];
  for (const p of PROBES) {
    const t0 = Date.now();
    try {
      // `Cache-Control: no-cache` asks the CDN for a fresh answer, as a visitor's first load would get.
      const res = await withTimeout(`${base}${p.path}`, { headers: { "User-Agent": "OPCompareWatchdog/1.0", "Cache-Control": "no-cache" }, redirect: "follow" }, 20_000);
      const body = await res.text();
      probes.push({ path: p.path, status: res.status, ms: Date.now() - t0, bytes: body.length, marker: p.marker.test(body), critical: p.critical });
    } catch (e) {
      probes.push({ path: p.path, status: 0, ms: Date.now() - t0, bytes: 0, marker: false, error: e instanceof Error ? e.message.slice(0, 80) : "error", critical: p.critical });
    }
  }
  return evalSite(probes);
}

// ── GitHub Actions ───────────────────────────────────────────────────────────
export async function collectJobs(now: Date): Promise<Check[]> {
  const repo = process.env.GITHUB_REPOSITORY || "Specifxx/OpCompare";
  return guarded(
    "GitHub Actions",
    async () => {
      const token = process.env.GITHUB_TOKEN;
      const url = `https://api.github.com/repos/${repo}/actions/runs?per_page=100&status=completed&branch=main`;
      const hdr = { Accept: "application/vnd.github+json", "User-Agent": "OPCompareWatchdog/1.0" };
      let res = await withTimeout(url, { headers: { ...hdr, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      // The repository is public: a refused token (expired, wrong scope) must not blind the check.
      if (token && (res.status === 401 || res.status === 403)) res = await withTimeout(url, { headers: hdr });
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      const body = (await res.json()) as { workflow_runs?: { path: string; conclusion: string | null; run_started_at?: string; created_at: string; event: string }[] };
      const runs: WorkflowRun[] = (body.workflow_runs ?? []).map((r) => ({ path: r.path, conclusion: r.conclusion, startedAt: r.run_started_at ?? r.created_at, event: r.event }));
      return evalJobs(runs, now);
    },
    (why) => [unknown("jobs-api", "jobs", "Scheduled jobs", `GitHub's run history could not be read: ${why}`)],
  );
}

/** Everything, in parallel groups; the report is always produced. */
export async function collectAll(now: Date = new Date()): Promise<{ report: HealthReport; inbox: InboxCounts | null }> {
  const [neon, prices, stores, ebay, email, inbox, site, jobs] = await Promise.all([collectNeon(now), collectPrices(now), collectStores(), collectEbay(now), collectEmail(), collectInbox(now), collectSite(), collectJobs(now)]);
  return { report: buildReport([...neon, ...prices, ...ebay, ...stores, ...site, ...jobs, ...email, ...inbox.checks], now), inbox: inbox.counts };
}
