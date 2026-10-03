"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { COUNTRIES } from "@/lib/country";
import { BrandLockup } from "./Logo";
import { Icon } from "./Icon";
import { NAV_GROUPS, searchNav } from "./nav-groups";
import { useCountry } from "./CountryProvider";

// The persistent desktop navigation rail (RiftCompare's SideNav): the full left
// edge from `lg` up, carrying the brand, one search box and every link in
// NAV_GROUPS. Fixed, not a layout participant — everything that makes room for
// it reads --sidenav-w from globals.css. A group header is a disclosure, never
// a link; the leaves are the links.
const STORAGE_KEY = "op:sidenav:collapsed";
const DEFAULT_OPEN = ["Prices", "The Card Database"];
const DEFAULT_COLLAPSED = NAV_GROUPS.map((g) => g.title).filter((t) => !DEFAULT_OPEN.includes(t));

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/cards") return pathname === "/cards";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const pathname = usePathname();
  const { country } = useCountry();
  const [collapsed, setCollapsed] = useState<string[]>(DEFAULT_COLLAPSED);
  const [q, setQ] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCollapsed(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = (t: string) => {
    setCollapsed((c) => {
      const next = c.includes(t) ? c.filter((x) => x !== t) : [...c, t];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const results = useMemo(() => searchNav(q), [q]);

  return (
    <aside className="fixed inset-y-0 left-0 z-rail hidden w-[var(--sidenav-w)] flex-col border-r border-ink-800 bg-ink-950 lg:flex" aria-label="Site navigation">
      <div className="border-b border-ink-800 px-4 py-3">
        <Link href="/" className="block" aria-label="OP Compare home">
          <BrandLockup size={34} sub={COUNTRIES[country].label} />
        </Link>
      </div>
      <div className="border-b border-ink-800 p-3">
        <label className="relative block">
          <span className="sr-only">Search features</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search features" className="input min-h-10 pl-9" />
        </label>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {q ? (
          <ul className="space-y-0.5">
            {results.length ? (
              results.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block rounded-md px-3 py-2 text-[15px] text-slate-200 hover:bg-ink-800">
                    {l.label}
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-slate-500">No page matches “{q}”.</li>
            )}
          </ul>
        ) : (
          NAV_GROUPS.map((g) => {
            const open = !collapsed.includes(g.title);
            return (
              <div key={g.title} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggle(g.title)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-200"
                >
                  <Icon name={g.icon} className="h-4 w-4" />
                  <span className="flex-1 text-left">{g.title}</span>
                  <Icon name="chevron" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open ? (
                  <ul className="mb-2 space-y-0.5">
                    {g.links.map((l) => {
                      const active = isActive(pathname, l.href);
                      return (
                        <li key={l.href}>
                          <Link
                            href={l.href}
                            aria-current={active ? "page" : undefined}
                            className={`block rounded-md border-l-2 px-3 py-[7px] text-[15px] transition-colors ${
                              active ? "border-brand-500 bg-brand-500/10 font-semibold text-white" : "border-transparent text-slate-300 hover:bg-ink-800 hover:text-white"
                            }`}
                          >
                            {l.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })
        )}
      </nav>
      <div className="border-t border-ink-800 p-3">
        <Link href="/watchlist" className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[15px] font-medium text-slate-200 hover:bg-ink-800">
          <Icon name="heart" className="h-4 w-4 text-brand-400" />
          My Watchlist
        </Link>
      </div>
    </aside>
  );
}
