import Link from "next/link";

// STUB (deals track). The quickview track owns this component: a client link
// that opens QuickView on a plain left click when the provider is mounted and
// navigates normally otherwise. Same signature; the integrator keeps theirs.
export default function CardQuickLink({ slug, className, title, children }: { slug: string; className?: string; title?: string; children: React.ReactNode }) {
  return (
    <Link href={"/card/" + slug} prefetch={false} className={className} title={title}>
      {children}
    </Link>
  );
}
