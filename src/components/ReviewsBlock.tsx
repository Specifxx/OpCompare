"use client";

import { useEffect, useState } from "react";
import type { PublicReview } from "@/lib/data";
import { loadFeed, openRateCard, scoreLine, type SiteReviewsFeed } from "@/lib/site-reviews";

/** lib/data.ts MIN_REVIEWS_TO_DISPLAY: without a score, a strip of one quote reads as staged. */
const MIN_REVIEWS_TO_DISPLAY = 3;

type Shown = { id: string; rating: number | null; message: string; name: string };

/** The shared service's reviews first (newest), then the ones approved here before 2026-11-03. Pure. */
export function mergeShown(legacy: PublicReview[], feed: SiteReviewsFeed | null): Shown[] {
  return [
    ...(feed?.reviews ?? []).map((r) => ({ id: `s-${r.id}`, rating: r.rating, message: r.message, name: r.name })),
    ...legacy.map((r) => ({ id: r.id, rating: r.rating, message: r.message, name: r.displayName?.trim() || "Verified visitor" })),
  ];
}

export function ReviewsBlock({ legacy }: { legacy: PublicReview[] }) {
  const [feed, setFeed] = useState<SiteReviewsFeed | null>(null);
  useEffect(() => {
    let live = true;
    loadFeed().then((f) => {
      if (live) setFeed(f);
    });
    return () => {
      live = false;
    };
  }, []);

  const reviews = mergeShown(legacy, feed).slice(0, 6);
  const rating = feed?.rating ?? null;
  if (!rating && reviews.length < MIN_REVIEWS_TO_DISPLAY) return null;

  return (
    <section aria-labelledby="op-reviews-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="op-reviews-heading" className="text-xl font-extrabold text-white">
            What people say
          </h2>
          {rating && (
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-300" data-site-rating>
              <span aria-hidden className="text-gold">
                {"★".repeat(Math.round(rating.average))}
                <span className="text-ink-600">{"★".repeat(5 - Math.round(rating.average))}</span>
              </span>
              <strong>{scoreLine(rating)}</strong>
            </p>
          )}
          <p className="mt-0.5 text-xs text-slate-500">Real ratings and reviews from people using OP Compare, read by a person before they appear.</p>
        </div>
        <button type="button" onClick={openRateCard} className="btn-ghost text-xs">
          Rate &amp; review →
        </button>
      </div>
      {reviews.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.id} className="card-surface flex flex-col p-5">
              {r.rating != null && (
                <div className="text-sm text-gold" aria-label={`${r.rating} out of 5`}>
                  {"★".repeat(r.rating)}
                  <span className="text-ink-600">{"★".repeat(5 - r.rating)}</span>
                </div>
              )}
              <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-slate-300">{r.message}</blockquote>
              <figcaption className="mt-3 text-xs text-slate-500">{r.name}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
