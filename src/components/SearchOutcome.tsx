"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { norm } from "@/lib/search";

// Funnel tracking (owner, 2026-11-23 UX review, item 24: "search queries with no results, so the next round of changes is
// driven by data"). One GA4 event per results page: search_zero (nothing found, even after the typo fix), search_fixed (a typo
// answered with the nearest name), else search_results. The normalised words only, cut to 60 characters; never anything else.
export function SearchOutcome({ query, fixedTo, results, template }: { query: string; fixedTo: string | null; results: number; template: string }) {
  useEffect(() => {
    const q = norm(query).slice(0, 60);
    if (!q) return;
    if (results === 0) trackEvent("search_zero", { q, template });
    else if (fixedTo) trackEvent("search_fixed", { q, to: norm(fixedTo).slice(0, 60), template, results });
    else trackEvent("search_results", { q, template, results });
  }, [query, fixedTo, results, template]);
  return null;
}
