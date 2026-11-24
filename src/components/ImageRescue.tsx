"use client";

import { useEffect } from "react";

// Reliable images (owner, 2026-11-23 UX review, P1 15: thumbnails blank on first load). Ported from DexCompare: an <img> that
// fails is tried once more after 1.5 s (a share card drawn on first request can time out), then shows the site's mark, faint, on
// its plate instead of a broken picture. Images with their own fallback (the cart's thumbs) are left alone. No markup.
export function ImageRescue() {
  useEffect(() => {
    const onError = (e: Event) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.fallback === "1" || img.closest("[data-cart-thumb], .cart-list, .cart-drawer")) return;
      if (img.dataset.retried !== "1") {
        img.dataset.retried = "1";
        const src = img.currentSrc || img.src;
        if (!src) return;
        window.setTimeout(() => {
          img.removeAttribute("srcset");
          img.src = src + (src.includes("?") ? "&" : "?") + "r=1";
        }, 1500);
        return;
      }
      img.dataset.fallback = "1";
      img.removeAttribute("srcset");
      img.src = "/icon.svg";
      img.style.objectFit = "contain";
      img.style.padding = "18%";
      img.style.opacity = "0.35";
    };
    window.addEventListener("error", onError, true);
    return () => window.removeEventListener("error", onError, true);
  }, []);
  return null;
}
