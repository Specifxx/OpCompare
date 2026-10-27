// The self-check (lib/health.ts), the owner's inbox emails (lib/owner-notify.ts),
// the GitHub-issue fallback (lib/health-issue.ts) and the wiring that keeps all
// of it private: the repository is public, so nothing a visitor typed may reach
// an issue, and nothing under src/app may send mail.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildReport,
  ebayRunOf,
  evalAge,
  evalEbay,
  evalEmail,
  evalInbox,
  evalJobs,
  evalNeon,
  evalQuota,
  evalSite,
  evalStores,
  inboxTotal,
  overallStatus,
  planAlerts,
  renderAlertEmail,
  renderDigestEmail,
  renderIssueBody,
  spendByQuotaDay,
  type AlertState,
  type Check,
  type EbayRunLite,
  type WorkflowRun,
} from "../src/lib/health";
import { DAILY_CALL_CAP, quotaDayStart } from "../src/lib/ebay-plan";
import { EBAY_DAILY_CAP, ebayQuotaDayStart } from "../src/lib/health";
import { syncWatchdogIssue } from "../src/lib/health-issue";
import { DEFAULT_OWNER_EMAIL, loadNewInbox, notifyOwnerInbox, ownerEmail, renderInboxEmail, type InboxDb } from "../src/lib/owner-notify";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const GB = 1024 ** 3;
const NOW = new Date("2026-10-14T12:00:00Z");
const H = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

// ── Limits ───────────────────────────────────────────────────────────────────
test("evalQuota: a month is judged by what is used AND by the pace", () => {
  const base = { id: "t", area: "database" as const, label: "t", limit: 5 * GB, unit: "bytes", fmt: (n: number) => `${(n / GB).toFixed(1)} GB`, periodStart: new Date("2026-10-01T00:00:00Z"), periodEnd: new Date("2026-11-01T00:00:00Z"), hint: "h" };
  // Day 13.5 of 31 (43%): 1 GB used is 20% of the limit, on pace for 46%.
  assert.equal(evalQuota({ ...base, used: 1 * GB, now: NOW }).status, "ok");
  // 2.3 GB at 43% of the month is only 46% used but on pace for 106%: warn before it is a crisis.
  assert.equal(evalQuota({ ...base, used: 2.3 * GB, now: NOW }).status, "warn");
  // 3 GB at 43% of the month: on pace for 138%.
  assert.equal(evalQuota({ ...base, used: 3 * GB, now: NOW }).status, "fail");
  // Almost spent is a failure whatever the date.
  assert.equal(evalQuota({ ...base, used: 4.6 * GB, now: new Date("2026-10-30T00:00:00Z") }).status, "fail");
  // Day 2: one busy import says nothing about pace, only the amount counts.
  assert.equal(evalQuota({ ...base, used: 1.5 * GB, now: new Date("2026-10-02T00:00:00Z") }).status, "ok");
  assert.equal(evalQuota({ ...base, used: 3.8 * GB, now: new Date("2026-10-02T00:00:00Z") }).status, "warn");
  const c = evalQuota({ ...base, used: 3 * GB, now: NOW });
  assert.equal(c.value, 3 * GB);
  assert.equal(c.limit, 5 * GB);
  assert.ok(c.hint);
  assert.ok(!evalQuota({ ...base, used: 1 * GB, now: NOW }).hint, "an ok check carries no hint");
});

test("evalNeon: without the API key the transfer is 'not connected', never a false ok, and never alerts", () => {
  const limits = { transferBytes: 5 * GB, computeHours: 100, storageBytes: 512 * 1024 ** 2 };
  const checks = evalNeon({ transferBytes: null, computeSeconds: null, periodStart: null, periodEnd: null, databaseBytes: 100 * 1024 ** 2, limits }, NOW);
  assert.deepEqual(checks.map((c) => [c.id, c.status]), [["neon-transfer", "unknown"], ["neon-compute", "unknown"], ["neon-storage", "ok"]]);
  assert.match(checks[0].hint!, /NEON_API_KEY/);
  assert.equal(overallStatus(checks), "ok");
  const full = evalNeon({ transferBytes: 4.7 * GB, computeSeconds: 10 * 3600, periodStart: new Date("2026-10-01T00:00:00Z"), periodEnd: new Date("2026-11-01T00:00:00Z"), databaseBytes: 480 * 1024 ** 2, limits }, NOW);
  assert.equal(full.find((c) => c.id === "neon-transfer")!.status, "fail");
  assert.equal(full.find((c) => c.id === "neon-compute")!.status, "ok");
  assert.equal(full.find((c) => c.id === "neon-storage")!.status, "fail");
});

