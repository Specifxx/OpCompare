// Which Postgres the app talks to. The database moved to a new Neon project on
// 2026-10-08 (owner's call, to start a fresh transfer allowance), and its
// connection string is the variable OP2, set in Vercel and in GitHub Actions
// (a secret or a repository variable). OP2 wins; DATABASE_URL is the old
// database and stays the fallback so an unset OP2 changes nothing, and so the
// switch can be undone by deleting OP2.
//
// Never log the value. Pure: no database import, safe for scripts and tests.
const NAMES = ["OP2", "op2", "OP2_DATABASE_URL", "DATABASE_URL_OP2", "DATABASE_URL"] as const;

function clean(v: string | undefined): string {
  // A value pasted with quotes, a trailing space or a newline must still work.
  return (v ?? "").trim().replace(/^(['"])(.*)\1$/s, "$2").trim();
}

/** The connection string in force, and which variable supplied it. */
export function resolveDatabaseUrl(env: Record<string, string | undefined> = process.env): { url: string; name: string } | null {
  for (const name of NAMES) {
    const url = clean(env[name]);
    if (url) return { url, name };
  }
  return null;
}

export function databaseUrl(env: Record<string, string | undefined> = process.env): string {
  return resolveDatabaseUrl(env)?.url ?? "";
}

/** True when the connection string is the new OP2 database rather than the old DATABASE_URL. */
export function usingOp2(env: Record<string, string | undefined> = process.env): boolean {
  const r = resolveDatabaseUrl(env);
  return r != null && r.name !== "DATABASE_URL";
}
