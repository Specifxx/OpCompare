"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CardSearch } from "./CardSearch";
import { CountrySelect } from "./CountrySelect";
import { Icon } from "./Icon";
import { HatMark, Wordmark } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NavUser } from "./NavUser";
import { PRIMARY_NAV } from "./nav-groups";
import { ThemeToggle } from "./ThemeToggle";
import { WatchDrawerButton } from "./WatchDrawer";

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
