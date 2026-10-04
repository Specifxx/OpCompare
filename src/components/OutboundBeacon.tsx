"use client";

import { useEffect, useRef } from "react";
import { pageFromPath, slugFromPath } from "@/lib/click-event";
import { useCountry } from "./CountryProvider";
import { readEntrySource } from "@/lib/entry-source";

// ONE global listener for outbound shop clicks (RiftCompare's OutboundLink
// beacon, done once instead of per link): any click on an a[data-retailer] —
// PriceBoard rows, eBay search links, the footer ads, the Buy List Planner —
// sends {retailer, page, slug (data-card, else the page's), country} to /api/click with sendBeacon, so
// /admin/clicks can count clicks per store and per page in our own database.
// Mounted once in the root layout. It never delays or changes the click, and
// a failed beacon is silent. Middle-clicks (open in a new tab) count too.
export function OutboundBeacon() {
  const { country } = useCountry();
  const countryRef = useRef(country);
  countryRef.current = country;
  useEffect(() => {
    const report = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return;
      const a = (e.target as Element | null)?.closest?.("a[data-retailer]");
      if (!a) return;
      try {
        const path = location.pathname;
        const body = JSON.stringify({
          retailer: a.getAttribute("data-retailer"),
          page: a.getAttribute("data-page") || pageFromPath(path),
          // The link's own card (list pages, QuickView) beats the page's path.
          slug: a.getAttribute("data-card") || slugFromPath(path),
          country: countryRef.current,
          // First-touch traffic bucket of this tab (lib/entry-source.ts; wave 2).
          entry: readEntrySource(),
        });
        const blob = new Blob([body], { type: "application/json" });
        if (!navigator.sendBeacon?.("/api/click", blob)) {
          void fetch("/api/click", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
        }
      } catch {
        /* a beacon never gets in the way of the click */
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
