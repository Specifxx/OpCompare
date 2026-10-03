import Link from "next/link";
import { CONTACT_EMAIL, SISTER_SITE, SITE_NAME } from "@/lib/site";
import { HatMark, Wordmark } from "./Logo";
import { NAV_GROUPS } from "./nav-groups";

export function Footer() {
  const year = new Date().getUTCFullYear();
  return (
    <footer className="mt-16 border-t border-ink-800 bg-ink-950" style={{ paddingLeft: "var(--sidenav-w)" }}>
      <div className="container-app py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <HatMark size={32} />
              <Wordmark className="text-lg" />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              One Piece Card Game prices compared across stores in six markets, updated twice a day.
            </p>
          </div>
          {NAV_GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{g.title}</p>
              <ul className="space-y-1.5">
                {g.links
                  .filter((l) => !l.hideInFooter)
                  .map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="tap-link text-sm text-slate-300 hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 space-y-2 border-t border-ink-800 pt-6 text-center text-xs leading-relaxed text-slate-500">
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/privacy" className="tap-link hover:text-slate-300">Privacy policy</Link>
            <Link href="/terms" className="tap-link hover:text-slate-300">Terms of service</Link>
            <Link href="/methodology" className="tap-link hover:text-slate-300">How we compare</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="tap-link text-straw hover:underline">{CONTACT_EMAIL}</a>
          </p>
          <p>
            Affiliate links: as an eBay Partner Network affiliate and a TCGplayer affiliate, {SITE_NAME} earns from qualifying purchases — at no extra cost to you.
          </p>
          <p>
            Playing {SISTER_SITE.game} too? Our sister site{" "}
            <a href={SISTER_SITE.url} className="font-semibold text-brand-400 hover:underline">{SISTER_SITE.name}</a> compares {SISTER_SITE.game} prices the same way.
          </p>
          <p>
            {SITE_NAME} is an independent fan-made price comparison site. It is not affiliated with, endorsed or sponsored by Bandai, Eiichiro Oda,
            Shueisha or Toei Animation. ONE PIECE and the One Piece Card Game are trademarks of their respective owners. Prices come from public store
            listings and may change — always confirm on the retailer&apos;s site.
          </p>
          <p>© {year} {SITE_NAME}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
