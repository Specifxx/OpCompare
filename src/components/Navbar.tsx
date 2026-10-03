"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/use-me";
import { CardSearch } from "./CardSearch";
import { CountrySelect } from "./CountrySelect";
import { Icon } from "./Icon";
import { HatMark, Wordmark } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NavUser } from "./NavUser";
import { PRIMARY_NAV } from "./nav-groups";
import { PricingLink } from "./PlanButton";
import { ThemeToggle } from "./ThemeToggle";

// The top bar (RiftCompare's Navbar): "Database", the card search, the primary
// links, theme, market and watchlist. It pads against --sidenav-w so it never
// sits under the desktop rail.
export function Navbar() {
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <>
      <header
        className={`sticky top-0 z-header border-b bg-ink-950/90 backdrop-blur transition-shadow ${scrolled ? "border-ink-800 shadow-header" : "border-transparent"}`}
        style={{ paddingLeft: "var(--sidenav-w)" }}
      >
        <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <button type="button" className="tap-icon rounded-md text-slate-200 hover:bg-ink-800 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu">
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="OP Compare home">
            <HatMark size={30} />
            <Wordmark className="hidden text-base min-[380px]:inline" />
          </Link>
          <Link href="/browse" className="hidden px-2 text-[15px] font-semibold text-white hover:text-brand-400 lg:block">
            Database
          </Link>
          <div className="hidden max-w-md flex-1 md:block">
            <CardSearch />
          </div>
          <nav className="ml-1 hidden items-center gap-1 xl:flex" aria-label="Primary">
            {PRIMARY_NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-2 text-[15px] font-medium hover:text-white ${pathname?.startsWith(l.href) ? "text-white" : "text-slate-300"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <HeaderPricing />
            <ThemeToggle />
            <CountrySelect />
            <Link href="/watchlist" className="tap-icon rounded-md text-slate-200 hover:bg-ink-800 hover:text-brand-400" aria-label="My watchlist">
              <Icon name="heart" className="h-[18px] w-[18px]" />
            </Link>
            <NavUser />
          </div>
        </div>
        <div className="px-3 pb-3 md:hidden">
          <CardSearch />
        </div>
      </header>
      {menu ? <MobileMenu onClose={() => setMenu(false)} /> : null}
    </>
  );
}

// "Pricing" in the bar itself at every width from 400px (the owner's "pricing at
// the very top"; RiftCompare's Navbar). Not for Plus/Premium members: the
// oc_adfree hint hides it at first paint for a returning member, and useMe()
// removes it once /api/me answers. Below 400px the bar has no room; the phone
// menu and the avatar menu carry it there.
function HeaderPricing() {
  const { me } = useMe();
  if (me.tier) return null;
  return (
    <PricingLink surface="nav:header" memberHint className="hidden items-center gap-1.5 rounded-md px-1.5 py-2 text-sm font-semibold text-slate-200 hover:text-white min-[400px]:inline-flex sm:px-2.5 sm:text-[15px]">
      <Icon name="crown" className="hidden h-4 w-4 text-straw sm:block" />
      Pricing
    </PricingLink>
  );
}
