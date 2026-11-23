import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { hubIntro } from "@/lib/content/hub-intros";

// Renders the editorial intro for a hub or tool page. Nothing if the route has
// no entry, so adding one is a single edit in lib/content/hub-intros.ts.
//
// Placed directly under the page's <h1> on purpose: this is the text that
// answers "what is this and is it what I wanted?" for a visitor arriving from
// search, and it is the text that stops an interactive tool from reading as an
// empty page to anything that judges pages by their content.
//
// A paragraph may carry internal links as `[label](/path)` — the guide that
// explains the tool, named in the sentence that needs it (2026-09-26). Only
// site-relative paths become links; anything else stays literal text, so an
// intro can never send a reader off-site or smuggle in an affiliate URL.
export function HubIntro({ path, className }: { path: string; className?: string }) {
  const paragraphs = hubIntro(path);
  if (!paragraphs.length) return null;
  const id = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
  // On a phone the intro is clamped to its first three lines with a "Read more" (2026-11-23: the page budget's rule 6, the
  // page's own content on the first screen; the intro ran to two screens before the first product on /sealed and /movers).
  // CSS only (globals.css .hub-intro): the whole text is in the HTML at every width, the toggle is a checkbox, no script.
  return (
    <div className="hub-intro">
      <input type="checkbox" id={`hub-intro-${id}`} className="hub-intro-toggle sr-only" aria-label="Show the whole introduction" />
      <div className={`hub-intro-body ${className ?? "mt-3 max-w-[65ch] space-y-3 text-[15px] leading-relaxed text-slate-300"}`}>
        {paragraphs.map((p, i) => (
          <p key={i}>{withLinks(p)}</p>
        ))}
      </div>
      <label htmlFor={`hub-intro-${id}`} className="hub-intro-more" aria-hidden="true">
        <span className="hub-intro-open">Read more</span>
        <span className="hub-intro-close">Show less</span>
      </label>
    </div>
  );
}

const INLINE_LINK = /\[([^\]]+)\]\((\/(?!\/)[^)\s]*)\)/g;

export function withLinks(text: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_LINK)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <Link key={at} href={m[2]} className="text-brand-400 hover:underline">
        {m[1]}
      </Link>,
    );
    last = at + m[0].length;
  }
  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}

/** The intro's text as a reader sees it, links reduced to their labels — for
 *  tests and anything that counts words. */
export function plainIntroText(text: string): string {
  return text.replace(INLINE_LINK, "$1");
}
