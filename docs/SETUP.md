# OP Compare — setup

Everything OP Compare needs to go live, in order. The domain is
**opcompare.app**: it's owned, and `.app` is HTTPS-only (Vercel issues the
certificate).

OP Compare gets its **own** database, Vercel project, Stripe account, sign-in
apps, GA4 property and Search Console property. It never reads or writes
anything of RiftCompare's. A few values are reused from RiftCompare where that
is safe; those are marked **reuse**. `docs/CHROME-SETUP-PROMPT.md` does all of
this in the browser.

## 1. Database (Neon)

1. Create a new Neon project named `opcompare`: Postgres 16+, region AWS US East
   (N. Virginia), next to Vercel's `iad1` functions.
2. Copy the **pooled** connection string (`…-pooler….neon.tech/neondb?sslmode=require`).
3. That one string is `DATABASE_URL` everywhere below.

There is no history database. Price history lives in GitHub (see 2).

Free tier: 0.5 GB storage and 5 GB/month transfer. Postgres holds only today's
prices (about 365k offer rows) plus accounts.

## 2. GitHub — `Specifxx/OpCompare`

**Branch.** Create `main` from `claude/tender-noether-2na98p` and make it the
default branch. CI, the daily release and Vercel production all key off
`main`.

**Settings → Actions → General → Workflow permissions:** set *Read and write*.
Two workflows need it:
- *Production deploy* pushes the daily release commit to `main`.
- *Import prices* pushes the price history to the `data` branch.

**The `data` branch** is created by the first *Import prices* run. Don't edit
it by hand. Its `vercel.json` turns Vercel deployments off for it.

**Settings → Secrets and variables → Actions**

