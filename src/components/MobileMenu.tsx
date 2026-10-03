"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useMe } from "@/lib/use-me";
import { Icon } from "./Icon";
import { PricingLink } from "./PlanButton";
import { BrandLockup } from "./Logo";
import { NAV_GROUPS } from "./nav-groups";

export function MobileMenu({ onClose }: { onClose: () => void }) {
  const { me } = useMe();
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-menu lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close menu" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-ink-800 bg-ink-950 animate-fade-in">
        <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
          <Link href="/" onClick={onClose}>
            <BrandLockup size={30} />
          </Link>
          <button type="button" onClick={onClose} className="tap-icon rounded-md text-slate-300 hover:bg-ink-800" aria-label="Close menu">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {NAV_GROUPS.map((g) => (
            <div key={g.title} className="mb-4">
              <p className="mb-1 flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <Icon name={g.icon} className="h-3.5 w-3.5" />
                {g.title}
              </p>
              <ul>
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={onClose} className="block rounded-md px-3 py-2.5 text-[15px] text-slate-200 hover:bg-ink-800">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        {/* Pinned like the rail's foot: the one route to pricing below 400px,
            where the header bar has no room for it. Not for members. */}
        {!me.tier ? (
          <div className="border-t border-ink-800 p-3">
            <PricingLink surface="nav:menu" memberHint onClick={onClose} className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[15px] font-semibold text-slate-200 hover:bg-ink-800">
              <Icon name="crown" className="h-4 w-4 text-straw" />
              Pricing
            </PricingLink>
          </div>
        ) : null}
      </div>
    </div>
  );
}
