# OP Compare — setup: database, Vercel, GitHub, Google

Everything OP Compare needs to go live, in the order to do it. OP Compare has
its **own** database, Vercel project, GA4 property and Search Console property —
it never reads or writes anything of RiftCompare's. A few values are reused from
RiftCompare where that is safe (marked **reuse**).

## 1. Database (Neon)

Create a new Neon project, e.g. `opcompare` (Postgres 16+, region AWS US East
(N. Virginia) to sit next to Vercel's default `iad1` functions). Copy the
**pooled** connection string (`…-pooler….neon.tech/neondb?sslmode=require`).
That one string is `DATABASE_URL` everywhere below — the app, the import and
`prisma db push` all use it, as RiftCompare does.

Free tier: 0.5 GB storage, 5 GB/month transfer. The import writes ~190k offer
rows and ~7.7k history rows a day; the site reads through cached loaders. See
"Limits" at the bottom.

## 2. GitHub — `Specifxx/OpCompare`

**Branch.** Create `main` from `claude/tender-noether-2na98p` (or merge its pull
request) and make `main` the default branch. CI, the daily release and Vercel
production all key off `main`.

**Settings → Actions → General → Workflow permissions:** *Read and write* (the
daily *Production deploy* workflow pushes one release commit to `main`).

**Settings → Secrets and variables → Actions**

| Kind | Name | Value | From RiftCompare? |
|---|---|---|---|
| Secret | `DATABASE_URL` | The new Neon pooled connection string | **New** — never a RiftCompare database |
| Secret | `CRON_SECRET` | A long random string (same value as in Vercel) | New (a fresh one is better than reusing) |
| Secret | `GSC_SA_KEY` | The Search Console service-account JSON key | **Reuse** — the same JSON RiftCompare's `GSC_SA_KEY` holds. GitHub secrets can't be read back, so paste it from your saved key file, or create a new JSON key for the same service account in Google Cloud Console (IAM & Admin → Service accounts → Keys → Add key) |
| Variable | `SITE_URL` | `https://<your-domain>` (no trailing slash; the `*.vercel.app` URL until a domain is attached) | New |
| Variable | `GSC_PROPERTY` | `sc-domain:<your-domain>` (Domain property) or `https://<your-domain>/` (URL-prefix property) | New |
| Variable | `INDEXNOW_KEY` | `43ac93dd97a44d4894bedf52d621c57c` | **Reuse** — RiftCompare's public IndexNow key (a key is verified per host, so one key serves both sites) |

Not needed here: `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` (OP Compare never calls
the eBay API), any `RM*` / `RH*` / `HISTORY_DATABASE_URL*`, Stripe, Resend,
Discord, CardTrader or AdSense values.

**Workflows** (Actions tab):

| Workflow | When | Needs |
|---|---|---|
| CI | every PR / push to main | nothing |
| Import prices | 07:07 + 19:07 UTC, or Run workflow | `DATABASE_URL`; `CRON_SECRET` + `SITE_URL` to refresh the live site |
| Production deploy | 08:00 UTC, or Run workflow | write permission (above) |
| Search Console | 07:25 UTC, or Run workflow | `GSC_SA_KEY`, `GSC_PROPERTY`, `SITE_URL` |
| IndexNow submit | 08:10 UTC, or Run workflow | `SITE_URL`, `INDEXNOW_KEY` (+ the same key in Vercel) |

Each one is a no-op until its values exist, so order does not break anything.

## 3. Vercel

*Add New → Project → Import* `Specifxx/OpCompare`. Framework: Next.js (detected);
build command and output: defaults. **Settings → Git → Production Branch:**
`main`. Production builds are gated to commits whose subject contains
`[deploy]` (`vercel.json` → `scripts/vercel-ignore-build.sh`); previews always
build.

**Settings → Environment Variables** (Production and Preview unless noted):

| Name | Value | From RiftCompare? |
|---|---|---|
| `DATABASE_URL` | Same Neon pooled string as GitHub | **New** |
| `CRON_SECRET` | Same value as the GitHub secret | New |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` | New |
| `NEXT_PUBLIC_GA_ID` | The new GA4 property's measurement id `G-…` (Production only) | **New property**, same Google Analytics account |
| `GOOGLE_SITE_VERIFICATION` | The `content` value of Search Console's HTML-tag method (only for a URL-prefix property; a Domain property verifies by DNS instead) | New |
| `INDEXNOW_KEY` | `43ac93dd97a44d4894bedf52d621c57c` | **Reuse** |
| `BING_SITE_VERIFICATION` | Optional — Bing Webmaster Tools' `msvalidate.01` value (or import the site from Search Console and skip this) | New |
| `EBAY_AFFILIATE_CAMPAIGN` | Optional — the EPN campaign id; the code already defaults to RiftCompare's (clicks report as `oc-…` custom ids) | **Reuse** (optional) |
| `TCGPLAYER_IMPACT_LINK` | Optional — the Impact deep-link base; the code already defaults to RiftCompare's | **Reuse** (optional) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional — public contact address (defaults to RiftCompare's) | Optional |
| `NEXT_PUBLIC_USD_TO_AUD` … `_EUR` | Optional FX overrides | **Reuse** if RiftCompare sets them |

**Domains:** add your domain (and `www` redirecting to it). Then make sure
`SITE_URL` / `NEXT_PUBLIC_SITE_URL` match it.

**First deploy:** run *Production deploy* → Run workflow in GitHub (it lands the
`[deploy]` commit Vercel builds), or Redeploy from the Vercel dashboard.

## 4. Google Analytics 4

In the same Google Analytics account as RiftCompare: *Admin → Create → Property*
"OP Compare" → *Web* data stream for `https://<your-domain>` with Enhanced
measurement on. Copy the measurement id `G-…` into Vercel's `NEXT_PUBLIC_GA_ID`
and redeploy. The site sends `buy_click` events (`retailer`, `page_type`) for
every store, TCGplayer and eBay click; mark `buy_click` as a key event if you
want it in reports. EEA/UK/CH visitors get Consent Mode with analytics storage
denied by default (cookieless pings).

## 5. Google Search Console

1. *Add property*: a **Domain** property (`<your-domain>`, verified with a DNS TXT
   record at your registrar) is best; or a **URL-prefix** property
   (`https://<your-domain>/`) verified with the HTML tag → put its `content` in
   Vercel's `GOOGLE_SITE_VERIFICATION`, redeploy, then press Verify.
2. *Settings → Users and permissions → Add user*: the service account's
   `client_email` from `GSC_SA_KEY` (the same one on RiftCompare's property),
   permission **Full** (it submits the sitemap).
3. *Sitemaps*: submit `https://<your-domain>/sitemap.xml` (the daily workflow
   re-submits it too).
4. Set GitHub's `GSC_PROPERTY` to exactly the property you made
   (`sc-domain:<your-domain>` or `https://<your-domain>/`).
5. Optional: Bing Webmaster Tools → *Import from Google Search Console*.

## 6. Affiliate programmes (optional but recommended)

- **TCGplayer / Impact:** add `<your-domain>` as a promotional property on the
  Impact account so OP Compare's traffic is within the programme's terms. Clicks
  carry `sharedid=oc-…`.
- **eBay Partner Network:** the existing campaign works (clicks carry
  `customid=oc-<market>-…`); create a separate campaign and set
  `EBAY_AFFILIATE_CAMPAIGN` only if you want OP Compare split out at campaign
  level.

## 7. Turn it on

1. GitHub → Actions → *Import prices* → Run workflow (first run creates the
   tables and loads everything, ~5–10 minutes).
2. GitHub → Actions → *Production deploy* → Run workflow.
3. Open the site; check a card page shows store prices.
4. GitHub → Actions → *Search Console* and *IndexNow submit* → Run workflow.

## Limits to watch

- **Neon storage (free 0.5 GB):** price history grows ~7.7k rows a day (≈150–250
  MB a year with indexes). Upgrade the plan or prune `PriceDay` older than a year
  when it gets close.
- **Neon transfer (free 5 GB/month):** pages read only cached loaders (6 h TTL,
  purged by each import), and production deploys once a day. The import itself
  reads ~1 MB per run.
