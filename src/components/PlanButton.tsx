"use client";

// STUB (tools track): the premium track owns this component and its real
// version opens the Premium dialog. Same signature; the integrator keeps the
// premium track's file.
import Link from "next/link";

export default function PlanButton({ surface, tier, className, children }: { surface: string; tier?: "plus" | "premium"; className?: string; children?: React.ReactNode }) {
  return (
    <Link href="/premium" className={className} data-surface={surface} data-tier={tier}>
      {children ?? "See Premium"}
    </Link>
  );
}
