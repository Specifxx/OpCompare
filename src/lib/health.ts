// THE SITE'S SELF-CHECK (owner, 2026-10-14: "I'm not going to keep checking Neon
// or the inbox every day; the site should tell me").
//
// Pure: no database, no network, no Next, no mail. scripts/watchdog.ts gathers
// the raw numbers (src/lib/health-collect.ts), hands them to the evaluators
// here, stores the report in Meta "health:report" and decides who to tell
// (diffAlerts). /admin and /admin/health only READ that stored report.
//
// A Check is one thing that can go wrong: a limit nearing its ceiling, a job
// that stopped running, a scraper that broke, an inbox nobody has opened. Each
// has a status, one line of detail in plain words and, when it is not ok, a
// hint that says what to do. "unknown" means the number could not be read (a
// missing key, an outage of the thing being checked); it is shown, never
// alerted on, and never makes the overall status worse.
//
// Nothing here may carry private data: the report is rendered in emails and,
// as counts only, in a GitHub issue on a PUBLIC repository (tests/health.test.ts
// pins that no message text, address or name can reach either).

// Local copies, so this module imports no eBay code (tests/no-ebay-api.test.ts):
// tests/health.test.ts pins both to lib/ebay-plan.ts's DAILY_CALL_CAP and quotaDayStart.
export const EBAY_DAILY_CAP = 2500;
export function ebayQuotaDayStart(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7));
  return d.getTime() > now.getTime() ? new Date(d.getTime() - 86_400_000) : d;
}

export type Status = "ok" | "warn" | "fail" | "unknown";
export type Area = "database" | "prices" | "ebay" | "stores" | "site" | "jobs" | "email" | "inbox";

export const AREAS: { id: Area; label: string }[] = [
  { id: "database", label: "Database and limits" },
  { id: "prices", label: "Prices and imports" },
  { id: "ebay", label: "eBay" },
  { id: "stores", label: "Stores" },
  { id: "site", label: "The live site" },
  { id: "jobs", label: "Scheduled jobs" },
  { id: "email", label: "Email" },
  { id: "inbox", label: "Inbox" },
];

export interface Check {
  id: string;
  area: Area;
  label: string;
  status: Status;
  /** One plain line: what the number is. */
  detail: string;
  /** For a limit: how much is used, and the ceiling (same unit), so the page can draw a bar. */
  value?: number | null;
  limit?: number | null;
  unit?: string;
  /** What to do, when status is warn or fail. */
  hint?: string;
}

export interface HealthReport {
  v: 1;
  at: string;
  overall: Status;
  checks: Check[];
}

const RANK: Record<Status, number> = { unknown: 0, ok: 1, warn: 2, fail: 3 };
export const worst = (a: Status, b: Status): Status => (RANK[b] > RANK[a] ? b : a);

/** fail beats warn beats ok; unknown never counts. */
export function overallStatus(checks: Check[]): Status {
  let s: Status = "ok";
  for (const c of checks) if (c.status !== "unknown") s = worst(s, c.status);
  return s;
}

export function buildReport(checks: Check[], now: Date): HealthReport {
  return { v: 1, at: now.toISOString(), overall: overallStatus(checks), checks };
}

export const unknown = (id: string, area: Area, label: string, detail: string, hint?: string): Check => ({ id, area, label, status: "unknown", detail, ...(hint ? { hint } : {}) });

const GB = 1024 ** 3;
const MB = 1024 ** 2;
const fmtBytes = (b: number) => (b >= GB ? `${(b / GB).toFixed(2)} GB` : `${(b / MB).toFixed(0)} MB`);
const pct = (r: number) => `${Math.round(r * 100)}%`;
const hoursAgo = (at: Date | string, now: Date) => (now.getTime() - new Date(at).getTime()) / 3_600_000;
export const ageText = (hours: number): string => (hours < 1 ? `${Math.max(1, Math.round(hours * 60))} min` : hours < 48 ? `${Math.round(hours)} h` : `${Math.round(hours / 24)} days`);

