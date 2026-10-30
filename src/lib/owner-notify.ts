// EMAILS TO THE OWNER AND THE SITE INBOX (script-side only; nothing under src/app may import this,
// tests/no-email-api.test.ts): every new inbox item, and the watchdog's
// alerts. The address is bill.jyang101@gmail.com (owner, 2026-10-14), or
// OWNER_EMAIL when set.
//
// Inbox: the hourly outbox (scripts/email-hourly.ts) calls notifyOwnerInbox().
// It reads everything created since a cursor (Meta "inbox-notified-at"), sends
// ONE email listing it, and moves the cursor only after the provider accepted
// the message: a failed send leaves the cursor, so the next hour retries and
// nothing is lost or sent twice. The first run only sets the cursor (it does
// not email the whole backlog; the admin bar already counts what is waiting).
//
// These emails carry visitor text, which is fine in the owner's own mailbox.
// They are NEVER copied anywhere public (not an issue, not a log line).
//
// Since 2026-10-30 the inbox email goes to the site's own mailbox, the address
// /contact shows (CONTACT_EMAIL, opcompareofficial@gmail.com; INBOX_EMAIL
// overrides it), not the owner's personal one: "any feedback feeds into the
// respective emails" (owner). Watchdog alerts stay with ownerEmail(). Written
// feedback is included; a bare star rating is not.
import { sendEmail, escapeHtml } from "./email";
import { CONTACT_EMAIL } from "./site";

export const DEFAULT_OWNER_EMAIL = "bill.jyang101@gmail.com";
export const ownerEmail = (env: Record<string, string | undefined> = process.env) => env.OWNER_EMAIL?.trim() || DEFAULT_OWNER_EMAIL;
export const INBOX_CURSOR_KEY = "inbox-notified-at";
const PER_QUEUE = 25;

export const sendOwnerEmail = (subject: string, html: string, text: string) => sendEmail(ownerEmail(), subject, html, { text });

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export const inboxEmail = (env: Record<string, string | undefined> = process.env) => {
  const v = env.INBOX_EMAIL?.trim() ?? "";
  return EMAIL_RE.test(v) ? v : CONTACT_EMAIL;
};
/** The visitor messages' email: to the site inbox, Reply-To the visitor when the email is about one person. */
export const sendInboxEmail = (subject: string, html: string, text: string, replyTo?: string) =>
  sendEmail(inboxEmail(), subject, html, { text, ...(replyTo ? { headers: { "Reply-To": replyTo } } : {}) });
/** Feedback shorter than this is a rating with a word or two: it waits in /admin/inbox. */
export const FEEDBACK_MIN_EMAIL = 10;

export type InboxKind = "message" | "feedback" | "price report" | "store suggestion" | "support ticket";
export interface InboxItem {
  kind: InboxKind;
  at: Date;
  title: string;
  lines: string[];
  /** The sender's address, when they gave one (Reply-To on a one-item email). */
  replyTo?: string;
}
export interface InboxBatch {
  items: InboxItem[];
  /** A queue had more than PER_QUEUE new items: the rest are in /admin/inbox. */
  truncated: boolean;
  /** When truncated: the cursor may only advance to here (the earliest point a cut-off queue was read up to). */
  advanceTo: Date | null;
}

/** The slice of Prisma this needs, so a test can pass a fake. */
export interface InboxDb {
  meta: {
    findUnique(a: { where: { key: string } }): Promise<{ value: string } | null>;
    upsert(a: { where: { key: string }; create: { key: string; value: string }; update: { value: string } }): Promise<unknown>;
  };
  contactMessage: { findMany(a: Record<string, unknown>): Promise<{ name: string; email: string; subject: string | null; category: string; message: string; createdAt: Date }[]> };
  feedback: { findMany(a: Record<string, unknown>): Promise<{ rating: number | null; message: string; email: string | null; page: string | null; createdAt: Date }[]> };
  priceReport: { findMany(a: Record<string, unknown>): Promise<{ storeName: string; issue: string; claimedCents: number | null; shownPriceCents: number | null; currency: string | null; note: string | null; listingTitle: string | null; kind: string; createdAt: Date }[]> };
  storeSuggestion: { findMany(a: Record<string, unknown>): Promise<{ storeName: string; storeUrl: string; country: string; note: string | null; createdAt: Date }[]> };
  supportTicket: { findMany(a: Record<string, unknown>): Promise<{ number: number; name: string; email: string; category: string; subject: string; message: string; createdAt: Date }[]> };
}

const clip = (s: string, n = 1500) => (s.length > n ? `${s.slice(0, n)}…` : s);
const money = (c: number | null, cur: string | null) => (c == null ? "?" : `${(c / 100).toFixed(2)}${cur ? ` ${cur}` : ""}`);

