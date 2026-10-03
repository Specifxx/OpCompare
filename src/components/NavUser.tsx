"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TIER_NAMES } from "@/lib/plans";
import { invalidateMe, useMe } from "@/lib/use-me";
import { Icon } from "./Icon";

// The header's account corner (RiftCompare's NavUser + UserMenu): "Log in" when
// signed out, an avatar menu when signed in. Pricing is linked for non-members.
export function NavUser() {
  const { me, loaded } = useMe();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!loaded) return <span className="inline-block h-8 w-8" aria-hidden />;
  if (!me.user) {
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} rel="nofollow" className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-200 hover:bg-ink-800 hover:text-white">
        Log in
      </Link>
    );
  }
  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    invalidateMe();
    location.assign("/");
  };
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 rounded-full p-0.5 hover:bg-ink-800" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        {me.user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.user.avatar} alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{me.user.name.slice(0, 1).toUpperCase()}</span>
        )}
        {me.tier ? <Icon name="crown" className="mr-1 h-3.5 w-3.5 text-straw" /> : null}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-menu mt-2 w-56 rounded-lg border border-ink-700 bg-ink-900 p-1.5 shadow-xl">
          <p className="truncate px-3 py-2 text-xs text-slate-400">
            {me.user.email}
            {me.tier ? <span className="mt-0.5 block font-semibold text-straw">{TIER_NAMES[me.tier]} member</span> : null}
          </p>
          <Link role="menuitem" href="/account" className="block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-ink-800">
            Your account
          </Link>
          <Link role="menuitem" href="/watchlist" className="block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-ink-800">
            Watchlist
          </Link>
          {me.tier === "premium" ? (
            <Link role="menuitem" href="/tools/buy-list" className="block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-ink-800">
              Buy List Planner
            </Link>
          ) : (
            <Link role="menuitem" href="/premium" className="block rounded-md px-3 py-2 text-sm font-semibold text-straw hover:bg-ink-800">
              {me.tier ? "Upgrade to Premium" : "Pricing"}
            </Link>
          )}
          <button role="menuitem" type="button" onClick={signOut} className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-ink-800">
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