// ── Limits (Neon) ────────────────────────────────────────────────────────────

/**
 * A monthly allowance with a pace check. `used` of `limit` so far; the period
 * runs periodStart → periodEnd. It warns early when the PACE says the month
 * will overshoot even though little is used yet, because "5 GB spent on day
 * 9" is the failure that took the old database down.
 */
export function evalQuota(o: {
  id: string;
  area: Area;
  label: string;
  used: number;
  limit: number;
  unit: string;
  fmt: (n: number) => string;
  periodStart: Date;
  periodEnd: Date;
  now: Date;
  hint: string;
}): Check {
  const ratio = o.limit > 0 ? o.used / o.limit : 0;
  const span = o.periodEnd.getTime() - o.periodStart.getTime();
  const elapsed = span > 0 ? Math.min(1, Math.max(0, (o.now.getTime() - o.periodStart.getTime()) / span)) : 1;
  // Pace is meaningless in the first days: one busy import is not a trend.
  const projected = elapsed >= 0.15 ? ratio / elapsed : null;
  let status: Status = "ok";
  if (ratio >= 0.9 || (projected != null && projected >= 1.1)) status = "fail";
  else if (ratio >= 0.7 || (projected != null && projected >= 0.9)) status = "warn";
  const when = o.periodEnd.toISOString().slice(0, 10);
  const pace = projected != null ? `, on pace for ${pct(projected)} by ${when}` : "";
  return {
    id: o.id,
    area: o.area,
    label: o.label,
    status,
    detail: `${o.fmt(o.used)} of ${o.fmt(o.limit)} (${pct(ratio)})${pace}`,
    value: o.used,
    limit: o.limit,
    unit: o.unit,
    ...(status === "ok" ? {} : { hint: o.hint }),
  };
}

export interface NeonInputs {
  /** From the Neon API: this billing period's counters. */
  transferBytes: number | null;
  computeSeconds: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  /** From the database itself. */
  databaseBytes: number | null;
  limits: { transferBytes: number; computeHours: number; storageBytes: number };
}

export function evalNeon(n: NeonInputs, now: Date): Check[] {
  const out: Check[] = [];
  const KEY_HINT = "Add the repository secrets NEON_API_KEY (a read-only key from console.neon.tech) and NEON_PROJECT_ID so the dashboard can read the transfer and compute counters.";
  const start = n.periodStart ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = n.periodEnd ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  if (n.transferBytes == null) {
    out.push(unknown("neon-transfer", "database", "Neon network transfer", "Not connected: Neon's counters have not been read.", KEY_HINT));
  } else {
    out.push(
      evalQuota({
        id: "neon-transfer",
        area: "database",
        label: "Neon network transfer",
        used: n.transferBytes,
        limit: n.limits.transferBytes,
        unit: "bytes",
        fmt: fmtBytes,
        periodStart: start,
        periodEnd: end,
        now,
        hint: "Transfer is nearly spent. Pages already read the GitHub snapshot first; check for a new database read on a busy page, do not deploy until the month resets, and consider a second free Neon project (see docs/SETUP.md).",
      }),
    );
  }
  if (n.computeSeconds == null) {
    out.push(unknown("neon-compute", "database", "Neon compute hours", "Not connected: Neon's counters have not been read.", KEY_HINT));
  } else {
    out.push(
      evalQuota({
        id: "neon-compute",
        area: "database",
        label: "Neon compute hours",
        used: n.computeSeconds / 3600,
        limit: n.limits.computeHours,
        unit: "hours",
        fmt: (h) => `${h.toFixed(1)} h`,
        periodStart: start,
        periodEnd: end,
        now,
        hint: "The database is awake too often. Look for a job that connects more than it needs to (each wake bills at least five minutes).",
      }),
    );
  }
  if (n.databaseBytes == null) {
    out.push(unknown("neon-storage", "database", "Database size", "The size could not be read."));
  } else {
    const ratio = n.databaseBytes / n.limits.storageBytes;
    const status: Status = ratio >= 0.9 ? "fail" : ratio >= 0.7 ? "warn" : "ok";
    out.push({
      id: "neon-storage",
      area: "database",
      label: "Database size",
      status,
      detail: `${fmtBytes(n.databaseBytes)} of ${fmtBytes(n.limits.storageBytes)} (${pct(ratio)})`,
      value: n.databaseBytes,
      limit: n.limits.storageBytes,
      unit: "bytes",
      ...(status === "ok" ? {} : { hint: "Storage is filling. Look for a table that only grows (Offer, ImportRun, ClickEvent) and prune it." }),
    });
  }
  return out;
}

