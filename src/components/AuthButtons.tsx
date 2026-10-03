import { PROVIDER_NAMES, type OAuthProvider } from "@/lib/oauth";

// Sign-in buttons (RiftCompare's AuthForm, OAuth only). Plain links: the OAuth
// start route sets the CSRF state and carries ?next= through the round trip.
const ERRORS: Record<string, string> = {
  provider_unavailable: "That sign-in option isn't available right now.",
  oauth_state: "The sign-in took too long or was opened in another tab. Please try again.",
  oauth_token: "The provider didn't confirm the sign-in. Please try again.",
  oauth_profile: "We couldn't read your profile from the provider. Please try again.",
  oauth_noemail: "Your account didn't share an email address, which we need to create an account.",
  oauth_unverified: "Please verify your email address with the provider first, then sign in again.",
  oauth_session: "Something went wrong signing you in. Please try again.",
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.1v2.9A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14a6.6 6.6 0 0 1 0-4.2V6.9H2.1a11 11 0 0 0 0 9.9L5.8 14Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 6.9l3.7 2.9C6.7 7.2 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#5865F2" d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.3 18.3 0 0 0-5.5 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1A19.9 19.9 0 0 0 6.2 21l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6.1-3c.5-5.2-.9-9.7-3.6-13.7ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  );
}

export function AuthButtons({ providers, next, error }: { providers: OAuthProvider[]; next?: string | null; error?: string | null }) {
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="space-y-3">
      {error && ERRORS[error] ? <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">{ERRORS[error]}</p> : null}
      {providers.length ? (
        providers.map((p) => (
          <a key={p} href={`/api/auth/oauth/${p}${q}`} rel="nofollow" className="flex w-full items-center justify-center gap-3 rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-[15px] font-semibold text-white hover:border-ink-600 hover:bg-ink-800">
            {p === "google" ? <GoogleMark /> : <DiscordMark />}
            Continue with {PROVIDER_NAMES[p]}
          </a>
        ))
      ) : (
        <p className="rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-slate-300">Sign-in isn&apos;t switched on yet. Check back soon.</p>
      )}
      <p className="text-center text-xs text-slate-500">
        We only read your name, email and picture. See our <a href="/privacy" className="underline">privacy policy</a>.
      </p>
    </div>
  );
}
