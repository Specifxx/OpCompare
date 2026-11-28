import Link from "next/link";
import { BfModeBar } from "@/components/BfModeBar";
import { TcgSalePopup } from "@/components/TcgSalePopup";
import { affiliateUrl } from "@/lib/affiliate";
import { bfModeOn, bfPhase } from "@/lib/bf-mode";
import { TCGPLAYER_STANDING } from "@/lib/offer-calendar";
import { saleStrip } from "@/lib/holiday-strip";
import { StripClose } from "./StripClose";

// One line above every page's content in season (lib/holiday-strip.ts). Server-rendered from the render's date: a cached
// page can show yesterday's link for up to its revalidate window, which is why the switch to Cyber Monday falls on the
// Sunday, a day after Black Friday weekend's busiest day.
// For Black Friday itself (lib/bf-mode.ts, owner 2026-11-27) the line becomes the bold Black Friday bar, which falls back to it.
export function HolidayStrip({ today = new Date().toISOString().slice(0, 10) }: { today?: string }) {
  const s = saleStrip(today);
  const strip = s ? (
    <div className="relative border-b border-gold/20 bg-gold/10" data-holiday-strip={s.href.slice(1)}>
      <p className="container-app truncate py-1.5 pr-10 text-center text-xs sm:text-sm">
        <Link href={s.href} prefetch={false} className="hover:underline">
          <b>{s.name} One Piece deals</b><span className="hidden sm:inline"> · sealed under TCGplayer and every store, updated daily</span> · <span className="font-semibold text-gold">see the deals →</span>
        </Link>
      </p>
      {/* Closes for 7 days (owner, 2026-11-23 UX review, P0 6: less header before content, one dismissible line). */}
      <StripClose id={s.href.slice(1)} />
    </div>
  ) : null;
  const now = Date.now();
  const on = bfModeOn(now);
  // After the sale the bar and the card keep running with the offer calendar (lib/offer-calendar.ts, owner 2026-11-28).
  return (
    <>
    <BfModeBar
      on={on} phase={bfPhase(now)} now={now}
      href="/black-friday"
      evergreen={{
        title: "One Piece sealed deals",
        line: "booster boxes under TCGplayer and every store today",
        href: "/sealed",
        hrefs: { afterChristmas: "/boxing-day", newYear: "/january-sales" },
        ad: (
        <a
          href={affiliateUrl("https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&ProductTypeName=Sealed+Products", "tcgplayer", "/offer-bar")}
          rel="sponsored nofollow noopener noreferrer"
          target="_blank"
          className="underline underline-offset-2"
        >
          <span style={{ color: "#fff" }}>{TCGPLAYER_STANDING.short}</span> · Ad
        </a>
        ),
      }}
      title="One Piece sealed deals"
      line="booster boxes under TCGplayer and every store today"
      ad={
        <a
          href={affiliateUrl("https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&ProductTypeName=Sealed+Products", "tcgplayer", "/bf-mode")}
          rel="sponsored nofollow noopener noreferrer"
          target="_blank"
          className="underline underline-offset-2"
        >
          <span style={{ color: "#fff" }}>TCGplayer sale: 10% store credit on everything</span> · Ad
        </a>
      }
    >
      {strip}
    </BfModeBar>
    {/* TCGplayer's sale card (owner, 2026-11-27): once a visit, never while typing, closes for good (TcgSalePopup.tsx). */}
    <TcgSalePopup slotKey="oc_prompt_slot" dealsHref="/black-friday" offerHref={"/sealed"}>
      <a href={affiliateUrl("https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&q=booster+box&ProductTypeName=Sealed+Products", "tcgplayer", "/bf-popup")} rel="sponsored nofollow noopener noreferrer" target="_blank">Booster boxes</a>
      <a href={affiliateUrl("https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&ProductTypeName=Sealed+Products", "tcgplayer", "/bf-popup")} rel="sponsored nofollow noopener noreferrer" target="_blank">All sealed</a>
      <a href={affiliateUrl("https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&ProductTypeName=Cards", "tcgplayer", "/bf-popup")} rel="sponsored nofollow noopener noreferrer" target="_blank">Singles</a>
    </TcgSalePopup>
    </>
  );
}