| Kind | Name | Value | From RiftCompare? |
|---|---|---|---|
| Secret | `DATABASE_URL` | The Neon pooled string | **New**, never a RiftCompare database |
| Secret | `CRON_SECRET` | A long random string (same value as in Vercel) | New |
| Secret | `GSC_SA_KEY` | The Search Console service-account JSON key | **Reuse** the same service account. GitHub secrets can't be read back, so create a new JSON key for it (Google Cloud → IAM → Service accounts → Keys) |
| Secret | `STRIPE_SECRET_KEY` | OP Compare's Stripe secret key (`sk_live_…`), used by the *Stripe setup* workflow | **New** account (see 6) |
| Variable | `SITE_URL` | `https://opcompare.app` (also the workflows' default) | New |
| Variable | `GSC_PROPERTY` | `sc-domain:opcompare.app` (the default), or `https://opcompare.app/` for a URL-prefix property | New |
| Variable | `INDEXNOW_KEY` | `43ac93dd97a44d4894bedf52d621c57c` | **Reuse**: RiftCompare's public key (keys are verified per host) |

| Workflow | When | Needs |
|---|---|---|
| CI | every PR and every push to `main` | nothing |
| Import prices | 07:07 and 19:07 UTC, or Run workflow | `DATABASE_URL`, `CRON_SECRET`, write permission |
| Production deploy | 08:00 UTC, or Run workflow | write permission |
| Search Console | 07:25 UTC, or Run workflow | `GSC_SA_KEY` |
| IndexNow submit | 08:10 UTC, or Run workflow | `INDEXNOW_KEY` (+ the same key in Vercel) |
| Stripe setup | by hand: once, and after a price change | `STRIPE_SECRET_KEY` |

Each workflow is a no-op until its values exist.

## 3. Vercel

1. *Add New → Project → Import* `Specifxx/OpCompare`, in the same team as
   RiftCompare. Framework: Next.js; defaults otherwise.
2. *Settings → Git → Production Branch:* `main`.
3. *Domains:* add `opcompare.app` and set `www.opcompare.app` to redirect to it.
   Add the DNS records Vercel shows at the registrar.
4. Production builds only for commits whose subject contains `[deploy]`.
   Previews always build.
5. The daily Stripe reconcile runs as a Vercel Cron (`vercel.json`).

**Settings → Environment Variables** (Production and Preview unless noted):

| Name | Value | From RiftCompare? |
|---|---|---|
| `DATABASE_URL` | Same Neon string as GitHub | **New** |
| `CRON_SECRET` | Same as the GitHub secret | New |
| `AUTH_SECRET` | A 64-character random hex string. It signs sessions; production refuses sign-in without it | **New**, never RiftCompare's |
| `NEXT_PUBLIC_SITE_URL` | `https://opcompare.app` | New |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | The OP Compare Google OAuth client (see 5) | **New** (recommended) |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Optional: the OP Compare Discord app | New |
| `ADMIN_EMAILS` | Optional. Admin addresses, comma-separated. The code's built-in default is `mastermisclick@gmail.com`; **setting this REPLACES that default**, so either leave it unset or include `mastermisclick@gmail.com` in the list. Admins open `/admin` and count as Premium | New (not RiftCompare's list) |
| `ADMIN_TOKEN` | Optional, **Vercel only**, usually unset. A **new** random secret of at least 32 characters (`openssl rand -hex 32`) for scripts calling `/api/admin/*` with `Authorization: Bearer …`; shorter or unset closes the token path. Never in a URL | **New**, never RiftCompare's |
| `ADMIN_EXTRA_ORIGINS` | Optional, rarely needed. Extra origins (comma-separated, e.g. a preview URL) allowed to submit admin and public-form POSTs (feedback, contact, price reports, store suggestions) in production; `https://opcompare.app` is always allowed | New |
| `STRIPE_SECRET_KEY` | OP Compare's Stripe secret key | **New** account |
| `STRIPE_WEBHOOK_SECRET` | The webhook endpoint's signing secret (`whsec_…`) | New |
| `NEXT_PUBLIC_GA_ID` | The new GA4 measurement id `G-…` (Production) | **New property**, same GA account |
| `INDEXNOW_KEY` | `43ac93dd97a44d4894bedf52d621c57c` | **Reuse** |
| `GOOGLE_SITE_VERIFICATION` | Only for a URL-prefix Search Console property: the HTML tag's `content` | New |
| `BING_SITE_VERIFICATION` | Optional. Bing's `msvalidate.01` value; import from Search Console instead | New |
| `EBAY_AFFILIATE_CAMPAIGN` | Optional. The EPN campaign id; the code defaults to RiftCompare's | **Reuse** (optional) |
| `TCGPLAYER_IMPACT_LINK` | Optional. The Impact link base; the code defaults to RiftCompare's | **Reuse** (optional) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional public contact address | Optional |
| `NEXT_PUBLIC_USD_TO_AUD` … `_EUR` | Optional FX overrides | **Reuse** if set there |

Do not copy any of these: `EBAY_CLIENT_*` (OP Compare never calls the eBay
API), `RM*`, `RH*`, `HISTORY_DATABASE_URL*`, RiftCompare's `AUTH_SECRET`,
`STRIPE_*` or `*_PRICE_ID`, Resend, Brevo, Discord bot, or AdSense.

## 4. Google Analytics 4

1. In the same account as RiftCompare: *Admin → Create → Property* "OP Compare".
2. Add a *Web* stream for `https://opcompare.app` with Enhanced measurement on.
3. Put the `G-…` id in `NEXT_PUBLIC_GA_ID`.
4. Mark `buy_click` as a key event once it appears.

## 5. Sign-in (Google, optionally Discord)

**Google (recommended: its own client).**
1. In Google Cloud Console, create the project "OP Compare".
2. Set up the *OAuth consent screen*:
   - External; app name "OP Compare"; support email the owner's.
   - Authorized domain `opcompare.app`.
   - Scopes `openid`, `email`, `profile`.
   - *Publish app* (In production). The basic scopes need no Google review.
3. *Credentials → Create OAuth client ID → Web application* "OP Compare web":
   - JavaScript origin `https://opcompare.app`.
   - Redirect URI `https://opcompare.app/api/auth/oauth/google/callback`.
4. Put the client id and secret in Vercel.

*Reusing RiftCompare's client instead* works: add the redirect URI and the
authorized domain to it. But Google's account chooser would then say "continue
to RiftCompare", so it's a fallback only.

