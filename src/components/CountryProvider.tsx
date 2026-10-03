"use client";

import { createContext, useCallback, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { COUNTRY_COOKIE, type Country } from "@/lib/country";

interface Ctx {
  country: Country;
  setCountry: (c: Country) => void;
  pending: boolean;
}
const CountryContext = createContext<Ctx | null>(null);

// The visitor's market. The server already rendered the page for it (from the
// cookie / geo); switching writes the cookie and re-renders the server tree.
export function CountryProvider({ initial, children }: { initial: Country; children: React.ReactNode }) {
  const [country, setState] = useState<Country>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const setCountry = useCallback(
    (c: Country) => {
      setState(c);
      document.cookie = `${COUNTRY_COOKIE}=${c}; path=/; max-age=31536000; samesite=lax`;
      start(() => router.refresh());
    },
    [router],
  );
  return <CountryContext.Provider value={{ country, setCountry, pending }}>{children}</CountryContext.Provider>;
}

export function useCountry(): Ctx {
  const v = useContext(CountryContext);
  if (!v) throw new Error("useCountry outside CountryProvider");
  return v;
}
