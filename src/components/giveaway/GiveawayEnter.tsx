"use client";

import { useEffect, useState, type FormEvent } from "react";
import { GiveawayPanel, type Me, type PanelApi } from "./GiveawayPanel";
import { GIVEAWAY_SERVICE, giveawayState } from "@/lib/giveaway";

// OP Compare's adapter for the entry panel (owner, 2026-11-22). OP Compare's accounts are its own, so the giveaway confirms the
// entrant's email through RiftCompare, which runs the draw: the form asks RiftCompare to mail a link back to /giveaway#c=<code>,
// this page trades the code for a token RiftCompare signed for opcompare.app, and keeps it in this browser. Every call goes to
// RiftCompare's /api/sister-giveaway. No page here reads a cookie, and this site stores no address.
const TOKEN_KEY = "op_giveaway_v1";
const REF_KEY = "gw_ref_v1";
const URL_ = `${GIVEAWAY_SERVICE}/api/sister-giveaway`;

function get(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function set(k: string, v: string | null) {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* private window: they confirm again next time */
  }
}

async function post(body: Record<string, unknown>): Promise<Me & { token?: string; sent?: boolean }> {
  try {
    const r = await fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "omit" });
    const j = (await r.json().catch(() => ({}))) as Me & { token?: string; sent?: boolean };
    if (r.status === 401 && !body.method) {
      set(TOKEN_KEY, null);
      return { state: giveawayState(), signedIn: false, error: body.code ? j.error : undefined };
    }
    if (!r.ok) return { ...j, signedIn: !!get(TOKEN_KEY), state: j.state ?? giveawayState(), error: j.error ?? "Couldn't reach the giveaway. Try again." };
    return { ...j, signedIn: true };
  } catch {
    return { state: giveawayState(), signedIn: !!get(TOKEN_KEY), error: "Couldn't reach the giveaway. Try again." };
  }
}

async function load(): Promise<Me> {
  // Back from the emailed link: trade the code for this browser's token.
  const code = new URLSearchParams(location.hash.slice(1)).get("c");
  if (code) {
    history.replaceState(null, "", location.pathname + location.search);
    const m = await post({ code });
    if (m.token) set(TOKEN_KEY, m.token);
    return m;
  }
  const t = get(TOKEN_KEY);
  if (!t) return { state: giveawayState(), signedIn: false };
  return post({ token: t });
}

function EmailForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    setBusy(true);
    setError(null);
    const r = await post({ method: "email", email });
    setBusy(false);
    if (r.sent) setSent(email);
    else setError(r.error ?? "Couldn't send the email. Try again.");
  }
  if (sent)
    return (
      <p className="text-sm" role="status">
        ✓ Check <b>{sent}</b> for our email and tap <b>Confirm and enter</b>. It can take a minute; check spam too.
      </p>
    );
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor="gw-email">
        Email address
      </label>
      <input id="gw-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-3 py-2" />
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Sending…" : "Email me a link"}
      </button>
      {error && (
        <p className="text-sm text-red-400 sm:basis-full" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function GiveawayEnter() {
  useEffect(() => {
    try {
      const r = new URLSearchParams(location.search).get("ref");
      if (r && /^[A-Za-z0-9_-]{6,40}$/.test(r)) localStorage.setItem(REF_KEY, r);
    } catch {
      /* the invite just doesn't count */
    }
  }, []);
  const api: PanelApi = {
    load,
    act: async (action, extra = {}) => {
      const m = await post({ token: get(TOKEN_KEY), action, ref: action === "enter" ? get(REF_KEY) ?? undefined : undefined, ...extra });
      if (m.entered) set(REF_KEY, null);
      return m;
    },
  };
  return (
    <GiveawayPanel
      api={api}
      closesText="14 Dec, 11:59 pm Sydney"
      watchHint={null}
      signIn={<EmailForm />}
      after={
        <>
          <b>While you wait:</b> get restocks and price drops first in our free{" "}
          <a href="https://t.me/tcgdealsrestocks" className="underline" rel="noopener" target="_blank">
            Telegram
          </a>{" "}
          deal hub.
        </>
      }
    />
  );
}
