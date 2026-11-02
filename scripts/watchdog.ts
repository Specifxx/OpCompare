// THE WATCHDOG (owner, 2026-10-14). Run by .github/workflows/watchdog.yml every
// four hours, and as the last step of nothing else: it must keep working when
// the import, the eBay pass or the mailer is what broke.
//
//   1. collect every limit and health signal (lib/health-collect.ts; each
//      source guarded, so a broken one is "unknown", not a crash)
//   2. store the report in Meta "health:report" for /admin and /admin/health
//   3. tell the owner about RED only (new failures, daily reminders, recoveries):
//      by email when mail is configured, else through one GitHub issue (counts
//      only: the repository is public). Warnings wait for Empire HQ.
//   4. write ops-status.json for Empire HQ (riftcompare.com/admin/hq) and the one
//      Monday report, which replaced the weekly summary email (2026-11-02)
//
// Exits 1 only when it found a problem it could not tell anyone about, so
// GitHub's own failed-run email is the last resort.
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/db";
import { isEmailEnabled } from "../src/lib/email";
import { collectAll } from "../src/lib/health-collect";
import { syncWatchdogIssue } from "../src/lib/health-issue";
import { inboxTotal, planAlerts, renderAlertEmail } from "../src/lib/health";
import { loadAlertState, saveAlertState, saveReport } from "../src/lib/admin-health-report";
import { sendOwnerEmail } from "../src/lib/owner-notify";

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function main() {
  const now = new Date();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://opcompare.app";
  const { report, inbox } = await collectAll(now);
  await saveReport(report);
  for (const c of report.checks) log(`${c.status.toUpperCase().padEnd(7)} ${c.label}: ${c.detail}`);
  log(`Overall: ${report.overall}`);

  const prev = await loadAlertState();
  const plan = planAlerts(prev ?? {}, report, now, prev == null);
  const tell = plan.raise.length + plan.recovered.length > 0;
  let delivered = !tell;
  if (tell) {
    const mail = renderAlertEmail(plan, report, siteUrl);
    if (isEmailEnabled()) delivered = await sendOwnerEmail(mail.subject, mail.html, mail.text);
    if (delivered) log(`Emailed the owner: ${mail.subject}`);
    else {
      const token = process.env.GITHUB_TOKEN;
      const repo = process.env.GITHUB_REPOSITORY;
      if (token && repo) delivered = await syncWatchdogIssue({ token, repo, report, inboxNew: inbox ? inboxTotal(inbox) : 0, announce: true });
      log(delivered ? "Email is off or failed: updated the GitHub issue instead." : "Could not tell anyone (no mail, no issue).");
    }
  } else if (!isEmailEnabled() && process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
    // Quiet run with email off: keep the issue's body current, without a notification.
    await syncWatchdogIssue({ token: process.env.GITHUB_TOKEN, repo: process.env.GITHUB_REPOSITORY, report, inboxNew: inbox ? inboxTotal(inbox) : 0, announce: false });
  }
  // Only remember that the owner was told when someone really was: otherwise the next run retries.
  if (delivered) await saveAlertState(plan.state);

  // Empire HQ's copy (riftcompare.com/admin/hq and the one Monday report, which replaced this
  // watchdog's own Monday summary; owner, 2026-11-02). The workflow publishes it on the public
  // `ops-status` branch: status and our own sentences only, never a visitor's text.
  writeFileSync(
    process.env.OPS_STATUS_FILE || "ops-status.json",
    JSON.stringify({ v: 1, site: "opcompare.app", at: report.at, overall: report.overall, checks: report.checks.map((c) => ({ name: c.label, status: c.status, detail: c.detail })), inbox: inbox ? inboxTotal(inbox) : null }, null, 1) + "\n",
  );
  if (!delivered && plan.raise.some((c) => c.status === "fail")) throw new Error("A problem was found and could not be reported by email or issue: see the log above.");
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
