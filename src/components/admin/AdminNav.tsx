"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/health", label: "Health" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/store-health", label: "Store health" },
  { href: "/admin/inbox", label: "Inbox" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/premium", label: "Interest" },
  { href: "/admin/demand", label: "Demand" },
  { href: "/admin/rising", label: "Rising" },
  { href: "/admin/decks", label: "Decks" },
];

// The admin bar's links, with the current section highlighted.
export function AdminNav({ inbox = null, health = null, problems = 0 }: { inbox?: number | null; health?: "ok" | "warn" | "fail" | "unknown" | null; problems?: number }) {
  const path = usePathname() ?? "/admin";
  const cls = (active: boolean) => (active ? "text-sm font-semibold text-white" : "text-sm text-slate-300 hover:text-white");
  return (
    <nav aria-label="Admin" className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
      <Link href="/admin" className={`${cls(path === "/admin")} mr-2`}>
        Admin
      </Link>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={cls(path === l.href || path.startsWith(`${l.href}/`))}>
          {l.label}
          {l.href === "/admin/inbox" && inbox ? <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 py-0.5 text-[11px] font-bold text-white">{inbox}</span> : null}
          {l.href === "/admin/health" && problems ? <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white ${health === "fail" ? "bg-rose-600" : "bg-amber-500"}`}>{problems}</span> : null}
        </Link>
      ))}
      <Link href="/" className="ml-auto text-sm text-slate-400 hover:text-white">
        Back to site
      </Link>
    </nav>
  );
}
