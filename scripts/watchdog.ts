// THE WATCHDOG (owner, 2026-10-14). Run by .github/workflows/watchdog.yml every
// four hours, and as the last step of nothing else: it must keep working when
// the import, the eBay pass or the mailer is what broke.
//
//   1. collect every limit and health signal (lib/health-collect.ts; each
//      source guarded, so a broken one is "unknown", not a crash)
//   2. store the report in Meta "health:report" for /admin and /admin/health
//   3. tell the owner about NEW problems, worsened ones, reminders and
//      recoveries: by email to the owner when mail is configured, else through
//      one GitHub issue (counts only: the repository is public)
//   4. on Mondays, the weekly summary email
//
// Exits 1 only when it found a problem it could not tell anyone about, so
// GitHub's own failed-run email is the last resort.
import { prisma } from "../src/lib/db";
import { isEmailEnabled } from "../src/lib/email";
import { collectAll } from "../src/lib/health-collect";
import { syncWatchdogIssue } from "../src/lib/health-issue";
import { inboxTotal, planAlerts, renderAlertEmail, renderDigestEmail } from "../src/lib/health";
import { loadAlertState, saveAlertState, saveReport } from "../src/lib/admin-health-report";
import { sendOwnerEmail } from "../src/lib/owner-notify";

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const DIGEST_KEY = "health:digest-at";

async function main() {
  const now = new Date();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.opcompare.app";
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

  // Monday summary (once a day at most, between 08:00 and 12:00 UTC, so it lands with the morning).
  const today = now.toISOString().slice(0, 10);
  if (now.getUTCDay() === 1 && now.getUTCHours() >= 8 && isEmailEnabled()) {
    const done = (await prisma.meta.findUnique({ where: { key: DIGEST_KEY } }))?.value;
    if (done !== today) {
      const d = renderDigestEmail(report, inbox, siteUrl);
      if (await sendOwnerEmail(d.subject, d.html, d.text)) {
        await prisma.meta.upsert({ where: { key: DIGEST_KEY }, create: { key: DIGEST_KEY, value: today }, update: { value: today } });
        log("Sent the weekly summary.");
      }
    }
  }
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
