import { COLORS, COLOR_KEYS, PRINTINGS, PRINTING_KEYS, RARITIES, SET_KINDS, CARD_TYPES } from "@/lib/constants";
import { COUNTRIES, type Country } from "@/lib/country";
import type { BrowseQuery } from "@/lib/browse";
import type { SetLite } from "@/lib/data";

function Section({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group border-t border-ink-800 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-bold uppercase tracking-[0.1em] text-slate-300">
        {title}
        <span className="text-slate-500 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="mt-3 space-y-1.5">{children}</div>
    </details>
  );
}

function Check({ name, value, checked, children }: { name: string; value: string; checked: boolean; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-slate-200 hover:text-white">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="h-4 w-4 rounded border-ink-600 bg-ink-950 accent-[#d92b33]" />
      <span className="min-w-0 truncate">{children}</span>
    </label>
  );
}

// The /browse filter panel — a plain GET form, so it works without JavaScript
// and every filtered view has a shareable URL (RiftCompare's Filters panel).
export function BrowseFilters({ q, sets, country, action = "/browse", hide = [] }: { q: BrowseQuery; sets: SetLite[]; country: Country; action?: string; hide?: string[] }) {
  const c = COUNTRIES[country];
  const byKind = Object.entries(SET_KINDS)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([k, v]) => ({ kind: k, label: v.plural, sets: sets.filter((s) => s.kind === k).sort((a, b) => (b.releasedOn ?? "").localeCompare(a.releasedOn ?? "")) }))
    .filter((g) => g.sets.length);
  return (
    <form id="filters" action={action} method="get" className="card-surface p-4">
      <p className="mb-3 font-display text-sm font-extrabold uppercase tracking-[0.12em] text-white">Filters</p>
      {q.q ? <input type="hidden" name="q" value={q.q} /> : null}
      <Section title={`Price (${c.currency})`} open>
        <div className="flex items-center gap-2">
          <input name="min" defaultValue={q.min != null ? (q.min / 100).toString() : ""} inputMode="decimal" placeholder="Min" className="input" aria-label="Minimum price" />
          <span className="text-slate-500">–</span>
          <input name="max" defaultValue={q.max != null ? (q.max / 100).toString() : ""} inputMode="decimal" placeholder="Max" className="input" aria-label="Maximum price" />
        </div>
        <label className="flex items-center gap-2.5 pt-2 text-[15px] text-slate-200">
          <input type="checkbox" name="priced" value="1" defaultChecked={q.priced} className="h-4 w-4 accent-[#d92b33]" />
          Only cards with a {c.adjective} listing
        </label>
      </Section>
      {!hide.includes("set") ? (
        <Section title="Set" open={q.sets.length > 0}>
          {byKind.map((g) => (
            <div key={g.kind} className="pb-2">
              <p className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.label}</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {g.sets.map((s) => (
                  <Check key={s.id} name="set" value={s.slug} checked={q.sets.includes(s.slug)}>
                    {s.name} <span className="text-slate-500">({s.code})</span>
                  </Check>
                ))}
              </div>
            </div>
          ))}
        </Section>
      ) : null}
      {!hide.includes("color") ? (
        <Section title="Colour" open={q.colors.length > 0}>
          {COLOR_KEYS.map((k) => (
            <Check key={k} name="color" value={k.toLowerCase()} checked={q.colors.includes(k)}>
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: COLORS[k].hex }} />
              {k}
            </Check>
          ))}
        </Section>
      ) : null}
      <Section title="Rarity" open={q.rarities.length > 0}>
        {Object.entries(RARITIES).map(([k, v]) => (
          <Check key={k} name="rarity" value={k} checked={q.rarities.includes(k)}>
            {v.label} <span className="text-slate-500">({k})</span>
          </Check>
        ))}
      </Section>
      <Section title="Card type" open={q.types.length > 0}>
        {CARD_TYPES.map((t) => (
          <Check key={t} name="type" value={t} checked={q.types.includes(t)}>
            {t}
          </Check>
        ))}
      </Section>
      <Section title="Printing" open>
        {PRINTING_KEYS.map((k) => (
          <Check key={k} name="printing" value={k} checked={q.printings.includes(k)}>
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: PRINTINGS[k].dot }} />
            {PRINTINGS[k].label}
          </Check>
        ))}
      </Section>
      <div className="sticky bottom-0 -mx-4 -mb-4 mt-2 border-t border-ink-800 bg-ink-900 p-4">
        <button type="submit" className="btn-primary w-full">
          Apply filters
        </button>
      </div>
    </form>
  );
}
