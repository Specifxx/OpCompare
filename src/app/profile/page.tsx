import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/PricingCards";
import { WelcomeChecklist } from "@/components/WelcomeChecklist";
import { touchActivity } from "@/lib/activity";
import { tierOf } from "@/lib/premium";
import { TIER_NAMES } from "@/lib/plans";
import { watchedCardIds } from "@/lib/watchlist-server";
import { GIVEAWAY, giveawayState } from "@/lib/giveaway";

// RiftCompare's /profile, ported in wave 2 (2026-10-03): who you are, sign
// out, the setup checklist, your collection and Account & security (the referral link card was removed with the reward, 2026-10-04). Membership and billing live on
// /premium's member view; the old /account redirects here.
export const metadata: Metadata = { title: "Your profile", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");
  touchActivity(user);

  // OAuth only (Google, Discord): both ids are already on the session row.
  const tier = tierOf(user);
  const watching = await watchedCardIds(user.id).then((r) => r.length).catch(() => null);
  const giveawayOpen = giveawayState() === "open";
  // The four doors (owner, 2026-11-22: "nice profile pages"): each tile is one thing the account holds, linked to its page.
  const tiles = [
    { href: "/dashboard", label: "Dashboard", value: "Today", sub: "Alerts, tools and your watchlist" },
    { href: "/watching", label: "Watching", value: watching == null ? "–" : String(watching), sub: watching ? "cards with your start price" : "Tap ♥ on any card" },
    { href: "/portfolio", label: "Binder", value: "Collection", sub: "What you own, valued daily" },
    giveawayOpen
      ? { href: "/giveaway", label: "Giveaway", value: "Enter free", sub: `${GIVEAWAY.prizeShort} · closes 14 Dec` }
      : { href: "/premium", label: "Membership", value: tier ? TIER_NAMES[tier] : "Free", sub: tier ? "Billing and perks" : "See what Premium adds" },
  ];
  const methods = [
    { label: "Google", on: !!user.googleId },
    { label: "Discord", on: !!user.discordId },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card-surface overflow-hidden p-0">
        <div aria-hidden className="profile-band h-20 sm:h-24" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-10 flex items-end gap-4">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="Your profile photo" className="h-20 w-20 rounded-2xl object-cover ring-4 ring-ink-900" referrerPolicy="no-referrer" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-500 text-3xl font-black text-white ring-4 ring-ink-900">{user.displayName.slice(0, 1).toUpperCase()}</div>
            )}
            <div className="min-w-0 pb-1">
              <h1 className="truncate font-display text-2xl font-extrabold text-white">{user.displayName}</h1>
              <p className="truncate text-sm text-slate-400">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`chip ${tier ? "bg-brand-500/15 text-brand-400" : "bg-ink-800 text-slate-300"}`}>{tier ? `★ ${TIER_NAMES[tier]}` : "Free account"}</span>
            <SignOutButton className="btn-ghost" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card-surface group flex min-h-[7.5rem] flex-col p-4 transition hover:border-brand-500/60">
            <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t.label}
              <span aria-hidden className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white">→</span>
            </span>
            <span className="mt-2 font-display text-xl font-extrabold text-white">{t.value}</span>
            <span className="mt-auto pt-1 text-xs text-slate-400">{t.sub}</span>
          </Link>
        ))}
      </div>

      <WelcomeChecklist />

      {/* #collection — the collection-alerts track's MyCollection renders here
          once it lands (wave2-plan, Track 2 item 17). */}
      <div id="collection" />

      <div className="card-surface mt-5 p-5">
        <h2 className="font-bold text-white">Account &amp; security</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 pb-3 text-sm">
          <span className="text-slate-400">Email</span>
          {/* OAuth accounts are verified at sign-in: upsertOAuthUser refuses an unverified address. */}
          <span className="chip bg-brand-500/15 text-brand-400">✓ Verified</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-400">Sign-in methods</span>
          <span className="flex gap-1.5">
            {methods.map((m) => (
              <span key={m.label} className={`chip ${m.on ? "bg-ink-800 text-slate-200" : "bg-ink-900 text-slate-600"}`}>
                {m.on ? "✓ " : ""}
                {m.label}
              </span>
            ))}
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Link more sign-in options any time from the{" "}
          <Link href="/login" className="text-brand-400 hover:underline">
            sign-in page
          </Link>
          .
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Membership and billing are on{" "}
          <Link href="/premium" className="text-brand-400 hover:underline">
            your membership page
          </Link>
          . Billing problem?{" "}
          <Link href="/contact?category=PAYMENT" className="text-brand-400 hover:underline">
            Contact us
          </Link>
          .
        </p>
        <p className="mt-2 text-xs text-slate-500">
          To delete your account, email us from the address above via the{" "}
          <Link href="/contact" className="text-brand-400 hover:underline">
            contact page
          </Link>
          ; cancel any subscription first.
        </p>
      </div>
    </div>
  );
}
