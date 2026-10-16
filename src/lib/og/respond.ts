// The one way a route turns a composition into a PNG: brand fonts, 1200×630.
//
// Caching (owner, 2026-10-14: "cache them for a long time, a day or more,
// instead of drawing them on every request"). Every opengraph-image route is
// ISR: `revalidate = 86400` and, for a route with a [slug], an EMPTY
// generateStaticParams, so nothing is drawn at build and each image is drawn on
// its first request and then served from the cache for a day. (A dynamic route
// without generateStaticParams is never cached by Next 14, whatever it exports:
// that is why the per-card images used to be drawn per request.) The data comes
// from day-old loaders (lib/data.ts getCatalogForImages), so nothing in the
// render cuts that day short. No route reads a cookie, a header or the visitor's
// market (tests/og.test.ts walks each route's imports).
//
// Cache headers. ImageResponse sends "public, immutable, no-transform,
// max-age=31536000" unless told otherwise, and the ?hash Next appends to
// og:image tracks the route's code, not the prices; so a browser or proxy
// honouring that header would keep a card's price for a year. Images therefore
// send OG_CACHED: no browser cache, a day at the CDN (the same as the routes'
// `revalidate`), a day of stale-while-revalidate. A fallback drawn after a read
// error or for an unknown slug sends OG_AFTER_ERROR (one minute) AND cuts its
// render's ISR life to OG_FALLBACK_TTL (images.tsx fallbackOg), so a brief
// outage, or a card shared minutes before its import, never pins the
// placeholder for a day. The key must be lowercase to replace ImageResponse's
// default. Same choice as RiftCompare's Pokémon share images (TCGEmpire
// DECISIONS D8), with a longer life.
import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { loadOgFonts } from "./fonts";
import { OG_SIZE } from "./theme";

export const OG_CACHED = "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400";
export const OG_AFTER_ERROR = "public, max-age=0, s-maxage=60";
/** Seconds a fallback image stays in the ISR cache (and at the CDN: OG_AFTER_ERROR). */
export const OG_FALLBACK_TTL = 60;

export async function ogResponse(el: ReactElement, cacheControl?: string): Promise<ImageResponse> {
  return new ImageResponse(el, {
    ...OG_SIZE,
    fonts: await loadOgFonts(),
    ...(cacheControl ? { headers: { "cache-control": cacheControl } } : {}),
  });
}