// ── Freshness, stores, site ──────────────────────────────────────────────────
test("evalAge, evalStores, evalSite", () => {
  const age = (h: number | null) => evalAge({ id: "a", area: "prices", label: "a", at: h == null ? null : H(h), warnH: 16, failH: 30, now: NOW, what: "import", hint: "h" });
  assert.equal(age(2).status, "ok");
  assert.equal(age(20).status, "warn");
  assert.equal(age(40).status, "fail");
  assert.equal(age(null).status, "unknown");
  assert.equal(evalStores({ failed: 0, total: 40 }).status, "ok");
  assert.equal(evalStores({ failed: 1, total: 40 }).status, "ok");
  assert.equal(evalStores({ failed: 4, total: 40 }).status, "warn");
  assert.equal(evalStores({ failed: 12, total: 40 }).status, "fail");
  assert.equal(evalStores({ failed: null, total: 40 }).status, "unknown");
  const ok = { path: "/", status: 200, ms: 400, bytes: 9000, marker: true, critical: true };
  assert.equal(evalSite([ok, { ...ok, path: "/sealed", critical: false }])[0].status, "ok");
  assert.equal(evalSite([{ ...ok, status: 500 }])[0].status, "fail");
  assert.equal(evalSite([{ ...ok, marker: false }])[0].status, "fail", "a 200 error page is not up");
  assert.equal(evalSite([ok, { ...ok, path: "/sealed", status: 404, critical: false }])[0].status, "warn");
  assert.equal(evalSite([{ ...ok, ms: 6000 }])[0].status, "warn");
  assert.equal(evalSite([{ ...ok, status: 0, error: "timeout" }])[0].status, "fail");
});

// ── eBay ─────────────────────────────────────────────────────────────────────
const run = (h: number, o: Partial<EbayRunLite> = {}): EbayRunLite => ({ startedAt: H(h), ok: true, spent: 2500, budget: 2500, remainingStart: 5000, dailyLimit: 5000, latched: "budget", completed: 2400, tokenRefused: false, foreignSpendWarning: false, searched: 2400, matched: 1400, ...o });

test("evalEbay: a missing, refused, rate-limited or under-spending pass is each its own message", () => {
  const ids = (cs: Check[]) => Object.fromEntries(cs.map((c) => [c.id, c.status]));
  assert.deepEqual(ids(evalEbay([], NOW)), { "ebay-run": "unknown" });
  // Today's run (3 h ago, 2,500) and yesterday's (27 h ago, 2,500): healthy.
  assert.deepEqual(ids(evalEbay([run(3), run(27)], NOW)), { "ebay-run": "ok", "ebay-health": "ok", "ebay-quota": "ok" });
  assert.deepEqual(ids(evalEbay([run(60)], NOW)), { "ebay-run": "fail" }, "an overdue pass is one alert, not three");
  assert.equal(ids(evalEbay([run(3, { tokenRefused: true }), run(27)], NOW))["ebay-health"], "fail");
  assert.equal(ids(evalEbay([run(3, { ok: false }), run(27)], NOW))["ebay-health"], "fail");
  assert.equal(ids(evalEbay([run(3, { latched: "429" }), run(27)], NOW))["ebay-health"], "warn");
  assert.equal(ids(evalEbay([run(3, { foreignSpendWarning: true }), run(27)], NOW))["ebay-health"], "warn");
  assert.equal(ids(evalEbay([run(3, { searched: 1000, matched: 50 }), run(27)], NOW))["ebay-health"], "warn");
  // The owner wants every day's 2,500 spent: the last COMPLETE quota day at 1,200 is flagged.
  const under = evalEbay([run(3, { spent: 800 }), run(27, { spent: 1200 })], NOW).find((c) => c.id === "ebay-quota")!;
  assert.equal(under.status, "warn");
  assert.match(under.hint!, /unspent|cut/);
  assert.equal(under.limit, 2500);
});

