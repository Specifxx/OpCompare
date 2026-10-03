// Owner accounts: ADMIN_EMAILS (comma-separated) in Vercel. Admins count as
// Premium everywhere, so the owner can see every gated page without paying.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
