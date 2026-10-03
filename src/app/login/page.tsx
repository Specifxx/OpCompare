import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthButtons } from "@/components/AuthButtons";
import { HatMark } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";
import { POST_SIGN_IN_FALLBACK, sanitizeNextPath } from "@/lib/next-param";
import { enabledProviders } from "@/lib/oauth";
import { pageOg } from "@/lib/og/meta";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to OP Compare with Google or Discord.",
  alternates: { canonical: "/login" },
  openGraph: pageOg("/login"),
  robots: { index: false, follow: true },
};

export default async function Login({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; src?: string };
}) {
  const next = sanitizeNextPath(searchParams.next);
  if (await getCurrentUser()) redirect(next ?? POST_SIGN_IN_FALLBACK);
  const toCheckout = next?.startsWith("/premium");
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <HatMark size={48} />
          <h1 className="mt-3 text-3xl text-white">
            {toCheckout ? "One step before checkout" : "Log in to OP Compare"}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {toCheckout
              ? "Sign in so your plan is tied to your account. New here? This creates your free account."
              : "New here? Signing in creates your free account. It unlocks the top Deal Finder deals and Plus or Premium when you want them."}
          </p>
        </div>
        <AuthButtons
          providers={enabledProviders()}
          next={next}
          error={searchParams.error ?? null}
          source={searchParams.src ?? null}
        />
      </div>
    </div>
  );
}