test("spendByQuotaDay counts eBay's own 07:00 UTC day, not a rolling 24 hours", () => {
  // NOW is 12:00 on the 14th: today's quota day began 07:00 that day.
  const runs = [run(1, { spent: 100 }), run(4, { spent: 200 }), run(6, { spent: 50 }) /* 06:00 → still the 13th's day */, run(20, { spent: 700 })];
  assert.deepEqual(spendByQuotaDay(runs, NOW, 2), [300, 750]);
});

test("ebayRunOf reads an ImportRun summary and tolerates old rows", () => {
  const r = ebayRunOf(H(1), true, { spent: 900, budget: 900, remainingStart: 1400, dailyLimit: 5000, latched: "budget", completed: 700, byMarket: { US: { searched: 400, matched: 250 }, UK: { searched: 300, matched: 150 } } });
  assert.deepEqual([r.spent, r.searched, r.matched, r.remainingStart], [900, 700, 400, 1400]);
  const old = ebayRunOf(H(1), false, null);
  assert.deepEqual([old.spent, old.searched, old.tokenRefused], [0, 0, false]);
});

// ── Jobs, email, inbox ───────────────────────────────────────────────────────
test("evalJobs: failures and silence are problems; a cancelled run is neither", () => {
  const r = (file: string, h: number, conclusion: string): WorkflowRun => ({ path: `.github/workflows/${file}`, conclusion, startedAt: H(h).toISOString(), event: "schedule" });
  const jobs = [{ file: "import-prices.yml", label: "Price import", maxAgeH: 18, critical: true }, { file: "ebay-prices.yml", label: "eBay pass", maxAgeH: 30 }, { file: "indexnow.yml", label: "IndexNow", maxAgeH: null }];
  const by = (cs: Check[]) => Object.fromEntries(cs.map((c) => [c.id, c.status]));
  assert.deepEqual(by(evalJobs([r("import-prices.yml", 3, "success"), r("ebay-prices.yml", 5, "success"), r("indexnow.yml", 40, "success")], NOW, jobs)), { "job-import-prices": "ok", "job-ebay-prices": "ok", "job-indexnow": "ok" });
  assert.equal(by(evalJobs([r("import-prices.yml", 3, "failure"), r("import-prices.yml", 15, "success")], NOW, jobs))["job-import-prices"], "fail", "a critical job failing is a problem");
  assert.equal(by(evalJobs([r("ebay-prices.yml", 3, "failure")], NOW, jobs))["job-ebay-prices"], "warn");
  assert.equal(by(evalJobs([r("import-prices.yml", 30, "success")], NOW, jobs))["job-import-prices"], "fail", "silent beyond its cadence");
  assert.equal(by(evalJobs([r("import-prices.yml", 3, "cancelled"), r("import-prices.yml", 9, "success")], NOW, jobs))["job-import-prices"], "ok");
  assert.equal(by(evalJobs([], NOW, jobs))["job-import-prices"], "unknown");
  const timeout = evalJobs([r("ebay-prices.yml", 3, "timed_out")], NOW, jobs).find((c) => c.id === "job-ebay-prices")!;
  assert.match(timeout.detail, /timed out/);
});

