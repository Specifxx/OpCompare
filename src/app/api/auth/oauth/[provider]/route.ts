import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { isOAuthProvider, isProviderEnabled, providerConfig, redirectUri } from "@/lib/oauth";
import { sanitizeNextPath } from "@/lib/next-param";

export const dynamic = "force-dynamic";

// Start the OAuth flow: a CSRF state cookie, the sanitised ?next= in its own
// short-lived cookie, then off to the provider.
export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const provider = params.provider;
  const next = sanitizeNextPath(new URL(req.url).searchParams.get("next"));
  if (!isOAuthProvider(provider) || !isProviderEnabled(provider)) {
    const dest = new URL("/login", req.url);
    dest.searchParams.set("error", "provider_unavailable");
    if (next) dest.searchParams.set("next", next);
    return NextResponse.redirect(dest);
  }
  const cfg = providerConfig(provider);
  const state = randomBytes(16).toString("hex");
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  cookies().set(`oauth_state_${provider}`, state, opts);
  if (next) cookies().set(`oauth_next_${provider}`, next, opts);
  const url = new URL(cfg.authUrl);
  url.searchParams.set("client_id", cfg.clientId!);
  url.searchParams.set("redirect_uri", redirectUri(provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", cfg.scope);
  url.searchParams.set("state", state);
  if (provider === "google") {
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
  }
  return NextResponse.redirect(url.toString());
}
