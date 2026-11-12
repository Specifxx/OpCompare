import Link from "next/link";
import { CHRISTMAS_FESTIVE_LAYER, seasonMarkupLive } from "@/lib/season";

// Christmas (until Boxing Day): a one-line gift-guide card under the hero's logo
// (owner, 2026-11-12), linking the existing gift guide. Server HTML, not a heading;
// in the HTML around the season, shown only while <html> carries
// data-season="christmas" (globals.css .xmas-banner-row). CHRISTMAS_FESTIVE_LAYER
// (lib/season.ts) off falls back to the quieter 2026-11-08 gifts pill.
export function ChristmasGifts() {
  if (!seasonMarkupLive("christmas")) return null;
  if (!CHRISTMAS_FESTIVE_LAYER) {
    return (
      <div className="xmas-pill-row mb-3 justify-center sm:mb-4">
        <Link href="/sealed" className="xmas-pill">
          <b>Christmas on the Grand Line</b>
          <span className="xmas-pill-more hidden sm:inline">· booster box gifts, cheapest first →</span>
        </Link>
      </div>
    );
  }
  return (
    <div className="xmas-banner-row mb-3 justify-center sm:mb-4">
      <Link href="/blog/one-piece-card-game-gift-guide" prefetch={false} className="xmas-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M5 12v8h14v-8M12 8v12M12 8c-2.5 0-4-1-4-2.5S9.5 3 11 4.5 12 8 12 8Zm0 0c2.5 0 4-1 4-2.5S14.5 3 13 4.5 12 8 12 8Z" />
          </svg>
        <span className="xmas-banner-text">
          <b>Christmas gift guide</b>
          <span className="xmas-banner-sub">One Piece gifts from a single pack to a booster box, live prices</span>
        </span>
        <span className="xmas-banner-go" aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
