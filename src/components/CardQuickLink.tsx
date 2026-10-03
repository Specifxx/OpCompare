"use client";

import Link from "next/link";

// STUB (ux track): the quickview track owns the real CardQuickLink, which opens
// the card's QuickView on a plain left click. Same signature; the integrator
// keeps the quickview track's version.
export default function CardQuickLink({ slug, className, title, children }: { slug: string; className?: string; title?: string; children: React.ReactNode }) {
  return (
    <Link href={"/card/" + slug} className={className} title={title}>
      {children}
    </Link>
  );
}