test("evalEmail and evalInbox", () => {
  assert.equal(evalEmail("on").status, "ok");
  assert.equal(evalEmail("off").status, "warn");
  assert.match(evalEmail("off").hint!, /mail secrets/);
  assert.equal(evalEmail(null).status, "unknown");
  const none = { reports: 0, suggestions: 0, feedback: 0, contact: 0, support: 0 };
  assert.equal(evalInbox(none, null, NOW).status, "ok");
  const some = { ...none, contact: 2, feedback: 1 };
  assert.equal(inboxTotal(some), 2, "feedback never counts as waiting (owner, 2026-10-27)");
  assert.equal(evalInbox({ ...none, feedback: 40 }, H(24 * 30), NOW).status, "ok", "old feedback alone never alerts");
  assert.equal(evalInbox(some, H(5), NOW).status, "ok");
  assert.equal(evalInbox(some, H(80), NOW).status, "warn");
  assert.equal(evalInbox(some, H(24 * 8), NOW).status, "fail");
  assert.match(evalInbox(some, H(5), NOW).detail, /2 waiting \(2 messages\)/);
  assert.equal(evalInbox(null, null, NOW).status, "unknown");
});

// ── Who to tell ──────────────────────────────────────────────────────────────
const chk = (id: string, status: Check["status"], label = id): Check => ({ id, area: "jobs", label, status, detail: `${id} is ${status}` });
const rep = (...checks: Check[]) => buildReport(checks, NOW);

test("planAlerts: tell once when it appears, again if it worsens, remind a failure daily, announce recovery", () => {
  // First ever run records the state and says nothing.
  const first = planAlerts({}, rep(chk("a", "fail")), NOW, true);
  assert.deepEqual(first.raise, []);
  assert.equal(first.state.a.status, "fail");
  // A new problem is raised, and remembered as told.
  const t0 = planAlerts({}, rep(chk("a", "warn"), chk("b", "ok")), NOW);
  assert.deepEqual(t0.raise.map((c) => c.id), ["a"]);
  assert.ok(t0.state.a.notifiedAt);
  // The same warning an hour later is quiet.
  const t1 = planAlerts(t0.state, rep(chk("a", "warn")), new Date(NOW.getTime() + 3_600_000));
  assert.deepEqual(t1.raise, []);
  // It worsens: told again straight away.
  const t2 = planAlerts(t0.state, rep(chk("a", "fail")), new Date(NOW.getTime() + 3_600_000));
  assert.deepEqual(t2.raise.map((c) => c.id), ["a"]);
  // A failure is repeated after 24h, a warning only after 72h.
  assert.deepEqual(planAlerts(t2.state, rep(chk("a", "fail")), new Date(NOW.getTime() + 25 * 3_600_000)).raise.map((c) => c.id), ["a"]);
  assert.deepEqual(planAlerts(t0.state, rep(chk("a", "warn")), new Date(NOW.getTime() + 30 * 3_600_000)).raise, []);
  assert.deepEqual(planAlerts(t0.state, rep(chk("a", "warn")), new Date(NOW.getTime() + 73 * 3_600_000)).raise.map((c) => c.id), ["a"]);
  // It clears: announced once, then gone from the state.
  const t3 = planAlerts(t2.state, rep(chk("a", "ok")), new Date(NOW.getTime() + 5 * 3_600_000));
  assert.deepEqual(t3.recovered.map((c) => c.id), ["a"]);
  assert.equal(t3.state.a, undefined);
  assert.deepEqual(planAlerts(t3.state, rep(chk("a", "ok")), NOW).recovered, []);
  // Unknown neither raises nor clears: the last known state is kept.
  const t4 = planAlerts(t2.state, rep(chk("a", "unknown")), new Date(NOW.getTime() + 2 * 3_600_000));
  assert.deepEqual([t4.raise, t4.recovered], [[], []]);
  assert.equal(t4.state.a.status, "fail");
  // A problem that was never successfully told (the send failed) is told next time.
  const pending: AlertState = { a: { status: "warn", since: NOW.toISOString(), notifiedAt: null } };
  assert.deepEqual(planAlerts(pending, rep(chk("a", "warn")), NOW).raise.map((c) => c.id), ["a"]);
});

test("overall status: fail beats warn beats ok, and unknown never counts", () => {
  assert.equal(overallStatus([chk("a", "ok"), chk("b", "unknown")]), "ok");
  assert.equal(overallStatus([chk("a", "ok"), chk("b", "warn")]), "warn");
  assert.equal(overallStatus([chk("a", "warn"), chk("b", "fail"), chk("c", "unknown")]), "fail");
  assert.equal(overallStatus([]), "ok");
});

