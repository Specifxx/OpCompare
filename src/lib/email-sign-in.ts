// SIGN IN WITH AN EMAILED LINK (2026-11-06, owner: carry RiftCompare's "code
// red" fix to every site with accounts). DECISIONS.md, "Email sign-in links".
//
// Google and Discord were the only ways in, so anyone whose address is on
// neither (an iCloud address above all) could not make an account. OP Compare
// holds no mail key, so the form (EmailSignInForm) posts to RiftCompare's
// /api/sister-sign-in, which mails the link under OP Compare's name. The
// token is an EdDSA JWT RiftCompare signs; we check it against RiftCompare's
// PUBLIC key (fetched from its JWKS, cached), for our own audience only, and
// refuse a token id (jti) seen before, so each link works once.
//
// Opening a link sent to an address proves that inbox, the same proof an
// OAuth provider gives when it says an address is verified, so the account
// for that address is signed into (or created) and stamped verified. A new
// account is never created for an admin address.
//
// Per-request and uncached, called only from /api/auth/email-link
// (CLAUDE.md's accounts exception). Never on a GET: /login/email's button
// POSTs, so a mail scanner fetching the link cannot use it up.
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "./db";
import { isAdminEmail } from "./admin-emails";
import { claimAlertsForUser } from "./alerts";

export const SIGN_IN_ISSUER = "https://riftcompare.com";
/** The audience RiftCompare stamps on OUR tokens (its SIGN_IN_SITES entry). */
export const SIGN_IN_AUDIENCE = "https://opcompare.app";

export { SIGN_IN_REQUEST_URL } from "./email-sign-in-url";
const JWKS_URL = new URL("https://riftcompare.com/api/sister-sign-in/jwks");

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function keys() {
  jwks ??= createRemoteJWKSet(JWKS_URL, { cacheMaxAge: 24 * 3600_000, cooldownDuration: 60_000 });
  return jwks;
}

export function normalizeSignInEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) return null;
  return email;
}

/** A display name typed on /login/email: trimmed, single-spaced, 2 to 24 characters, no markup. */
export function cleanDisplayName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/[<>\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 24).trim();
  return name.length >= 2 ? name : null;
}

/** The address a valid, unused token was issued for, or null. Marks the token used. */
export async function verifySignInToken(token: string): Promise<string | null> {
  if (!token || token.length > 4096) return null;
  let email: string | null;
  let jti: string;
  try {
    const { payload } = await jwtVerify(token, keys(), { issuer: SIGN_IN_ISSUER, audience: SIGN_IN_AUDIENCE, algorithms: ["EdDSA"] });
    email = normalizeSignInEmail(payload.email);
    jti = typeof payload.jti === "string" ? payload.jti : "";
  } catch {
    return null;
  }
  if (!email || !/^[0-9a-f-]{36}$/i.test(jti)) return null;
  // ONE USE: the Meta row's primary key makes a second create fail.
  try {
    await prisma.meta.create({ data: { key: `signin-jti:${jti}`, value: new Date().toISOString() } });
  } catch {
    return null;
  }
  return email;
}

/** Sign into (or create) the account for a proven address; null when it may not be created. */
export async function accountForProvenEmail(email: string, rawName: unknown): Promise<{ id: string; isNew: boolean } | null> {
  const name = cleanDisplayName(rawName);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true, displayName: true } });
  if (existing) {
    const placeholder = email.split("@")[0].slice(0, 24);
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        lastLoginAt: new Date(),
        emailVerified: existing.emailVerified ?? new Date(),
        ...(name && existing.displayName === placeholder ? { displayName: name } : {}),
      },
    });
    await claimAlertsForUser(existing.id, email);
    return { id: existing.id, isNew: false };
  }
  if (isAdminEmail(email)) return null;
  try {
    const created = await prisma.user.create({
      data: { email, displayName: name ?? email.split("@")[0].slice(0, 24), emailVerified: new Date(), lastLoginAt: new Date(), signupSource: "email_link" },
      select: { id: true },
    });
    await claimAlertsForUser(created.id, email);
    return { id: created.id, isNew: true };
  } catch (e) {
    const again = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (again) return { id: again.id, isNew: false };
    throw e;
  }
}
