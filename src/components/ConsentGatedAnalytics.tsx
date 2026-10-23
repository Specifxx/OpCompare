"use client";

import { useEffect } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { track } from "@vercel/analytics";
import { buyClickProps } from "@/lib/buy-click";
import { useConsent } from "@/lib/use-consent";

// RiftCompare's ConsentGatedAnalytics: Vercel Analytics mounts only once
// useConsent() resolves (a CMP grant, or the no-CMP grace period), never on the
// first paint. RiftCompare also mounts Speed Insights here; OP Compare does not
// ship that package.
//
// BUY CLICKS: one document listener sends a `buy_click` custom event to Vercel
// Analytics for any click on an a[data-retailer] (price rows, eBay and TCGplayer
// buttons, Deal Finder, Best Basket …). It lives inside the consent gate, so it
// only exists while Analytics does; it never touches our own server or database.
// Custom events need a Vercel plan that includes them (Pro or Enterprise).
function BuyClickEvents() {
  useEffect(() => {
    const report = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return; // a middle-click opens a tab: it counts too
      const a = (e.target as Element | null)?.closest?.("a[data-retailer]");
      if (!a || location.pathname.startsWith("/admin")) return;
      const props = buyClickProps(
        { retailer: a.getAttribute("data-retailer"), page: a.getAttribute("data-page"), card: a.getAttribute("data-card"), surface: a.getAttribute("data-surface") },
        location.pathname,
      );
      if (!props) return;
      try {
        track("buy_click", props);
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

// WHO IS NOT COUNTED (DECISIONS.md, "Web Analytics counts visitors, not us or
// bots", 2026-10-23). Vercel bills Web Analytics per event, so beforeSend drops
// (for page views and buy_click alike): local and *.vercel.app hosts, automated
// browsers (navigator.webdriver), bot-like user agents, and the owner's own
// browser once it has visited any page with ?notrack=1 (?notrack=0 undoes it).
const OPT_OUT_KEY = "va-disable";
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|python|curl|wget|httpclient|phantom|puppeteer|playwright|selenium/i;

export function analyticsAllowed(): boolean {
  try {
    const host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app")) return false;
    if (navigator.webdriver) return false;
    if (BOT_UA.test(navigator.userAgent)) return false;
  } catch {
    return false;
  }
  try {
    if (localStorage.getItem(OPT_OUT_KEY) === "1") return false;
  } catch {
    /* storage blocked: count the visit */
  }
  return true;
}

const beforeSend = (event: BeforeSendEvent): BeforeSendEvent | null => (analyticsAllowed() ? event : null);

// ?notrack=1 sets the owner's opt-out in this browser, ?notrack=0 clears it.
function OwnerOptOut() {
  useEffect(() => {
    try {
      const v = new URLSearchParams(location.search).get("notrack");
      if (v === "1") localStorage.setItem(OPT_OUT_KEY, "1");
      else if (v === "0") localStorage.removeItem(OPT_OUT_KEY);
    } catch {
      /* storage blocked: nothing to remember */
    }
  }, []);
  return null;
}

function GatedAnalytics() {
  const { analytics } = useConsent();
  if (!analytics) return null;
  return (
    <>
      <Analytics beforeSend={beforeSend} />
      <BuyClickEvents />
    </>
  );
}

export function ConsentGatedAnalytics() {
  return (
    <>
      <OwnerOptOut />
      <GatedAnalytics />
    </>
  );
}