// ── Rendering and privacy ────────────────────────────────────────────────────
test("alert, digest and issue text: our sentences, escaped, with the link and no private data", () => {
  const bad: Check = { id: "x", area: "ebay", label: "eBay <run>", status: "fail", detail: "It failed & stopped.", hint: "Open the workflow." };
  const report = rep(bad);
  const mail = renderAlertEmail({ raise: [bad], recovered: [] }, report, "https://opcompare.app/");
  assert.match(mail.subject, /1 problem: eBay <run>/);
  assert.ok(mail.html.includes("eBay &lt;run&gt;") && mail.html.includes("&amp; stopped"), "escaped");
  assert.ok(mail.html.includes("https://opcompare.app/admin/health") && mail.text.includes("https://opcompare.app/admin/health"));
  const back = renderAlertEmail({ raise: [], recovered: [chk("a", "ok", "Price import")] }, rep(chk("a", "ok")), "https://opcompare.app");
  assert.match(back.subject, /back to normal: Price import/);
  const digest = renderDigestEmail(rep({ id: "neon-transfer", area: "database", label: "Neon network transfer", status: "ok", detail: "1.0 GB of 5.0 GB (20%)", value: GB, limit: 5 * GB, unit: "bytes" }), { reports: 0, suggestions: 0, feedback: 9, contact: 1, support: 0 }, "https://opcompare.app");
  assert.match(digest.subject, /all healthy/);
  assert.match(digest.text, /Neon network transfer: 1.0 GB of 5.0 GB/);
  assert.match(digest.text, /Inbox: 1 waiting/);
  const issue = renderIssueBody(report, 3, "Specifxx");
  assert.match(issue, /^@Specifxx /);
  assert.match(issue, /3 new inbox items/);
  assert.match(issue, /never visitor messages/);
});

test("the issue and the alert text are built from the report alone: a visitor's message cannot reach them", () => {
  // The renderers take only a HealthReport and a COUNT. The inbox's text never enters health.ts or health-issue.ts.
  for (const f of ["src/lib/health.ts", "src/lib/health-issue.ts", "src/lib/health-collect.ts"]) {
    const t = read(f);
    assert.doesNotMatch(t, /from "\.\/owner-notify"|from "\.\/email"/, `${f} never imports the mailer or the inbox text`);
    assert.doesNotMatch(t, /(contactMessage|feedback|priceReport|storeSuggestion|supportTicket)\.findMany/, `${f} never lists inbox rows`);
  }
  // The collector reads inbox COUNTS, and for the oldest waiting item only its date.
  const collect = read("src/lib/health-collect.ts");
  const firsts = [...collect.matchAll(/(contactMessage|feedback|priceReport|storeSuggestion|supportTicket)\.findFirst\(\{[^\n]*\}\)/g)];
  assert.equal(firsts.length, 4, "feedback has no oldest-waiting date: it never waits (2026-10-27)");
  for (const m of firsts) assert.match(m[0], /select: \{ createdAt: true \}/);
});

