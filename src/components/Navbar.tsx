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
import { WatchDrawerButton } from "./WatchDrawer";

// Below sm the logo is the hat mark alone: with the market picker, watchlist,
// account and (from 400px) Pricing, the wordmark overflowed a 390px phone.
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
          <button type="button" className="tap-icon shrink-0 rounded-md text-slate-200 hover:bg-ink-800 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu">
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="OP Compare home">
            <HatMark size={30} />
            <Wordmark className="hidden text-base sm:inline" />
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
                className={`whitespace-nowrap rounded-md px-2 py-2 text-[15px] font-medium hover:text-white 2xl:px-3 ${pathname?.startsWith(l.href) ? "text-white" : "text-slate-300"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <HeaderPricing />
            <ThemeToggle />
            <CountrySelect />
            <WatchDrawerButton />
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
    <PricingLink surface="nav:header" memberHint className="hidden min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-1 text-[13px] font-semibold text-slate-200 hover:text-white min-[400px]:inline-flex sm:px-2.5 sm:text-[15px]">
      Pricing
    </PricingLink>
  );
}
