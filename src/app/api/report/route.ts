// POST /api/report: the shared "Report a store" form (components/ReportForms.tsx,
// /how-we-pick-stores). Filed on this repo's `reports` branch (lib/reports-github.ts)
// like the sister sites' reports; RiftCompare's daily triage puts it first. No database.
import { handleReportPost } from "@/lib/reports-github";
import { CONTACT_EMAIL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handleReportPost(req, "opcompare", { email: CONTACT_EMAIL });
}
