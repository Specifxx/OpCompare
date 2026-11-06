import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { accountForProvenEmail, verifySignInToken } from "@/lib/email-sign-in";
import { sanitizeNextPath, POST_SIGN_IN_FALLBACK } from "@/lib/next-param";
import { rateLimit, tooManyRequests, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Open an emailed sign-in link (lib/email-sign-in.ts). POST only, from the
// /login/email button, never a GET, so a mail scanner cannot use it up.
export async function POST(req: Request) {
  const limit = rateLimit(`email-link:consume:${clientIp(req)}`, 20, 60 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const failed = NextResponse.json({ error: "This sign-in link has expired or was already used. Ask for a new one below." }, { status: 400 });
  try {
    const email = await verifySignInToken(token);
    if (!email) return failed;
    const account = await accountForProvenEmail(email, body?.name);
    if (!account) return failed;
    await createSession(account.id);
    const next = sanitizeNextPath(typeof body?.next === "string" ? body.next : null) ?? POST_SIGN_IN_FALLBACK;
    return NextResponse.json({ ok: true, next: account.isNew ? `${next}${next.includes("?") ? "&" : "?"}welcome=email` : next });
  } catch (e) {
    console.error("[email-link] sign-in failed:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
