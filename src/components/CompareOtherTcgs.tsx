import { TCG_SISTER_SITES } from "@/lib/site";

// "Compare other TCGs": the owner's sister sites, each linked with the game's
// own price-comparison anchor text. Our own sites, so plain followed links.
// Static: reads no request, safe inside the CDN-cached card page.
const ANCHOR: Record<string, string> = {
  rift: "Riftbound card prices",
  mtg: "Magic: The Gathering sealed prices",
  dex: "Pokémon TCG prices",
};

export function CompareOtherTcgs({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="compare-other-tcgs" className={`card-surface p-5 ${className}`}>
      <h2 id="compare-other-tcgs" className="text-lg font-bold text-white">
        Compare other TCGs
      </h2>
      <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-400 sm:flex-row sm:flex-wrap sm:gap-x-6">
        {TCG_SISTER_SITES.map((s) => (
          <li key={s.key}>
            <a href={s.url} target="_blank" rel="noopener" className="font-semibold text-brand-300 hover:underline">
              {ANCHOR[s.key] ?? s.compares}
            </a>{" "}
            on {s.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
