import type { Metadata } from "next";
import Link from "next/link";
import { adminMetadata, requireAdminPage } from "@/lib/admin";
import { liveInboxCounts, loadStoredReport, REPORT_STALE_H } from "@/lib/admin-health-report";
import { AREAS, ageText, inboxTotal, statusWord, type Check, type Status } from "@/lib/health";

export const dynamic = "force-dynamic";
export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Health" });

const DOT: Record<Status, string> = { ok: "bg-emerald-400", warn: "bg-amber-400", fail: "bg-rose-500", unknown: "bg-slate-500" };
const TEXT: Record<Status, string> = { ok: "text-emerald-400", warn: "text-amber-300", fail: "text-rose-400", unknown: "text-slate-400" };

function Bar({ c }: { c: Check }) {
  if (c.value == null || !c.limit) return null;
  const r = Math.min(1, c.value / c.limit);
  return (
    <div className="mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded bg-ink-700" role="img" aria-label={`${Math.round(r * 100)}% of the limit`}>
      <div className={`h-full ${c.status === "fail" ? "bg-rose-500" : c.status === "warn" ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.max(2, Math.round(r * 100))}%` }} />
    </div>
  );
}

export default async function AdminHealth() {
  await requireAdminPage();
  const [report, inbox] = await Promise.all([loadStoredReport().catch(() => null), liveInboxCounts().catch(() => null)]);
  const ageH = report ? (Date.now() - Date.parse(report.at)) / 3_600_000 : null;
  const stale = ageH != null && ageH > REPORT_STALE_H;
  const problems = report ? report.checks.filter((c) => c.status === "warn" || c.status === "fail") : [];
  return (
    <div>
      <h1 className="text-3xl text-white">Health</h1>
      <p className="mt-1 text-sm text-slate-400">
        {report ? `Checked ${ageText(ageH!)} ago, every eight hours.` : "No report yet."} You are emailed about anything new; this page is for looking, not for remembering to look.
      </p>

      {!report ? (
        <div className="card-surface mt-6 p-5 text-sm text-slate-300">
          The watchdog has not reported yet. It runs from the <b>Watchdog</b> workflow in GitHub Actions (press <b>Run workflow</b> once to get the first report).
        </div>
      ) : (
        <>
          <div className={`card-surface mt-6 flex flex-wrap items-center gap-3 p-5 ${report.overall === "fail" ? "border-rose-500/60" : report.overall === "warn" ? "border-amber-400/60" : ""}`}>
            <span className={`h-3 w-3 rounded-full ${DOT[stale ? "warn" : report.overall]}`} />
            <p className="flex-1 text-white">
              {stale
                ? `The watchdog has not reported for ${ageText(ageH!)}: it may have stopped. Open the Watchdog workflow in GitHub Actions.`
                : problems.length
                  ? `${problems.length} thing${problems.length === 1 ? "" : "s"} to look at.`
                  : "Everything is healthy."}
            </p>
            {inbox ? (
              <Link href="/admin/inbox" className="chip bg-brand-500 text-white">
                {inboxTotal(inbox) ? `${inboxTotal(inbox)} new in the inbox` : "Inbox is clear"}
              </Link>
            ) : null}
          </div>

          {AREAS.map((a) => {
            const checks = report.checks.filter((c) => c.area === a.id);
            if (!checks.length) return null;
            return (
              <section key={a.id} className="mt-8">
                <h2 className="text-lg font-bold text-white">{a.label}</h2>
                <ul className="card-surface mt-2 divide-y divide-ink-700">
                  {checks.map((c) => (
                    <li key={c.id} className="p-4">
                      <p className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[c.status]}`} />
                        <span className="font-semibold text-white">{c.label}</span>
                        <span className={`text-xs font-bold uppercase tracking-wide ${TEXT[c.status]}`}>{statusWord(c.status)}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-300">{c.detail}</p>
                      <Bar c={c} />
                      {c.hint ? <p className="mt-2 text-sm text-amber-200/90">{c.hint}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
      <p className="mt-8 text-xs text-slate-500">
        Source: scripts/watchdog.ts. Thresholds and what each check means are in src/lib/health.ts. Limits default to the Neon free plan and can be changed with the repository variables NEON_TRANSFER_LIMIT_GB, NEON_COMPUTE_LIMIT_HOURS and NEON_STORAGE_LIMIT_MB.
      </p>
    </div>
  );
}