**Discord (optional).**
1. At discord.com/developers create the application "OP Compare".
2. Under *OAuth2*, add the redirect
   `https://opcompare.app/api/auth/oauth/discord/callback`.
3. Put its client id and secret in Vercel.

A provider's button shows only when both of its values are set.

## 6. Stripe (Plus & Premium)

1. **A separate Stripe account for OP Compare.** Dashboard → account switcher →
   *New account* "OP Compare". RiftCompare's daily reconcile matches every
   subscription in its account by email, so sharing an account would let OP
   Compare subscribers unlock RiftCompare Premium. Activate payments, set the
   public business name "OP Compare", the statement descriptor `OPCOMPARE`, a
   support email and branding.
2. Developers → API keys → the **secret key**. Put it in Vercel
   `STRIPE_SECRET_KEY` and the GitHub secret `STRIPE_SECRET_KEY`.
3. GitHub → Actions → **Stripe setup** → Run workflow. It creates:
   - the two products,
   - four prices: Plus $2.99/mo · $23.99/yr; Premium $4.99/mo · $39.99/yr,
     each with lookup key `opcompare_<tier>_<interval>`,
   - the billing-portal configuration.

   The log ends with whether the webhook exists.
4. Developers → Webhooks → *Add endpoint*
   `https://opcompare.app/api/stripe/webhook`, subscribed to these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `invoice.paid`
   - `invoice.payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`

   Put its signing secret in Vercel `STRIPE_WEBHOOK_SECRET`.
5. Settings → Emails: turn on receipts for successful payments.
6. Redeploy (GitHub → *Production deploy*). `/premium` switches from "Opening
   soon" to live buttons once `STRIPE_SECRET_KEY` is set and the prices exist.

**To change a price:** edit `PLAN_CENTS` in `src/lib/plans.ts`, ship it, and
re-run *Stripe setup*. New subscribers pay the new price; existing ones keep
theirs.

## 7. Google Search Console and Bing

1. *Add property → Domain* `opcompare.app` and verify with the DNS TXT record.
   Or use a URL-prefix property with the HTML tag in `GOOGLE_SITE_VERIFICATION`;
   then set `GSC_PROPERTY` to `https://opcompare.app/`.
2. *Settings → Users and permissions*: add the service account's
   `client_email` (the one RiftCompare's property lists) with **Full**.
3. Submit `https://opcompare.app/sitemap.xml`.
4. Bing Webmaster Tools → *Import from Google Search Console*, then submit the
   sitemap.

## 8. Turn it on

1. GitHub → *Import prices* → Run workflow. The first run creates the tables,
   loads everything and creates the `data` branch (10–20 minutes).
2. GitHub → *Production deploy* → Run workflow.
3. Open https://opcompare.app. Check:
   - a card page shows store prices;
   - `/login` shows the sign-in buttons;
   - `/premium` shows live buttons;
   - sign in as **mastermisclick@gmail.com** → the account menu shows *Admin*
     and `/admin` loads (accounts, subscriptions, store health, inbox). Signed
     out or as any other account, `/admin` is an ordinary 404;
   - share images: paste `https://opcompare.app` and
     `https://opcompare.app/price-guide` into a link-preview tester such as
     https://www.opengraph.xyz/ and into a Discord message, and start a Reddit
     post with the link to see its preview. Each should show the price-guide
     image (real cards and prices, not the empty "ghost table" fallback). Then
     try one card, one set and one sealed page. If the fallback shows, re-run
     *Import prices* (it purges the cache) and check again **before** posting to
     Reddit: Reddit keeps a post's thumbnail forever.
4. GitHub → run *Search Console* and *IndexNow submit*.

## Limits to watch

- **Neon storage (0.5 GB):** only today's prices and accounts, so it stays
  small. History is not in Postgres.
- **Neon transfer (5 GB/month):** pages read cached loaders (6 h TTL, purged by
  each import), production deploys once a day, and charts come from GitHub.
- **The `data` branch:** about 250 KB of new history a day (about 90 MB a year
  before git's compression). Each product file keeps two years. The day files
  are the permanent archive.
