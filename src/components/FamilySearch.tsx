import { familySearchLinks } from "@/lib/site";

/**
 * "Searching another game?" under /browse search results: the same query on
 * each card-game sister site (lib/site.ts familySearchLinks), so someone who
 * types "Charizard" here is pointed to the site that has it. Search links, so
 * nofollow: a site-search results page is noindex on every sister site.
 */
export function FamilySearch({ q, className }: { q: string; className?: string }) {
  const links = familySearchLinks(q);
  if (!links.length) return null;
  return (
    <p data-family-search className={`text-sm text-slate-400 ${className ?? ""}`}>
      Searching another game? Look up “{q.trim().slice(0, 80)}” on{" "}
      {links.map((l, i) => (
        <span key={l.key}>
          <a href={l.href} target="_blank" rel="noopener nofollow" className="text-brand-400 hover:underline">
            {l.name}
          </a>
          <span className="text-slate-500"> ({l.game})</span>
          {i < links.length - 2 ? ", " : i === links.length - 2 ? " or " : "."}
        </span>
      ))}
    </p>
  );
}
