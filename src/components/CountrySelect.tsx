"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRY_LIST, COUNTRIES } from "@/lib/country";
import { useCountry } from "./CountryProvider";
import { Icon } from "./Icon";

export function CountrySelect() {
  const { country, setCountry } = useCountry();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const c = COUNTRIES[country];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-2.5 text-sm font-semibold text-slate-100 hover:border-ink-600"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Market: ${c.label}`}
      >
        <span aria-hidden="true">{c.flag}</span>
        <span>{c.code}</span>
        <Icon name="chevron" className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open ? (
        <ul role="listbox" className="absolute right-0 z-dropdown mt-1 w-56 overflow-hidden rounded-lg border border-ink-700 bg-ink-900 py-1 shadow-glow">
          {COUNTRY_LIST.map((x) => (
            <li key={x.code}>
              <button
                type="button"
                role="option"
                aria-selected={x.code === country}
                onClick={() => {
                  setCountry(x.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ink-800 ${x.code === country ? "text-brand-400" : "text-slate-200"}`}
              >
                <span aria-hidden="true">{x.flag}</span>
                <span className="flex-1">{x.label}</span>
                <span className="text-xs text-slate-500">{x.currency}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The "Shopping from" pill row on the homepage hero. */
export function MarketPills() {
  const { country, setCountry } = useCountry();
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Shopping from</span>
      <div className="flex flex-wrap justify-center gap-1 rounded-full border border-ink-700 bg-ink-900/70 p-1">
        {COUNTRY_LIST.map((x) => (
          <button
            key={x.code}
            type="button"
            onClick={() => setCountry(x.code)}
            aria-pressed={x.code === country}
            className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
              x.code === country ? "bg-ink-700 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {x.code}
            {x.code === country ? <span className="ml-1 text-[10px] font-medium text-slate-400">{x.currency}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