// ── Freshness ────────────────────────────────────────────────────────────────

/** How old the newest thing is, against a warn and a fail age in hours. */
export function evalAge(o: { id: string; area: Area; label: string; at: Date | string | null; warnH: number; failH: number; now: Date; what: string; hint: string; missing?: Status }): Check {
  if (!o.at) return { id: o.id, area: o.area, label: o.label, status: o.missing ?? "unknown", detail: `No ${o.what} on record.` };
  const h = hoursAgo(o.at, o.now);
  const status: Status = h >= o.failH ? "fail" : h >= o.warnH ? "warn" : "ok";
  return { id: o.id, area: o.area, label: o.label, status, detail: `Last ${o.what} ${ageText(h)} ago.`, ...(status === "ok" ? {} : { hint: o.hint }) };
}

export const evalImportAge = (at: Date | string | null, now: Date): Check =>
  evalAge({ id: "import-age", area: "prices", label: "Price import", at, warnH: 16, failH: 30, now, what: "successful import", missing: "fail", hint: "The twice-daily import has not succeeded. Open the Import prices workflow in GitHub Actions and read the failed step; prices are served from the last snapshot meanwhile." });

export const evalSnapshotAge = (at: Date | string | null, now: Date): Check =>
  evalAge({ id: "snapshot-age", area: "prices", label: "GitHub price snapshot", at, warnH: 30, failH: 46, now, what: "snapshot", hint: "Pages read the snapshot first and fall back to the database after 48 hours. A stale snapshot means the import's publish step is failing." });

// ── Stores ───────────────────────────────────────────────────────────────────

export function evalStores(o: { failed: number | null; total: number | null }): Check {
  if (o.failed == null || o.total == null) return unknown("stores-failing", "stores", "Store scrapers", "The last reads could not be loaded.");
  const share = o.total ? o.failed / o.total : 0;
  const status: Status = o.failed === 0 ? "ok" : share >= 0.25 ? "fail" : o.failed >= 3 || share >= 0.1 ? "warn" : "ok";
  return {
    id: "stores-failing",
    area: "stores",
    label: "Store scrapers",
    status,
    detail: o.failed ? `${o.failed} of ${o.total} stores failed their last read.` : `All ${o.total} stores read cleanly.`,
    value: o.failed,
    limit: o.total,
    unit: "stores",
    ...(status === "ok" ? {} : { hint: "Open /admin/store-health, section 'Needs a look'. One store failing is usually the store; many at once is usually a code or network problem." }),
  };
}

// ── eBay (from ImportRun kind "ebay"; the watchdog never calls eBay) ─────────

export interface EbayRunLite {
  startedAt: Date | string;
  ok: boolean;
  spent: number;
  budget: number;
  remainingStart: number | null;
  dailyLimit: number | null;
  latched: string | null;
  completed: number;
  tokenRefused: boolean;
  foreignSpendWarning: boolean;
  searched: number;
  matched: number;
}

