import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ManageSubscriptionButton,
  SignOutButton,
} from "@/components/PricingCards";
import { Breadcrumbs } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { TIER_NAMES } from "@/lib/plans";
import { tierOf } from "@/lib/premium";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

export default async function Account({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const tier = tierOf(user);
  const lapsed = !tier && user.premiumUntil != null;
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ label: "Your account" }]} />
      {searchParams.welcome ? (
        <p className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          Welcome aboard, {user.displayName}! Your free account is ready.
        </p>
      ) : null}
      <h1 className="text-3xl text-white">Your account</h1>
      <div className="mt-6 rounded-xl border border-ink-700 bg-ink-900 p-5">
        <p className="text-lg font-bold text-white">{user.displayName}</p>
        <p className="text-sm text-slate-400">{user.email}</p>
        <p className="mt-1 text-xs text-slate-500">
          Signed in with{" "}
          {[user.googleId ? "Google" : null, user.discordId ? "Discord" : null]
            .filter(Boolean)
            .join(" and ") || "OAuth"}{" "}
          · member since {fmt(user.createdAt)}
        </p>
      </div>
      <div className="mt-4 rounded-xl border border-ink-700 bg-ink-900 p-5">
        <h2 className="text-lg font-bold text-white">Your plan</h2>
        {tier ? (
          <>
            <p className="mt-1 text-slate-200">
              <span className="font-semibold text-gold">
                {TIER_NAMES[tier]}
              </span>
              {user.isAdmin
                ? " (owner account)"
                : user.premiumUntil
                  ? user.stripeCustomerId
                    ? `, paid through ${fmt(user.premiumUntil)}. It renews automatically unless you cancel.`
                    : `, until ${fmt(user.premiumUntil)}.`
                  : null}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {user.stripeCustomerId ? (
                <ManageSubscriptionButton label="Manage, switch plan or cancel" />
              ) : null}
              {tier === "plus" ? (
                <Link
                  href="/premium"
                  className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
                >
                  See Premium
                </Link>
              ) : (
                <Link
                  href="/tools/best-basket"
                  className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
                >
                  Open Best Basket
                </Link>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-slate-300">
              {lapsed
                ? `Your membership ended on ${fmt(user.premiumUntil!)}.`
                : "Free account."}{" "}
              Free accounts see the top {3} Deal Finder deals. Plus shows every
              deal with no ads; Premium adds Best Basket&apos;s store-by-store plan.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/premium"
                className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
              >
                See Plus and Premium
              </Link>
              {user.stripeCustomerId ? (
                <ManageSubscriptionButton label="Billing history" />
              ) : null}
            </div>
          </>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/tools/deal-finder"
          className="rounded-lg border border-ink-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-ink-800"
        >
          Deal Finder
        </Link>
        <Link
          href="/watchlist"
          className="rounded-lg border border-ink-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-ink-800"
        >
          Watchlist
        </Link>
        {user.isAdmin ? (
          <Link
            href="/admin"
            className="rounded-lg border border-ink-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-ink-800"
          >
            Admin
          </Link>
        ) : null}
        <SignOutButton />
      </div>
      <p className="mt-6 text-sm text-slate-400">
        Billing problem?{" "}
        <Link
          href="/contact?category=PAYMENT"
          className="underline hover:text-slate-200"
        >
          Contact us
        </Link>
        .
      </p>
      <p className="mt-2 text-xs text-slate-500">
        To delete your account, email us from the address above via the{" "}
        <Link href="/contact" className="underline">
          contact page
        </Link>
        ; cancel any subscription first.
      </p>
    </div>
  );
}