test("syncWatchdogIssue: opens, updates, comments on change and closes on recovery; refuses to leak", async () => {
  const calls: { url: string; method: string; body?: Record<string, unknown> }[] = [];
  const respond = (open: { number: number; title: string }[]) => (async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const json = (b: unknown) => ({ ok: true, json: async () => b }) as Response;
    return (init?.method ?? "GET") === "GET" ? json(open) : json({});
  }) as unknown as typeof fetch;
  const bad = rep({ id: "x", area: "ebay", label: "eBay pass", status: "fail", detail: "d" });
  const good = rep(chk("a", "ok"));
  // No issue, a problem: create.
  await syncWatchdogIssue({ token: "t", repo: "o/r", report: bad, inboxNew: 0, announce: true, fetchImpl: respond([]) });
  assert.equal(calls.filter((c) => c.method === "POST").length, 1);
  assert.equal(calls.find((c) => c.method === "POST")!.body!.title, "OP Compare watchdog");
  // No issue, nothing wrong: stay silent.
  calls.length = 0;
  await syncWatchdogIssue({ token: "t", repo: "o/r", report: good, inboxNew: 0, announce: true, fetchImpl: respond([]) });
  assert.deepEqual(calls.filter((c) => c.method !== "GET"), []);
  // Open issue, still a problem, announce: patch the body and add a comment.
  calls.length = 0;
  await syncWatchdogIssue({ token: "t", repo: "o/r", report: bad, inboxNew: 0, announce: true, fetchImpl: respond([{ number: 7, title: "OP Compare watchdog" }]) });
  assert.deepEqual(calls.filter((c) => c.method !== "GET").map((c) => c.method + " " + c.url.split("/").slice(-1)[0]), ["PATCH 7", "POST comments"]);
  // Open issue, quiet run: patch only (an edit does not notify).
  calls.length = 0;
  await syncWatchdogIssue({ token: "t", repo: "o/r", report: bad, inboxNew: 0, announce: false, fetchImpl: respond([{ number: 7, title: "OP Compare watchdog" }]) });
  assert.deepEqual(calls.filter((c) => c.method !== "GET").map((c) => c.method), ["PATCH"]);
  // Recovered: close it.
  calls.length = 0;
  await syncWatchdogIssue({ token: "t", repo: "o/r", report: good, inboxNew: 0, announce: true, fetchImpl: respond([{ number: 7, title: "OP Compare watchdog" }]) });
  assert.equal(calls.find((c) => c.method === "PATCH")!.body!.state, "closed");
  // An API failure is reported, not thrown.
  const failing = (async () => { throw new Error("down"); }) as unknown as typeof fetch;
  assert.equal(await syncWatchdogIssue({ token: "t", repo: "o/r", report: bad, inboxNew: 0, announce: true, fetchImpl: failing }), false);
});

// ── The owner's inbox emails ─────────────────────────────────────────────────
function fakeDb(rows: Partial<Record<"contact" | "feedback" | "reports" | "suggestions" | "tickets", unknown[]>> = {}) {
  const meta = new Map<string, string>();
  const queries: Record<string, unknown>[] = [];
  const find = (key: keyof typeof rows) => async (a: Record<string, unknown>) => {
    queries.push(a);
    const where = a.where as { createdAt: { gt: Date; lte: Date } };
    return ((rows[key] ?? []) as { createdAt: Date }[]).filter((r) => r.createdAt > where.createdAt.gt && r.createdAt <= where.createdAt.lte).slice(0, Number(a.take));
  };
  const db = {
    meta: {
      findUnique: async ({ where }: { where: { key: string } }) => (meta.has(where.key) ? { value: meta.get(where.key)! } : null),
      upsert: async ({ where, update }: { where: { key: string }; create: { value: string }; update: { value: string } }) => void meta.set(where.key, update.value),
    },
    contactMessage: { findMany: find("contact") },
    feedback: { findMany: find("feedback") },
    priceReport: { findMany: find("reports") },
    storeSuggestion: { findMany: find("suggestions") },
    supportTicket: { findMany: find("tickets") },
  } as unknown as InboxDb;
  return { db, meta, queries };
}
const msg = (at: string, name = "Ann", text = "Your price for <Shanks> is wrong") => ({ name, email: "ann@example.com", subject: "Price", category: "PRICE_OR_STORE", message: text, createdAt: new Date(at) });

test("the owner's address is bill.jyang101@gmail.com unless OWNER_EMAIL says otherwise", () => {
  assert.equal(DEFAULT_OWNER_EMAIL, "bill.jyang101@gmail.com");
  assert.equal(ownerEmail({}), "bill.jyang101@gmail.com");
  assert.equal(ownerEmail({ OWNER_EMAIL: " me@example.com " }), "me@example.com");
  assert.equal(ownerEmail({ OWNER_EMAIL: "  " }), "bill.jyang101@gmail.com");
});