/** What an ImportRun.summary of kind "ebay" says (every field optional: old rows lack some). */
export function ebayRunOf(startedAt: Date | string, ok: boolean, s: Record<string, unknown> | null): EbayRunLite {
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const by = (s?.byMarket && typeof s.byMarket === "object" ? Object.values(s.byMarket as Record<string, { searched?: number; matched?: number }>) : []) as { searched?: number; matched?: number }[];
  return {
    startedAt,
    ok,
    spent: num(s?.spent),
    budget: num(s?.budget),
    remainingStart: typeof s?.remainingStart === "number" ? s.remainingStart : null,
    dailyLimit: typeof s?.dailyLimit === "number" ? s.dailyLimit : null,
    latched: typeof s?.latched === "string" ? s.latched : null,
    completed: num(s?.completed),
    tokenRefused: s?.tokenRefused === true,
    foreignSpendWarning: s?.foreignSpendWarning === true,
    searched: by.reduce((t, m) => t + num(m.searched), 0),
    matched: by.reduce((t, m) => t + num(m.matched), 0),
  };
}

/** Calls spent in each of the last `days` eBay quota days (07:00 UTC to 07:00 UTC), newest first. */
export function spendByQuotaDay(runs: EbayRunLite[], now: Date, days = 3): number[] {
  const start = ebayQuotaDayStart(now).getTime();
  const out: number[] = [];
  for (let d = 0; d < days; d++) {
    const from = start - d * 86_400_000;
    out.push(runs.filter((r) => { const t = new Date(r.startedAt).getTime(); return t >= from && t < from + 86_400_000; }).reduce((t, r) => t + r.spent, 0));
  }
  return out;
}

export function evalEbay(runsNewestFirst: EbayRunLite[], now: Date, cap: number = EBAY_DAILY_CAP): Check[] {
  const last = runsNewestFirst[0];
  if (!last) return [unknown("ebay-run", "ebay", "eBay pass", "It has not run (off until the eBay secrets exist), or no run is on record.")];
  const out: Check[] = [];
  const ageCheck = evalAge({ id: "ebay-run", area: "ebay", label: "eBay pass", at: last.startedAt, warnH: 30, failH: 54, now, what: "run", hint: "The daily eBay run (12:37 UTC) is not happening. Open the eBay prices workflow in GitHub Actions." });
  out.push(ageCheck);
  // One cause, one alert: a run that stopped long ago says so once, above.
  if (ageCheck.status === "fail") return out;

  let status: Status = "ok";
  let detail = `Last run spent ${last.spent} of a ${last.budget}-call budget; ${last.matched} of ${last.searched} searches found a listing.`;
  let hint: string | undefined;
  if (last.tokenRefused) {
    status = "fail";
    detail = "eBay refused the keyset on the last run.";
    hint = "Check the eBay application keys in the repository secrets (OP Compare's own app, production keys) and that the app is still approved.";
  } else if (!last.ok) {
    status = "fail";
    detail = `The last run failed${last.latched === "failures" ? " (searches kept failing)" : ""}.`;
    hint = "Open the eBay prices workflow run and read the 'eBay pass' step.";
  } else if (last.latched === "429") {
    status = "warn";
    detail = "eBay rate-limited the last run (HTTP 429), so it stopped early.";
    hint = "The other site on this keyset may be spending its share. Check the 'eBay quota' line in the run log.";
  } else if (last.foreignSpendWarning) {
    status = "warn";
    detail = "Something other than OP Compare is spending this eBay keyset beyond the other site's share.";
    hint = "Check the keyset in the repository secrets is OP Compare's own and not pasted from RiftCompare.";
  } else if (last.searched >= 100 && last.matched / last.searched < 0.2) {
    status = "warn";
    detail = `Only ${last.matched} of ${last.searched} searches found a listing (${pct(last.matched / last.searched)}), far below the usual 40-70%.`;
    hint = "A title rule or eBay's search may have changed. Read the reject funnel in the run log.";
  }
  out.push({ id: "ebay-health", area: "ebay", label: "eBay run health", status, detail, ...(hint ? { hint } : {}) });

  // Quota use: the owner wants the whole allowance spent every eBay day. Judge
  // the last COMPLETE quota day (the current one is still filling).
  const days = spendByQuotaDay(runsNewestFirst, now, 3);
  const today = days[0];
  const lastFull = days[1];
  const ranDaysAgo = hoursAgo(last.startedAt, now);
  let uStatus: Status = "ok";
  let uHint: string | undefined;
  if (lastFull < cap * 0.6 && ranDaysAgo < 54 && runsNewestFirst.length >= 2) {
    uStatus = "warn";
    uHint = "A day's quota went mostly unspent. Either a run did not happen or its budget was cut: read the 'eBay quota' and 'plan' lines in the run log.";
  }
  const remaining = last.remainingStart != null && last.dailyLimit != null ? `; eBay showed ${last.remainingStart} of ${last.dailyLimit} left at the start of the last run` : "";
  out.push({
    id: "ebay-quota",
    area: "ebay",
    label: "eBay quota use",
    status: uStatus,
    detail: `Spent ${today} calls so far this quota day and ${lastFull} the day before (ceiling ${cap}${remaining}).`,
    value: Math.max(today, lastFull),
    limit: cap,
    unit: "calls",
    ...(uHint ? { hint: uHint } : {}),
  });
  return out;
}

