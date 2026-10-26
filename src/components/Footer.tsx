import Link from "next/link";
import { CONTACT_EMAIL, DISCORD_URL, SISTER_SITES, SITE_NAME } from "@/lib/site";
import { FooterNav } from "./FooterNav";
import { ShareRow } from "./ShareRow";

// The site footer — RiftCompare's footer markup (inline in its layout.tsx),
// moved into one component. The rail reservation sits on the <footer> itself
// and the inner box is a plain content container, so footer content lines up
// with <main> at every width and border-t still spans under the fixed rail.
//
// Order: the newsletter slot (collection-alerts' NewsletterSignup, rendered
// only while getEmailStatus() is "on" — never an email field while nothing
// sends), the site map, the share band, the always-visible link row, the
// sister-sites line ("Part of the Compare Empire family"), the site line, the affiliate disclosure, the trademark
// notice and the copyright. No "·" separators: items are spaced by the row's
// own gap, so nothing dangles at a line end on a phone.
export function Footer({ newsletter = null }: { newsletter?: React.ReactNode }) {
  return (
    <footer className="border-t border-ink-800 py-8 pl-[var(--sidenav-w)] text-center text-xs text-slate-500">
      <div className="container-app">
        {newsletter}
        <FooterNav />
        <div className="mb-5 flex flex-col items-center gap-2 border-y border-ink-800/70 py-4">
          <span className="text-xs text-slate-400">Find OP Compare useful? Send it to someone who plays One Piece.</span>
          <ShareRow source="footer" size="sm" className="justify-center" />
        </div>
        <div className="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm sm:gap-x-6">
          <Link href="/" className="tap-link text-slate-300 hover:text-brand-400">Home</Link>
          <Link href="/blog" className="tap-link text-slate-300 hover:text-brand-400">Blog</Link>
          <Link href="/guides" className="tap-link text-slate-300 hover:text-brand-400">Guides</Link>
          <Link href="/tools" className="tap-link text-slate-300 hover:text-brand-400">Tools</Link>
          <Link href="/about" className="tap-link text-slate-300 hover:text-brand-400">About us</Link>
          <Link href="/editorial-policy" className="tap-link text-slate-300 hover:text-brand-400">Editorial policy</Link>
          <Link href="/methodology" className="tap-link text-slate-300 hover:text-brand-400">Methodology</Link>
          <Link href="/authors" className="tap-link text-slate-300 hover:text-brand-400">Who writes this</Link>
          <Link href="/contact" className="tap-link text-slate-300 hover:text-brand-400">Contact &amp; feedback</Link>
          <Link href="/privacy" className="tap-link text-slate-300 hover:text-brand-400">Privacy policy</Link>
          <Link href="/terms" className="tap-link text-slate-300 hover:text-brand-400">Terms of service</Link>
          {DISCORD_URL ? (
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="tap-link text-slate-300 hover:text-[#5865F2]">
              Discord
            </a>
          ) : null}
          <a href={`mailto:${CONTACT_EMAIL}`} className="tap-link text-gold hover:underline">{CONTACT_EMAIL}</a>
        </div>
        {/* Cross-promotion: the owner's sister sites, one per game. Our own sites,
            so plain followed links (no nofollow/sponsored), in a new tab. */}
        <p className="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>Part of the Compare Empire family, comparing prices the same way:</span>
          {SISTER_SITES.map((s) => (
            <span key={s.key}>
              <a href={s.url} target="_blank" rel="noopener" className="tap-link font-semibold text-brand-400 hover:underline">
                {s.name}
              </a>{" "}
              for {s.compares}
            </span>
          ))}
        </p>
        <p>
          {SITE_NAME} · One Piece Card Game database &amp; price comparison for the US, Australia, the UK, Singapore, Canada and
          the EU. Prices are sourced from public store listings and may be out of date — always confirm on the retailer&apos;s site.
        </p>
        <p className="mt-2">
          Affiliate links: as an eBay Partner Network affiliate and a TCGplayer affiliate, {SITE_NAME} earns from qualifying
          purchases — at no extra cost to you.
        </p>
        <p className="mt-2">
          {SITE_NAME} is an independent fan-made price comparison site. It is not affiliated with, endorsed or sponsored by
          Bandai, Eiichiro Oda, Shueisha or Toei Animation. ONE PIECE and the One Piece Card Game are trademarks of their
          respective owners.
        </p>
        <p className="mt-2">&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
      </div>
    </footer>
  );
}
