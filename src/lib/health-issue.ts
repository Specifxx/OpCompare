// The watchdog's fallback channel while email is off: ONE GitHub issue on this
// repository, @-mentioning the owner (a mention always notifies). The
// repository is PUBLIC, so the body is built by renderIssueBody() from check
// labels, our own sentences and counts only; no visitor text, address or name
// can reach it (tests/health.test.ts).
//
//   a problem appears  → open the issue (or comment on it)
//   it changes         → update the body and add a comment (an edit alone is silent)
//   everything clears  → comment "all clear" and close it
import type { HealthReport } from "./health";
import { renderIssueBody } from "./health";

export const ISSUE_TITLE = "OP Compare watchdog";
type Fetch = typeof fetch;

export interface IssueArgs {
  token: string;
  repo: string; // "owner/name"
  report: HealthReport;
  inboxNew: number;
  /** Add a comment (and so notify) this run. */
  announce: boolean;
  fetchImpl?: Fetch;
}

/** True when the issue is in the right state afterwards. */
export async function syncWatchdogIssue(a: IssueArgs): Promise<boolean> {
  const f = a.fetchImpl ?? fetch;
  const owner = a.repo.split("/")[0];
  const api = `https://api.github.com/repos/${a.repo}`;
  const headers = { Authorization: `Bearer ${a.token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "OPCompareWatchdog/1.0" };
  const bad = a.report.checks.filter((c) => c.status === "warn" || c.status === "fail").length;
  const body = renderIssueBody(a.report, a.inboxNew, owner);
  try {
    const list = await f(`${api}/issues?state=open&per_page=50`, { headers });
    if (!list.ok) return false;
    const open = ((await list.json()) as { number: number; title: string; pull_request?: unknown }[]).find((i) => i.title === ISSUE_TITLE && !i.pull_request);
    if (!open) {
      if (!bad && !a.inboxNew) return true; // nothing to say, nothing open
      const res = await f(`${api}/issues`, { method: "POST", headers, body: JSON.stringify({ title: ISSUE_TITLE, body }) });
      return res.ok;
    }
    const patch = await f(`${api}/issues/${open.number}`, { method: "PATCH", headers, body: JSON.stringify({ body, ...(bad || a.inboxNew ? {} : { state: "closed", state_reason: "completed" }) }) });
    if (!patch.ok) return false;
    if (a.announce) {
      const text = bad ? body : `@${owner} all clear: the watchdog sees nothing wrong now.`;
      const c = await f(`${api}/issues/${open.number}/comments`, { method: "POST", headers, body: JSON.stringify({ body: text }) });
      return c.ok;
    }
    return true;
  } catch {
    return false;
  }
}