// ── The live site ────────────────────────────────────────────────────────────

export interface Probe {
  path: string;
  status: number;
  ms: number;
  bytes: number;
  /** The page carried the site's own marker text (a 200 error page does not). */
  marker: boolean;
  error?: string;
  critical?: boolean;
}

export function evalSite(probes: Probe[]): Check[] {
  if (!probes.length) return [unknown("site-up", "site", "Live site", "No page was requested.")];
  const bad = probes.filter((p) => p.error || p.status !== 200 || !p.marker);
  const slow = probes.filter((p) => !bad.includes(p) && p.ms > 4000);
  const critical = bad.filter((p) => p.critical);
  const status: Status = critical.length ? "fail" : bad.length || slow.length ? "warn" : "ok";
  const worstMs = Math.max(...probes.map((p) => p.ms));
  const detail = bad.length
    ? `${bad.map((p) => `${p.path} ${p.error ? "unreachable" : p.status !== 200 ? `returned ${p.status}` : "looks wrong"}`).join("; ")}.`
    : slow.length
      ? `${slow.map((p) => `${p.path} took ${(p.ms / 1000).toFixed(1)} s`).join("; ")}.`
      : `${probes.length} pages answered normally (slowest ${(worstMs / 1000).toFixed(1)} s).`;
  return [{ id: "site-up", area: "site", label: "Live site", status, detail, ...(status === "ok" ? {} : { hint: "Open the Vercel dashboard's latest deployment and its function logs; if only one page fails, the data behind it is the first suspect." }) }];
}

// ── Scheduled jobs (GitHub Actions) ──────────────────────────────────────────

export interface WorkflowRun {
  /** ".github/workflows/x.yml" */
  path: string;
  conclusion: string | null;
  startedAt: string;
  event: string;
}

export interface JobExpectation {
  file: string;
  label: string;
  /** A successful run should have started within this many hours; null = no cadence to enforce. */
  maxAgeH: number | null;
  critical?: boolean;
}

export const JOBS: JobExpectation[] = [
  { file: "import-prices.yml", label: "Price import", maxAgeH: 18, critical: true },
  { file: "ebay-prices.yml", label: "eBay pass", maxAgeH: 30 },
  { file: "email.yml", label: "Email outbox", maxAgeH: 7 },
  { file: "email-weekly.yml", label: "Weekly newsletter", maxAgeH: 24 * 8 },
  { file: "production-deploy.yml", label: "Weekly deploy", maxAgeH: 24 * 8 },
  { file: "shipping-rates.yml", label: "Shipping rates", maxAgeH: null },
  { file: "indexnow.yml", label: "IndexNow", maxAgeH: null },
  { file: "search-console.yml", label: "Search Console report", maxAgeH: null },
  { file: "inbox-audit.yml", label: "Inbox audit", maxAgeH: null },
  { file: "ci.yml", label: "Tests (CI)", maxAgeH: null },
];

