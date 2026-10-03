"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useQuickView } from "./QuickViewProvider";

interface Hit {
  slug: string;
  name: string;
  number: string | null;
  variant: string | null;
  set: string;
  img: string | null;
  price: string;
  kind: "card" | "sealed";
}

// Typeahead over the cached catalogue (/api/search). Enter opens the full
// results on /browse. "/" focuses it from anywhere, as on RiftCompare. A card
// hit opens the card's QuickView (RiftCompare's search does the same: the
// visitor keeps the page they were on); modifier clicks and sealed hits
// navigate as links.
export function CardSearch({ size = "md", placeholder = "Search for cards", autoFocus = false }: { size?: "md" | "lg"; placeholder?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const router = useRouter();
  const qv = useQuickView();
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (size !== "md") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/input|textarea|select/i.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [size]);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(s)}`, { signal: ctrl.signal });
        if (r.ok) {
          setHits((await r.json()).hits ?? []);
          setActive(-1);
        }
      } catch {
        /* aborted */
      }
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (h?: Hit) => {
    setOpen(false);
    if (h?.kind === "card" && qv) {
      setActive(-1);
      qv.open(h.slug, { thumb: h.img, label: h.name });
    } else if (h) router.push(h.kind === "card" ? `/card/${h.slug}` : `/sealed/${h.slug}`);
    else if (q.trim()) router.push(`/browse?q=${encodeURIComponent(q.trim())}`);
  };

  const big = size === "lg";
  return (
    <div ref={box} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(active >= 0 ? hits[active] : undefined);
        }}
      >
        <label className="relative block">
          <span className="sr-only">{placeholder}</span>
          <Icon name="search" className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-500 ${big ? "left-4 h-5 w-5" : "left-3 h-4 w-4"}`} />
          <input
            ref={input}
            value={q}
            autoFocus={autoFocus}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, hits.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, -1));
              } else if (e.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder}
            autoComplete="off"
            className={`w-full rounded-md border border-ink-700 bg-ink-900 text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 ${
              big ? "h-14 pl-12 pr-12 text-lg" : "h-11 pl-9 pr-10 text-sm"
            }`}
          />
          <kbd className={`pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-ink-600 px-1.5 text-xs text-slate-400 sm:block`}>/</kbd>
        </label>
      </form>
      {open && q.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 z-dropdown mt-1 overflow-hidden rounded-lg border border-ink-700 bg-ink-900 shadow-glow">
          {hits.length ? (
            <ul>
              {hits.map((h, i) => (
                <li key={`${h.kind}-${h.slug}`}>
                  <Link
                    href={h.kind === "card" ? `/card/${h.slug}` : `/sealed/${h.slug}`}
                    onClick={(e) => {
                      setOpen(false);
                      if (h.kind !== "card" || !qv || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                      e.preventDefault();
                      setActive(-1);
                      qv.open(h.slug, { thumb: h.img, label: h.name });
                    }}
                    onPointerEnter={h.kind === "card" && qv ? () => qv.prefetch(h.slug) : undefined}
                    className={`flex items-center gap-3 px-3 py-2 ${i === active ? "bg-ink-800" : "hover:bg-ink-800"}`}
                  >
                    {h.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={h.img} alt="" className="h-11 w-8 shrink-0 rounded-sm bg-ink-800 object-cover" loading="lazy" />
                    ) : (
                      <span className="h-11 w-8 shrink-0 rounded-sm bg-ink-800" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-100">
                        {h.name}
                        {h.variant ? <span className="font-normal text-slate-400"> · {h.variant}</span> : null}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {h.set}
                        {h.number ? ` · ${h.number}` : ""}
                      </span>
                    </span>
                    <span className="num shrink-0 text-sm font-semibold text-accent">{h.price}</span>
                  </Link>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => go()} className="block w-full border-t border-ink-800 px-3 py-2 text-left text-sm font-medium text-brand-400 hover:bg-ink-800">
                  See every result for “{q.trim()}” →
                </button>
              </li>
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-slate-500">No cards match “{q.trim()}”.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
