"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export function ShareButton({ title }: { title: string }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      /* dismissed */
    }
  };
  return (
    <button type="button" onClick={share} className="btn-ghost">
      <Icon name="external" className="h-4 w-4" />
      {done ? "Link copied" : "Share"}
    </button>
  );
}
