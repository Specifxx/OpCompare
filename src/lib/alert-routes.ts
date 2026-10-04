// The database half of the token-addressed alert routes (/api/alerts/action,
// /api/alerts/unsubscribe, /api/alerts/pause, /api/alerts/release/*) and their
// pages (/alerts/action, /alerts/manage, /unsubscribe, /alerts/release) —
// wave 2, 2026-10-03. Route and page files may not import @/lib/db
// (tests/app-no-db-import.test.ts), so they call these.
//
// Egress (CLAUDE.md, the accounts exception): every read is scoped by ONE
// unguessable token (an alert row's unsubToken, a release alert's unsubToken)
// or by the signed-in account's own address, select-limited and capped. Called
// only from those routes and pages, never from a cached loader or the layout.
import { prisma } from "./db";
import { isPremium } from "./premium";
import { isAdminEmail } from "./admin-emails";
import { performAlertAction, type AlertActionDb, type AlertActionResult } from "./alert-actions";
import { alertEmailSummary, applyAlertEmailMode, pauseAddress, resumeAddress, type AlertEmailMode, type AlertEmailResult, type AlertEmailSummary, type AlertMuteDb } from "./alert-mute";

const actionDb = prisma as unknown as AlertActionDb;
const muteDb = prisma as unknown as AlertMuteDb;

export function applyAlertActionToken(token: string | null | undefined): Promise<AlertActionResult> {
  return performAlertAction(actionDb, token);
}

export function alertEmailSummaryForToken(token: string): Promise<AlertEmailSummary> {
  return alertEmailSummary(muteDb, token);
}

export function applyAlertEmailModeForToken(token: string, mode: AlertEmailMode, opts: { alertId?: string; source?: string } = {}): Promise<AlertEmailResult> {
  return applyAlertEmailMode(muteDb, token, mode, opts);
}

/** The signed-in account's own "Pause alert emails" switch (the /watching twin of the footer link). */
export async function setAccountAlertPause(email: string, paused: boolean): Promise<void> {
  if (paused) await pauseAddress(muteDb, email, "watchlist");
  else await resumeAddress(muteDb, email);
}

// ── Release alerts ───────────────────────────────────────────────────────────

export interface ReleaseTokenSummary {
  active: boolean;
  sets: { setSlug: string; setName: string; scope: string }[];
}

/** What a release alert's token covers (every row of that address shares it). */
export async function releaseAlertsForToken(token: string): Promise<ReleaseTokenSummary> {
  if (!token || token.length > 200) return { active: false, sets: [] };
  const rows = await prisma.setReleaseAlert.findMany({ where: { unsubToken: token }, select: { setSlug: true, scope: true }, take: 100 });
  if (!rows.length) return { active: false, sets: [] };
  const sets = await prisma.set.findMany({ where: { slug: { in: [...new Set(rows.map((r) => r.setSlug))] } }, select: { slug: true, name: true } });
  const name = new Map(sets.map((s) => [s.slug, s.name]));
  return { active: true, sets: rows.map((r) => ({ setSlug: r.setSlug, setName: name.get(r.setSlug) ?? r.setSlug, scope: r.scope })) };
}

/** Stop every release alert on a token. Idempotent. */
export async function stopReleaseAlerts(token: string): Promise<number> {
  if (!token || token.length > 200) return 0;
  const res = await prisma.setReleaseAlert.deleteMany({ where: { unsubToken: token } });
  return res.count;
}

// ── The /alerts/action confirmation page's one read ─────────────────────────

export interface CardActionContext {
  market: string;
  targetCents: number | null;
  snoozedUntil: Date | null;
  entitled: boolean;
  card: { slug: string; name: string };
}

/** One primary-key read of the watch a signed token names (a card watch). */
export async function cardActionContext(id: string): Promise<CardActionContext | null> {
  const row = await prisma.priceAlert
    .findUnique({
      where: { id },
      select: {
        market: true,
        targetCents: true,
        snoozedUntil: true,
        user: { select: { email: true, isAdmin: true, premiumUntil: true, premiumTier: true } },
        card: { select: { slug: true, name: true, variant: true } },
      },
    })
    .catch(() => null);
  if (!row) return null;
  const entitled = !!row.user && isPremium({ ...row.user, isAdmin: row.user.isAdmin || isAdminEmail(row.user.email) });
  return {
    market: row.market,
    targetCents: row.targetCents,
    snoozedUntil: row.snoozedUntil,
    entitled,
    card: { slug: row.card.slug, name: `${row.card.name}${row.card.variant ? ` (${row.card.variant})` : ""}` },
  };
}

/** A deck or sealed watch's display name and snooze, for the same page. */
export async function watchActionContext(kind: "deck" | "sealed", id: string): Promise<{ name: string; snoozedUntil: Date | null } | null> {
  if (kind === "deck") return prisma.deckWatch.findUnique({ where: { id }, select: { name: true, snoozedUntil: true } }).catch(() => null);
  return prisma.sealedWatch
    .findUnique({ where: { id }, select: { snoozedUntil: true, sealed: { select: { name: true } } } })
    .then((r) => (r ? { name: r.sealed.name, snoozedUntil: r.snoozedUntil } : null))
    .catch(() => null);
}
