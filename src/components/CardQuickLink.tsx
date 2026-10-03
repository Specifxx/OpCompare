"use client";

// STUB (tools track): the quickview track owns this component and its real
// version opens the card's QuickView on a plain left click. Same signature;
// the integrator keeps the quickview track's file.
import Link from "next/link";

export default function CardQuickLink({ slug, className, title, children }: { slug: string; className?: string; title?: string; children: React.ReactNode }) {
  return (
    <Link href={"/card/" + slug} className={className} title={title}>
      {children}
    </Link>
  );
}
