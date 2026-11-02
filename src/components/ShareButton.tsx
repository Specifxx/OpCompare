"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import { useCountry } from "./CountryProvider";
import { money } from "@/lib/format";
import { pickMarket, type PerMarket } from "@/lib/per-market";
import { priceGap, shareText, shareUrl, type GapRow, type ShareMedium } from "@/lib/share-link";

// Share (2026-11-02, word of mouth; a copy-the-link button since 2026-09): the
// phone's own share sheet where there is one, else the link copied with the
// message. No pop-up, no reward. The link is the page's clean URL plus
// utm_source=share (lib/share-link.ts). The message names the real price gap in
// the visitor's market: the card page passes one message per market (computed
// on the server, the island picks), the quick view its market's rows.
// One Vercel event per tap, share { medium }; the growth report counts them.
// `responsive` gives an icon square below sm.
export function ShareButton({
  className,
  responsive = false,
  name,
  texts,
  text,
  rows,
  medium = "card",
  path,
}: {
  className?: string;
  responsive?: boolean;
  name?: string;
  /** one message per market (the card page) */
  texts?: PerMarket<string>;
  /** one message (a page that already knows the visitor's market) */
  text?: string;
  /** the visitor's market's open rows, cheapest first (the quick view) */
  rows?: GapRow[];
  medium?: ShareMedium;
  path?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { country } = useCountry();
  return (
    <button
      onClick={async () => {
        const url = shareUrl(location.origin, path ?? location.pathname, medium);
        const title = name ?? document.title;
        const message = texts ? pickMarket(texts, country) : text ?? shareText(title, rows ? priceGap(rows) : null, (c) => money(c, country));
        try {
          track("share", { medium });
        } catch {
          /* analytics never gets in the way */
        }
        if (typeof navigator.share === "function") {
          try {
            await navigator.share({ title, text: message, url });
            return;
          } catch (e) {
            if ((e as Error)?.name === "AbortError") return;
          }
        }
        try {
          await navigator.clipboard.writeText(`${message} ${url}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable — ignore */
        }
      }}
      aria-label={name ? `Share ${name}` : "Share this page"}
      title="Share"
      className={`btn-ghost whitespace-nowrap${responsive ? " w-12 px-0 sm:w-auto sm:px-4" : ""} ${className ?? ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {copied ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <>
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
            <path d="M16 6l-4-4-4 4" />
            <path d="M12 2v13" />
          </>
        )}
      </svg>
      <span className={responsive ? "hidden sm:inline" : undefined}>{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