/**
 * Each job's newest finished run: a failure is a problem; a missing run
 * beyond its cadence is a problem. A run that was cancelled or skipped is
 * neither (an import waiting behind another is cancelled by design).
 */
export function evalJobs(runs: WorkflowRun[], now: Date, jobs: JobExpectation[] = JOBS): Check[] {
  const byFile = new Map<string, WorkflowRun[]>();
  for (const r of runs) {
    const file = r.path.split("/").pop() ?? r.path;
    (byFile.get(file) ?? byFile.set(file, []).get(file)!).push(r);
  }
  const out: Check[] = [];
  for (const j of jobs) {
    const list = (byFile.get(j.file) ?? []).filter((r) => r.conclusion && r.conclusion !== "cancelled" && r.conclusion !== "skipped").sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const id = `job-${j.file.replace(/\.yml$/, "")}`;
    const newest = list[0];
    if (!newest) {
      out.push(unknown(id, "jobs", j.label, "No finished run in GitHub's recent history."));
      continue;
    }
    const age = hoursAgo(newest.startedAt, now);
    const lastOk = list.find((r) => r.conclusion === "success");
    // eBay and email are a green no-op while unconfigured; a failure is still a failure.
    if (newest.conclusion === "failure" || newest.conclusion === "timed_out") {
      out.push({ id, area: "jobs", label: j.label, status: j.critical ? "fail" : "warn", detail: `The last run ${newest.conclusion === "timed_out" ? "timed out" : "failed"} ${ageText(age)} ago${lastOk ? `; the last good one was ${ageText(hoursAgo(lastOk.startedAt, now))} ago` : ""}.`, hint: `Open ${j.label} in GitHub Actions and read the failed step.` });
      continue;
    }
    if (j.maxAgeH != null && lastOk && hoursAgo(lastOk.startedAt, now) > j.maxAgeH) {
      out.push({ id, area: "jobs", label: j.label, status: j.critical ? "fail" : "warn", detail: `No successful run for ${ageText(hoursAgo(lastOk.startedAt, now))} (expected every ${ageText(j.maxAgeH)}).`, hint: `GitHub may have paused the schedule (it does after 60 days without a push) or the workflow is stuck: open ${j.label} in GitHub Actions and press Run workflow.` });
      continue;
    }
    out.push({ id, area: "jobs", label: j.label, status: "ok", detail: `Last run ${ageText(age)} ago: ${newest.conclusion}.` });
  }
  return out;
}

// ── Email and inbox ──────────────────────────────────────────────────────────

export function evalEmail(meta: string | null): Check {
  if (meta == null) return unknown("email-status", "email", "Email delivery", "The outbox has not reported yet.");
  if (meta === "on") return { id: "email-status", area: "email", label: "Email delivery", status: "ok", detail: "Email is on: alerts, welcomes and your own notifications can send." };
  return { id: "email-status", area: "email", label: "Email delivery", status: "warn", detail: "Email is OFF: nothing is being sent, including inbox and health emails to you.", hint: "Add the two mail secrets described in docs/SETUP.md (OP Compare's own Resend account). Until then the watchdog tells you through a GitHub issue instead." };
}

export interface InboxCounts {
  reports: number;
  suggestions: number;
  feedback: number;
  contact: number;
  support: number;
}

export const inboxTotal = (c: InboxCounts) => c.reports + c.suggestions + c.feedback + c.contact + c.support;

