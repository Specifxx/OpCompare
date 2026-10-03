import Link from "next/link";

// STUB (deals track). The premium track owns this component: it opens the
// Premium dialog for `tier`, attributed to `surface`, and falls back to a link
// to /premium. Same signature; the integrator keeps theirs.
export default function PlanButton({ surface, tier, className, children }: { surface: string; tier?: "plus" | "premium"; className?: string; children?: React.ReactNode }) {
  return (
    <Link href="/premium" className={className ?? "btn-primary"} data-surface={surface} data-tier={tier ?? "plus"}>
      {children ?? (tier === "premium" ? "See Premium" : "See Plus")}
    </Link>
  );
}