export async function loadNewInbox(db: InboxDb, since: Date, until: Date): Promise<InboxBatch> {
  const where = { createdAt: { gt: since, lte: until } };
  const q = { where, orderBy: { createdAt: "asc" }, take: PER_QUEUE };
  // Written feedback is emailed to the site inbox (owner, 2026-10-30); bare ratings
  // are not (owner, 2026-10-27: "stop sending me emails for every single feedback …
  // and every single rating"). Feedback never counts toward the watchdog's inbox alert.
  const [contact, rawFeedback, reports, suggestions, tickets] = await Promise.all([
    db.contactMessage.findMany(q),
    db.feedback.findMany({ ...q, where: { ...where, message: { not: "" } } }),
    db.priceReport.findMany(q),
    db.storeSuggestion.findMany(q),
    db.supportTicket.findMany(q),
  ]);
  const feedback = rawFeedback.filter((f) => f.message.trim().length >= FEEDBACK_MIN_EMAIL);
  const reply = (e: string | null | undefined) => (e && EMAIL_RE.test(e.trim()) ? e.trim() : undefined);
  const items: InboxItem[] = [
    ...contact.map((m): InboxItem => ({ kind: "message", at: m.createdAt, title: `${m.name} <${m.email}>${m.subject ? `: ${m.subject}` : ""}`, lines: [`Category: ${m.category}`, clip(m.message)], replyTo: reply(m.email) })),
    ...feedback.map((f): InboxItem => ({ kind: "feedback", at: f.createdAt, title: `${f.rating ? `${f.rating}/5 ` : ""}${f.email ? `from ${f.email}` : "anonymous"}${f.page ? ` on ${f.page}` : ""}`, lines: [clip(f.message)], replyTo: reply(f.email) })),
    ...reports.map((r): InboxItem => ({ kind: "price report", at: r.createdAt, title: `${r.storeName}: ${r.issue}`, lines: [`${r.kind}${r.listingTitle ? `: ${r.listingTitle}` : ""}`, `We showed ${money(r.shownPriceCents, r.currency)}${r.claimedCents != null ? `; they say ${money(r.claimedCents, r.currency)}` : ""}`, ...(r.note ? [clip(r.note, 600)] : [])] })),
    ...suggestions.map((s): InboxItem => ({ kind: "store suggestion", at: s.createdAt, title: `${s.storeName} (${s.country})`, lines: [s.storeUrl, ...(s.note ? [clip(s.note, 600)] : [])] })),
    ...tickets.map((t): InboxItem => ({ kind: "support ticket", at: t.createdAt, title: `OC-${t.number} ${t.subject} from ${t.name} <${t.email}>`, lines: [`Category: ${t.category}`, clip(t.message)], replyTo: reply(t.email) })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  const cut = [contact, rawFeedback, reports, suggestions, tickets].filter((l) => l.length >= PER_QUEUE).map((l) => l[l.length - 1].createdAt.getTime());
  const advanceTo = cut.length ? new Date(Math.min(...cut)) : null;
  // Items past the cut-off point wait for the next email, so none is sent twice.
  return { items: advanceTo ? items.filter((i) => i.at.getTime() <= advanceTo.getTime()) : items, truncated: cut.length > 0, advanceTo };
}

export function renderInboxEmail(batch: InboxBatch, siteUrl: string): { subject: string; html: string; text: string } {
  const n = batch.items.length;
  const kinds = new Map<InboxKind, number>();
  for (const i of batch.items) kinds.set(i.kind, (kinds.get(i.kind) ?? 0) + 1);
  const subject = n === 1 ? `OP Compare inbox: new ${batch.items[0].kind}: ${batch.items[0].title}`.slice(0, 150) : `OP Compare inbox: ${n} new items (${[...kinds].map(([k, c]) => `${c} ${k}${c === 1 ? "" : "s"}`).join(", ")})`;
  const link = `${siteUrl.replace(/\/+$/, "")}/admin/inbox`;
  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">` +
    batch.items.map((i) => `<div style="margin:0 0 18px;padding:0 0 12px;border-bottom:1px solid #ddd"><b>${escapeHtml(i.kind)}</b> · ${escapeHtml(i.at.toISOString().slice(0, 16).replace("T", " "))} UTC<br><b>${escapeHtml(i.title)}</b>${i.lines.map((l) => `<div style="white-space:pre-wrap">${escapeHtml(l)}</div>`).join("")}</div>`).join("") +
    (batch.truncated ? `<p>More than ${PER_QUEUE} arrived in one queue; the rest are in the inbox.</p>` : "") +
    `<p><a href="${escapeHtml(link)}">Open the inbox</a></p></div>`;
  const text = `${batch.items.map((i) => `[${i.kind}] ${i.at.toISOString().slice(0, 16).replace("T", " ")} UTC\n${i.title}\n${i.lines.join("\n")}`).join("\n\n")}\n\n${batch.truncated ? `More than ${PER_QUEUE} arrived in one queue; the rest are in the inbox.\n` : ""}${link}`;
  return { subject, html, text };
}

/** One hourly pass. Returns how many items it emailed. */
export async function notifyOwnerInbox(opts: { db: InboxDb; send?: (subject: string, html: string, text: string, replyTo?: string) => Promise<boolean>; now?: Date; siteUrl?: string }): Promise<{ sent: number; first?: true; failed?: true }> {
  const { db } = opts;
  const now = opts.now ?? new Date();
  const send = opts.send ?? sendInboxEmail;
  const row = await db.meta.findUnique({ where: { key: INBOX_CURSOR_KEY } });
  const setCursor = (at: Date) => db.meta.upsert({ where: { key: INBOX_CURSOR_KEY }, create: { key: INBOX_CURSOR_KEY, value: at.toISOString() }, update: { value: at.toISOString() } });
  const since = row ? new Date(row.value) : null;
  if (!since || Number.isNaN(since.getTime())) {
    await setCursor(now);
    return { sent: 0, first: true };
  }
  const batch = await loadNewInbox(db, since, now);
  if (!batch.items.length) {
    await setCursor(now);
    return { sent: 0 };
  }
  const mail = renderInboxEmail(batch, opts.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://opcompare.app");
  const replyTo = batch.items.length === 1 ? batch.items[0].replyTo : undefined;
  if (!(await send(mail.subject, mail.html, mail.text, replyTo))) return { sent: 0, failed: true };
  // A cut-off queue: advance only as far as it was read, so the rest go in the next email.
  await setCursor(batch.advanceTo ?? now);
  return { sent: batch.items.length };
}