export function evalInbox(c: InboxCounts | null, oldestNewAt: Date | string | null, now: Date): Check {
  if (!c) return unknown("inbox-new", "inbox", "Inbox", "The inbox could not be counted.");
  const total = inboxTotal(c);
  const waitH = total && oldestNewAt ? hoursAgo(oldestNewAt, now) : 0;
  const status: Status = total === 0 ? "ok" : waitH >= 24 * 7 ? "fail" : waitH >= 72 ? "warn" : "ok";
  const parts = [c.contact && `${c.contact} message${c.contact === 1 ? "" : "s"}`, c.feedback && `${c.feedback} feedback`, c.reports && `${c.reports} price report${c.reports === 1 ? "" : "s"}`, c.suggestions && `${c.suggestions} store suggestion${c.suggestions === 1 ? "" : "s"}`, c.support && `${c.support} support ticket${c.support === 1 ? "" : "s"}`].filter(Boolean);
  return {
    id: "inbox-new",
    area: "inbox",
    label: "Inbox",
    status,
    detail: total ? `${total} waiting (${parts.join(", ")}); the oldest has waited ${ageText(waitH)}.` : "Nothing waiting.",
    value: total,
    unit: "items",
    ...(status === "ok" ? {} : { hint: "Open /admin/inbox. Anything sent has also been emailed to you; this only says it is still unanswered." }),
  };
}

// ── Who to tell ──────────────────────────────────────────────────────────────

/** Per check id: its last status, when it started, and when we last told the owner about it. */
export type AlertState = Record<string, { status: Status; since: string; notifiedAt: string | null }>;

export interface AlertPlan {
  /** New problems, problems that got worse, and long-standing failures due a reminder. */
  raise: Check[];
  /** Problems that cleared. */
  recovered: Check[];
  state: AlertState;
}

/** A failure that stays failed is repeated once a day; a warning is told once, then again after three days. */
export const REMIND_FAIL_H = 24;
export const REMIND_WARN_H = 72;

/**
 * Compare this report with what we told the owner last time. A problem is
 * announced when it first appears or worsens (warn → fail), reminded while it
 * persists, and announced as recovered when it clears. "unknown" never raises
 * and never clears (a check that cannot be read keeps its last known state).
 * `silent` records the state without raising anything (the very first run).
 */
export function planAlerts(prev: AlertState, report: HealthReport, now: Date, silent = false): AlertPlan {
  const state: AlertState = {};
  const raise: Check[] = [];
  const recovered: Check[] = [];
  for (const c of report.checks) {
    const before = prev[c.id];
    if (c.status === "unknown") {
      if (before) state[c.id] = before;
      continue;
    }
    if (c.status === "ok") {
      if (before && before.status !== "ok" && before.notifiedAt) recovered.push(c);
      continue; // an ok check carries no state
    }
    const worsened = before && before.status === "warn" && c.status === "fail";
    const isNew = !before || before.status === "ok";
    const remindH = c.status === "fail" ? REMIND_FAIL_H : REMIND_WARN_H;
    const due = before?.notifiedAt != null && hoursAgo(before.notifiedAt, now) >= remindH;
    const unannounced = before != null && before.notifiedAt == null;
    const tell = !silent && (isNew || worsened || due || unannounced);
    if (tell) raise.push(c);
    state[c.id] = { status: c.status, since: isNew || !before ? now.toISOString() : before.since, notifiedAt: tell ? now.toISOString() : (before?.notifiedAt ?? (silent ? now.toISOString() : null)) };
  }
  return { raise, recovered, state };
}

// ── Rendering (private data never goes in: counts and our own sentences only) ─

