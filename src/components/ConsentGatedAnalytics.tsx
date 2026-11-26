"use client";

import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";
import { track } from "@vercel/analytics";
import { buyClickProps, buyProductKey, clickContext, forVercel, networkOf, type ClickEl } from "@/lib/buy-click";
import { useConsent } from "@/lib/use-consent";
import { dockArmNow } from "@/lib/dock-arm";
import { adLookNow } from "@/lib/ad-look";
import { ebayBtnNow } from "@/lib/buy-btn-arm";
import { ebayPopNow } from "@/lib/stand-out-arm";

// RiftCompare's ConsentGatedAnalytics: Vercel Analytics mounts only once
// useConsent() resolves (a CMP grant, or the no-CMP grace period), never on the
// first paint. RiftCompare also mounts Speed Insights here; OP Compare does not
// ship that package.
//
// BUY CLICKS: one document listener sends a `buy_click` custom event to Vercel
// Analytics for any click on an a[data-retailer] (price rows, eBay and TCGplayer
// buttons, Deal Finder, Best Basket …). It lives inside the consent gate, so it
// only exists while Analytics does; it never touches our own server or database.
// With it, `buy_product { product, region }` when the click names a product (lib/buy-click.ts buyProductKey).
// Custom events need a Vercel plan that includes them (Pro or Enterprise).
function BuyClickEvents() {
  useEffect(() => {
    const report = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return; // a middle-click opens a tab: it counts too
      const a = (e.target as Element | null)?.closest?.("a[data-retailer]");
      if (!a || location.pathname.startsWith("/admin")) return;
      const retailer = (a.getAttribute("data-retailer") ?? "").trim().toLowerCase();
      const cookie = document.cookie.match(/(?:^|;\s*)country=([^;]*)/)?.[1] ?? null;
      const props = buyClickProps(
        { retailer: a.getAttribute("data-retailer"), page: a.getAttribute("data-page"), card: a.getAttribute("data-card"), surface: a.getAttribute("data-surface"), href: (a as HTMLAnchorElement).href },
        location.pathname,
        clickContext(a as unknown as ClickEl, location.pathname, cookie, networkOf(retailer), retailer),
      );
      if (!props) return;
      try {
        Object.assign(props, { dock_arm: dockArmNow(), ad_look: adLookNow(), ebay_btn: ebayBtnNow(), ebay_pop: ebayPopNow() });
        track("buy_click", forVercel(props));
        // Which product: DexCompare's buy_product, two properties. The eBay pass refreshes the most clicked products first.
        const product = buyProductKey(a.getAttribute("data-card"), location.pathname);
        if (product) track("buy_product", { product, region: (props.country ?? "us").toLowerCase() });
      } catch {
        /* an analytics failure never gets in the way of the click */
      }
    };
    document.addEventListener("click", report, true);
    document.addEventListener("auxclick", report, true);
    return () => {
      document.removeEventListener("click", report, true);
      document.removeEventListener("auxclick", report, true);
    };
  }, []);
  return null;
}

export function ConsentGatedAnalytics() {
  const { analytics } = useConsent();
  if (!analytics) return null;
  return (
    <>
      <Analytics />
      <BuyClickEvents />
    </>
  );
}