test("notifyOwnerInbox: the first run only sets the cursor; later runs email what is new, once", async () => {
  const sent: { subject: string; html: string; text: string }[] = [];
  const send = async (subject: string, html: string, text: string) => (sent.push({ subject, html, text }), true);
  const { db, meta } = fakeDb({ contact: [msg("2026-10-14T10:30:00Z"), msg("2026-10-14T11:20:00Z", "Bob", "Second")] });
  const t0 = new Date("2026-10-14T10:00:00Z");
  assert.deepEqual(await notifyOwnerInbox({ db, send, now: t0 }), { sent: 0, first: true });
  assert.equal(meta.get("inbox-notified-at"), t0.toISOString());
  assert.equal(sent.length, 0, "no backlog flood on the first run");
  // An hour and a half later: two messages, one email.
  const t1 = new Date("2026-10-14T11:30:00Z");
  assert.deepEqual(await notifyOwnerInbox({ db, send, now: t1 }), { sent: 2 });
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /2 new items \(2 messages\)/);
  assert.ok(sent[0].html.includes("&lt;Shanks&gt;"), "visitor text is escaped");
  assert.match(sent[0].text, /ann@example\.com/);
  assert.equal(meta.get("inbox-notified-at"), t1.toISOString());
  // Nothing new: nothing sent, cursor moves on.
  const t2 = new Date("2026-10-14T12:30:00Z");
  assert.deepEqual(await notifyOwnerInbox({ db, send, now: t2 }), { sent: 0 });
  assert.equal(sent.length, 1);
});

test("notifyOwnerInbox: a failed send keeps the cursor so the next hour retries", async () => {
  const { db, meta } = fakeDb({ contact: [msg("2026-10-14T10:30:00Z")] });
  meta.set("inbox-notified-at", "2026-10-14T10:00:00.000Z");
  let ok = false;
  const send = async () => ok;
  assert.deepEqual(await notifyOwnerInbox({ db, send, now: new Date("2026-10-14T11:00:00Z") }), { sent: 0, failed: true });
  assert.equal(meta.get("inbox-notified-at"), "2026-10-14T10:00:00.000Z");
  ok = true;
  assert.deepEqual(await notifyOwnerInbox({ db, send, now: new Date("2026-10-14T12:00:00Z") }), { sent: 1 });
});

test("renderInboxEmail covers every queue, one item reads as one email, and a cut-off queue never loses or repeats an item", async () => {
  const { db } = fakeDb({
    contact: [msg("2026-10-14T10:30:00Z")],
    feedback: [{ rating: 4, message: "Love it", email: null, page: "/price-guide", createdAt: new Date("2026-10-14T10:31:00Z"), status: "NEW" }],
    reports: [{ storeName: "Card Spot", issue: "WRONG_PRICE", claimedCents: 1000, shownPriceCents: 5000, currency: "USD", note: null, listingTitle: "Shanks", kind: "card", createdAt: new Date("2026-10-14T10:32:00Z") }],
    suggestions: [{ storeName: "Shop", storeUrl: "https://shop.example", country: "US", note: null, createdAt: new Date("2026-10-14T10:33:00Z") }],
    tickets: [{ number: 12, name: "Cy", email: "cy@example.com", category: "PAYMENT", subject: "Refund", message: "Please help", createdAt: new Date("2026-10-14T10:34:00Z") }],
  });
  const batch = await loadNewInbox(db, new Date("2026-10-14T10:00:00Z"), new Date("2026-10-14T11:00:00Z"));
  // Feedback is never emailed (owner, 2026-10-27): it waits in /admin/inbox.
  assert.deepEqual(batch.items.map((i) => i.kind), ["message", "price report", "store suggestion", "support ticket"]);
  const mail = renderInboxEmail(batch, "https://opcompare.app");
  assert.match(mail.subject, /4 new items/);
  assert.match(mail.text, /OC-12 Refund/);
  assert.ok(mail.text.endsWith("https://opcompare.app/admin/inbox"));
  const one = renderInboxEmail({ items: [batch.items[0]], truncated: false, advanceTo: null }, "https://opcompare.app");
  assert.match(one.subject, /new message: Ann <ann@example\.com>: Price/);
  // 26 messages in one queue: 25 are sent now, and the cursor stops at the 25th so the 26th comes next.
  const many = Array.from({ length: 26 }, (_, i) => msg(new Date(Date.UTC(2026, 9, 14, 10, 1 + i)).toISOString(), `N${i}`));
  const m = fakeDb({ contact: many });
  m.meta.set("inbox-notified-at", "2026-10-14T10:00:00.000Z");
  const sent: string[] = [];
  const r1 = await notifyOwnerInbox({ db: m.db, send: async (s, _h, t) => (sent.push(t), true), now: new Date("2026-10-14T11:00:00Z") });
  assert.equal(r1.sent, 25);
  assert.equal(m.meta.get("inbox-notified-at"), new Date(Date.UTC(2026, 9, 14, 10, 25)).toISOString());
  const r2 = await notifyOwnerInbox({ db: m.db, send: async (s, _h, t) => (sent.push(t), true), now: new Date("2026-10-14T12:00:00Z") });
  assert.equal(r2.sent, 1);
  assert.ok(sent[1].includes("N25") && !sent[1].includes("N24"));
});