const ICON: Record<Status, string> = { ok: "OK", warn: "WARNING", fail: "PROBLEM", unknown: "UNKNOWN" };
export const statusWord = (s: Status) => ICON[s];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderAlertEmail(plan: Pick<AlertPlan, "raise" | "recovered">, report: HealthReport, siteUrl: string): { subject: string; html: string; text: string } {
  const fails = plan.raise.filter((c) => c.status === "fail").length;
  const warns = plan.raise.length - fails;
  const subject = plan.raise.length
    ? `OP Compare: ${fails ? `${fails} problem${fails === 1 ? "" : "s"}` : `${warns} warning${warns === 1 ? "" : "s"}`}${plan.raise.length > 1 && fails && warns ? ` and ${warns} warning${warns === 1 ? "" : "s"}` : ""}: ${plan.raise[0].label}${plan.raise.length > 1 ? ` +${plan.raise.length - 1}` : ""}`
    : `OP Compare: back to normal${plan.recovered.length === 1 ? `: ${plan.recovered[0].label}` : ""}`;
  const link = `${siteUrl.replace(/\/+$/, "")}/admin/health`;
  const row = (c: Check) => `<li style="margin:0 0 12px"><b>${esc(c.label)}</b> <span style="color:${c.status === "fail" ? "#c0392b" : "#b9770e"}">${statusWord(c.status)}</span><br>${esc(c.detail)}${c.hint ? `<br><i>${esc(c.hint)}</i>` : ""}</li>`;
  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">` +
    (plan.raise.length ? `<p>Needs a look:</p><ul style="padding-left:18px">${plan.raise.map(row).join("")}</ul>` : "") +
    (plan.recovered.length ? `<p>Cleared:</p><ul style="padding-left:18px">${plan.recovered.map((c) => `<li><b>${esc(c.label)}</b>: ${esc(c.detail)}</li>`).join("")}</ul>` : "") +
    `<p>Overall: <b>${statusWord(report.overall)}</b>. <a href="${esc(link)}">Open the health page</a>.</p></div>`;
  const text =
    (plan.raise.length ? `Needs a look:\n${plan.raise.map((c) => `- ${c.label} [${statusWord(c.status)}]: ${c.detail}${c.hint ? `\n  ${c.hint}` : ""}`).join("\n")}\n\n` : "") +
    (plan.recovered.length ? `Cleared:\n${plan.recovered.map((c) => `- ${c.label}: ${c.detail}`).join("\n")}\n\n` : "") +
    `Overall: ${statusWord(report.overall)}. ${link}`;
  return { subject, html, text };
}

/** The Monday summary: everything in one place, so a quiet week is still visibly healthy. */
export function renderDigestEmail(report: HealthReport, inbox: InboxCounts | null, siteUrl: string): { subject: string; html: string; text: string } {
  const link = `${siteUrl.replace(/\/+$/, "")}/admin/health`;
  const problems = report.checks.filter((c) => c.status === "warn" || c.status === "fail");
  const subject = problems.length ? `OP Compare weekly: ${problems.length} thing${problems.length === 1 ? "" : "s"} to look at` : "OP Compare weekly: all healthy";
  const limits = report.checks.filter((c) => c.limit != null && c.value != null && c.unit !== "stores");
  const line = (c: Check) => `${c.label}: ${c.detail}`;
  const lines = [...problems.map((c) => `[${statusWord(c.status)}] ${line(c)}`), ...limits.filter((c) => !problems.includes(c)).map(line), inbox ? `Inbox: ${inboxTotal(inbox)} waiting.` : ""].filter(Boolean);
  return {
    subject,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5"><p>${problems.length ? "Needs a look, then the limits:" : "Everything is healthy. The limits:"}</p><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p><a href="${esc(link)}">Open the health page</a></p></div>`,
    text: `${lines.join("\n")}\n\n${link}`,
  };
}

/** The body of the single GitHub issue used when email is off. Public repo: our own sentences only. */
export function renderIssueBody(report: HealthReport, inboxNew: number, owner: string): string {
  const bad = report.checks.filter((c) => c.status === "warn" || c.status === "fail");
  return [
    `@${owner} the OP Compare watchdog found ${bad.length ? `${bad.length} thing${bad.length === 1 ? "" : "s"} to look at` : "nothing wrong"} (${report.at.slice(0, 16).replace("T", " ")} UTC).`,
    "",
    ...bad.map((c) => `- **${c.label}** (${statusWord(c.status)}): ${c.detail}${c.hint ? ` ${c.hint}` : ""}`),
    bad.length ? "" : "",
    inboxNew ? `There are ${inboxNew} new inbox item${inboxNew === 1 ? "" : "s"} waiting in /admin/inbox.` : "",
    "",
    "_This issue is updated by the watchdog workflow. It carries counts and status only, never visitor messages._",
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}
