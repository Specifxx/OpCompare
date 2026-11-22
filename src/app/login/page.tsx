import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { contextLineFor } from "@/lib/login-context";
import { POST_SIGN_IN_FALLBACK, sanitizeNextPath } from "@/lib/next-param";
import { enabledProviders } from "@/lib/oauth";
import { pageOg } from "@/lib/og/meta";
import { LoginSlides } from "@/components/account/LoginSlides";

// RiftCompare's /login: AuthForm with a "← Back" to where the visitor came
// from and, when that was a gated page, one line saying what signing in opens.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to OP Compare with Google, Discord or an emailed sign-in link.",
  alternates: { canonical: "/login" },
  openGraph: pageOg("/login"),
  robots: { index: false, follow: true },
};

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; src?: string } }) {
  const next = sanitizeNextPath(searchParams.next);
  if (await getCurrentUser()) redirect(next ?? POST_SIGN_IN_FALLBACK);
  // The sign-in slides beside the buttons (owner, 2026-11-22): on phones they sit under the form, so the buttons stay first.
  return (
    <div className="mx-auto grid max-w-5xl items-start gap-4 lg:grid-cols-[1fr_minmax(0,24rem)] lg:gap-8">
      <div className="order-1 lg:order-2">
        <AuthForm providers={enabledProviders()} cancelHref={next ?? "/"} next={next ?? undefined} source={searchParams.src} contextLine={next ? contextLineFor(next) : undefined} />
      </div>
      <LoginSlides className="order-2 lg:order-1 lg:sticky lg:top-24 lg:mt-10 lg:min-h-[26rem]" />
    </div>
  );
}