// ── Wiring ───────────────────────────────────────────────────────────────────
test("the watchdog workflow: scheduled, read-only but for its issue, never on a push, outside the import windows", () => {
  const y = read(".github/workflows/watchdog.yml");
  assert.doesNotMatch(y, /^\s*push:/m);
  assert.match(y, /permissions:\s*\n\s*contents: read\s*\n\s*actions: read\s*\n\s*issues: write/);
  assert.match(y, /DATABASE_URL: \$\{\{ secrets\.OP3 \|\| vars\.OP3 \|\| secrets\.OP2 \|\| vars\.OP2 \|\| secrets\.DATABASE_URL \}\}/);
  assert.match(y, /NEON_API_KEY: \$\{\{ secrets\.NEON_API_KEY \}\}/);
  assert.match(y, /group: watchdog/);
  assert.doesNotMatch(y, /EBAY_CLIENT/, "the watchdog never holds the eBay keyset");
  const cron = /cron: "(\d+) ([\d,*/]+) \* \* \*"/.exec(y)!;
  const hours = cron[2].split(",").map(Number);
  assert.ok(hours.length >= 3 && hours.length <= 8, "a handful of wakes a day: each wakes Neon");
  assert.ok(![0, 7, 19].includes(Number(cron[1])) && Number(cron[1]) !== 7 && Number(cron[1]) !== 37 && Number(cron[1]) !== 23, "its own minute slot");
});

test("the outbox sends the owner's inbox email first, and the app never imports the senders", () => {
  assert.match(read("scripts/email-hourly.ts"), /attempt\("ownerInbox", \(\) => notifyOwnerInbox/);
  for (const dir of ["src/app", "src/components"]) {
    const walk = (d: string): string[] => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
    for (const f of walk(dir).filter((x) => /\.(ts|tsx)$/.test(x))) {
      assert.doesNotMatch(read(f), /owner-notify|health-collect|health-issue/, f);
    }
  }
});

test("the admin pages: the health page and the bar read the stored report and live counts, behind the admin gate", () => {
  const page = read("src/app/admin/health/page.tsx");
  assert.match(page, /await requireAdminPage\(\)/);
  assert.match(page, /loadStoredReport/);
  assert.doesNotMatch(page, /@\/lib\/db["']/);
  assert.match(read("src/app/admin/layout.tsx"), /adminBadges/);
  assert.match(read("src/components/admin/AdminNav.tsx"), /\/admin\/health/);
  assert.match(read("src/app/admin/page.tsx"), /adminBadges/);
});

test("health.ts's local eBay constants equal the eBay plan's (it imports no eBay code)", () => {
  assert.equal(EBAY_DAILY_CAP, DAILY_CALL_CAP);
  for (const t of ["2026-10-14T00:30:00Z", "2026-10-14T06:59:59Z", "2026-10-14T07:00:00Z", "2026-10-14T23:59:00Z", "2026-01-01T03:00:00Z"]) {
    assert.equal(ebayQuotaDayStart(new Date(t)).toISOString(), quotaDayStart(new Date(t)).toISOString(), t);
  }
});
