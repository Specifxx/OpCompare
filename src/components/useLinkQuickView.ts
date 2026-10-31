"use client";

import { useEffect, useRef } from "react";

// Every link to a card or sealed page opens its quick view (owner, 2026-10-31:
// "whenever I click on any item … I want a quick view open like K Young"), not
// only the tiles built from CardQuickLink / SealedQuickLink: home lists, movers,
// set tables, blog posts, search. One capture-phase listener on the document
// per provider reads the slug from the href; the link keeps its real href, so
// crawlers, new tabs and modified or middle clicks behave like any link. Links
// inside an open dialog (its "Open full page") and to the page already shown
// navigate as usual. A hovered link warms the quick view's data.
export function useLinkQuickView(
  path: RegExp,
  open: (slug: string, hint: { thumb: string | null; label: string | null }) => void,
  prefetch: (slug: string) => void,
) {
  const fns = useRef({ open, prefetch });
  fns.current = { open, prefetch };
  useEffect(() => {
    const slugOf = (e: Event): { a: HTMLAnchorElement; slug: string } | null => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download") || a.closest("[role=dialog]")) return null;
      const href = a.getAttribute("href") ?? "";
      const m = path.exec(href);
      if (!m || window.location.pathname.replace(/\/$/, "") === href.replace(/\/$/, "")) return null;
      return { a, slug: decodeURIComponent(m[1]) };
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const hit = slugOf(e);
      if (!hit) return;
      e.preventDefault();
      const img = hit.a.querySelector("img");
      const named = hit.a.querySelector("h3, [data-card-name]")?.textContent?.trim();
      const text = (hit.a.textContent || "").replace(/\s+/g, " ").trim();
      fns.current.open(hit.slug, { thumb: img?.currentSrc || img?.src || null, label: named || img?.alt || (text.length <= 140 ? text : null) || null });
    };
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const hit = slugOf(e);
      if (hit) fns.current.prefetch(hit.slug);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onOver, { passive: true });
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onOver);
    };
  }, [path]);
}
