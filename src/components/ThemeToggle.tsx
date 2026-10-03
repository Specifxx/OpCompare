"use client";

import { useEffect, useState } from "react";
import { THEME_KEY } from "@/lib/theme";
import { Icon } from "./Icon";

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    setLight(document.documentElement.getAttribute("data-theme") === "light");
  }, []);
  const flip = () => {
    const next = light ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode */
    }
    setLight(!light);
  };
  return (
    <button type="button" onClick={flip} className="tap-icon rounded-md text-slate-300 hover:bg-ink-800 hover:text-white" aria-label={light ? "Switch to dark theme" : "Switch to light theme"}>
      <Icon name={light ? "moon" : "sun"} className="h-[18px] w-[18px]" />
    </button>
  );
}
