// The stored watchdog report and alert state (Meta keys), plus the live inbox
// number the admin bar shows. Uncached and owner-only, like every admin*.ts.
// The watchdog (scripts/watchdog.ts) writes; /admin and /admin/health read.
import { newCounts } from "./admin-inbox";
import { prisma } from "./db";
import type { AlertState, HealthReport, InboxCounts, Status } from "./health";
import { inboxTotal } from "./health";

export const HEALTH_REPORT_KEY = "health:report";
export const HEALTH_STATE_KEY = "health:state";
/** The report is judged stale after this long: the watchdog itself has stopped. */
export const REPORT_STALE_H = 8;

const parse = <T>(v: string | null | undefined): T | null => {
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
};

export async function loadStoredReport(): Promise<HealthReport | null> {
  const row = await prisma.meta.findUnique({ where: { key: HEALTH_REPORT_KEY }, select: { value: true } });
  const r = parse<HealthReport>(row?.value);
  return r && r.v === 1 && Array.isArray(r.checks) ? r : null;
}

export async function saveReport(report: HealthReport): Promise<void> {
  const value = JSON.stringify(report);
  await prisma.meta.upsert({ where: { key: HEALTH_REPORT_KEY }, create: { key: HEALTH_REPORT_KEY, value }, update: { value } });
}

export async function loadAlertState(): Promise<AlertState | null> {
  const row = await prisma.meta.findUnique({ where: { key: HEALTH_STATE_KEY }, select: { value: true } });
  return parse<AlertState>(row?.value);
}

export async function saveAlertState(state: AlertState): Promise<void> {
  const value = JSON.stringify(state);
  await prisma.meta.upsert({ where: { key: HEALTH_STATE_KEY }, create: { key: HEALTH_STATE_KEY, value }, update: { value } });
}

/** Open items per queue, live (five counts): the number on the admin bar and home. */
export async function liveInboxCounts(): Promise<InboxCounts> {
  const [c, support] = await Promise.all([newCounts(), prisma.supportTicket.count({ where: { status: "OPEN" } })]);
  return { ...c, support };
}

export interface AdminBadges {
  inbox: number | null;
  health: Status | null;
  problems: number;
}

/** The two things the admin bar shows on every page: unread inbox, and the watchdog's verdict. */
export async function adminBadges(): Promise<AdminBadges> {
  const [inbox, report] = await Promise.all([liveInboxCounts().then(inboxTotal).catch(() => null), loadStoredReport().catch(() => null)]);
  const stale = report ? Date.now() - Date.parse(report.at) > REPORT_STALE_H * 3_600_000 : false;
  return {
    inbox,
    health: report ? (stale && report.overall !== "fail" ? "warn" : report.overall) : null,
    problems: report ? report.checks.filter((c) => c.status === "warn" || c.status === "fail").length + (stale ? 1 : 0) : 0,
  };
}
