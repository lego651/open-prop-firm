# Manual QA Checklist — OpenPropFirm v1

Two layers of QA, run at different times:

- **Part 0 — 10-Minute Pre-Deploy Ritual.** Run before EVERY push to main. Catches the regressions that matter on the 8 public URLs and the firm decision components.
- **Parts 1–5 — Comprehensive QA.** Run before launch, then quarterly. Walks every guest + auth + admin flow.

---

## Part 0 — 10-Minute Pre-Deploy Ritual

Run on `pnpm dev` (or against the preview URL after `vercel deploy`).

### 0.1 — Marketing surface (90 seconds)

- [ ] `/` loads. Hero + "Browse firms" CTA + 4 firm cards visible. SiteHeader sticky on scroll. SiteFooter visible at bottom with affiliate-disclosure micro-copy.
- [ ] `/about` loads. Renders prose. Header + Footer present.
- [ ] `/disclosure` loads. Header + Footer present. "Affiliate-only" stance is visible in the body.
- [ ] `/terms` loads. Header + Footer present.
- [ ] Click "Firms" in the SiteHeader → lands on `/firms` (bare style is intentional for v1 — see "Known v1 boundaries" at the bottom of Part 0).

### 0.2 — Firm decision pages (4 firms × ~60 seconds = 4 minutes)

For EACH of the four launch firms — `/firms/funded-next`, `/firms/funding-pips`, `/firms/apex-funding`, `/firms/lucid-trading` — confirm:

- [ ] Page renders without console errors.
- [ ] **VerificationBadge** shows a date and either "manual" or "bot". If the badge is amber/red (>7 days stale), note which firm — it's a bot-monitoring signal, not necessarily a deploy blocker.
- [ ] **SnapshotBar** renders with 6 chips populated (max DD, daily DD, profit target, payout split, payout cycle, news trading). No chip should be empty/blank.
- [ ] **RuleBreakdown** section renders with content (the firm's `rules.md` body). H2 headings appear in the breakdown.
- [ ] **Changelog** section renders. If empty (`No changes recorded yet.`), that's fine — bot hasn't logged anything yet for this firm.
- [ ] **KillYouFirstList** renders with at least one warning entry, amber-tinted background.
- [ ] **FitScoreTable** renders with rating rows + a "Best for" line at the top.
- [ ] **PreTradeChecklist** renders with checkable items, green-tinted background. Click one item — checkbox state flips. Reload the page — the checked state persists (localStorage).
- [ ] **AffiliateCTA** — TWO valid states:
  - If the firm's `decision.affiliate.url` is `null` → CTA does NOT render (correct null-guard). Confirm by inspecting the page — no green button block at the bottom.
  - If the URL is populated → button renders, links to the affiliate URL, has the disclosure micro-copy.

### 0.3 — Wiki catch-all (60 seconds)

The Obsidian-style wiki must still work — it's the original content surface and v1-f10's layout split could regress it.

- [ ] `/firms/cfd/funding-pips` → 3-panel AppShell (sidebar tree + content + optional graph). Sidebar shows the file tree.
- [ ] `/firms/cfd/funding-pips/rules` → still inside AppShell, content updates.
- [ ] `/firms/futures/apex-funding` → same shape, futures category.

### 0.4 — Cross-cut sanity (60 seconds)

- [ ] `/sitemap.xml` returns XML. Spot-check that all 4 firm decision URLs (`/firms/<slug>`) appear.
- [ ] `/robots.txt` returns text. `/admin` and `/auth` are disallowed.
- [ ] DevTools console on `/` and on one firm decision page — zero errors, zero React hydration warnings.
- [ ] Page tab title on `/` reads "OpenPropFirm — the pre-trade decision page for prop firm traders".

### 0.5 — Bot health (30 seconds)

- [ ] Open the pinned `Bot Health Check` issue on GitHub — newest comment is < 8 days old (matches `MAX_SILENCE_HOURS=192`). If older, the watchdog will alert separately; the deploy doesn't block on it but Jason should investigate before EOD.

### 0.6 — Sign-off

- [ ] All Part 0 checks passed → safe to deploy.
- [ ] Any check failed → STOP. Fix or back out the failing change before pushing main.

### Known v1 boundaries (intentional, not bugs)

These are documented decisions, NOT regressions. They should NOT block a deploy:

- `/firms` and `/firms/[slug]` (decision-tool routes) render WITHOUT SiteHeader/SiteFooter. The decision page has its own dense top chrome (VerificationBadge → SnapshotBar) and a second site nav above it would compete for attention. v2 candidate.
- `/legal/terms-of-service` and `/legal/disclaimer` still resolve (the old `legal/` route group). New canonical routes are `/terms` + `/disclosure`. v1-f11 does NOT add 301 redirects — old links keep working as-is.
- The `/firms/cfd/<slug>` wiki catch-all coexists with `/firms/<slug>` decision-tool routes. Two different surfaces over the same firm slug. v2 may unify; v1 ships both.
- Apex Trader Funding + Lucid Trading scrapers currently 403 from Cloudflare Bot Management (TLS/JA3 fingerprinting beyond UA spoofing). v1-f5 health watchdog catches the silent-failure case. Backlog: Playwright-based fetch or rotating residential proxy.

---

## Prerequisites

- Open the site in a fresh private/incognito window (no cached session)
- Have a test email address ready for sign-up
- Know your admin email (the one set in `ADMIN_EMAILS` env var)

---

## Part 1 — Guest (no account)

### 1.1 Home page

- [ ] `/` loads without errors
- [ ] Page title shows "OpenPropFirm" (check browser tab)
- [ ] Navigation bar renders correctly (logo, search icon, sign-in link visible)
- [ ] No console errors in DevTools

### 1.2 Firm content pages

Pick one CFD firm and one futures firm. For each, visit all sub-pages:

**CFD — Funded Next**

- [ ] `/firms/cfd/funded-next` — Overview loads, firm name and category visible
- [ ] `/firms/cfd/funded-next/rules` — Trading rules render correctly
- [ ] `/firms/cfd/funded-next/promos` — Promos page loads (even if empty)
- [ ] `/firms/cfd/funded-next/changelog` — Changelog loads
- [ ] `/firms/cfd/funded-next/challenges/25k` — Challenge page shows account size, price
- [ ] `/firms/cfd/funded-next/challenges/100k` — Another challenge size loads

**Futures — Apex Funding**

- [ ] `/firms/futures/apex-funding` — Overview loads
- [ ] `/firms/futures/apex-funding/rules` — Rules page loads
- [ ] `/firms/futures/apex-funding/challenges/300k` — Challenge loads

**On any firm page, check:**

- [ ] `last_verified` date badge is visible (e.g. "Verified Mar 2026")
- [ ] `verified_by` badge shows "manual" or "bot" as appropriate
- [ ] Source footnotes appear at the bottom with real URLs
- [ ] Wikilinks in body text (e.g. "See also: Trading Rules") render as clickable links, not raw `[[...]]` syntax
- [ ] Page `<title>` in browser tab reads `<Firm Name> — <Page Type> — OpenPropFirm`

### 1.3 Search

- [ ] Click the search icon in the navbar — modal opens
- [ ] Type "funded" — results appear for Funded Next pages
- [ ] Type "apex" — results appear for Apex Funding pages
- [ ] Click a result — navigates to the correct firm page
- [ ] Press `Escape` — modal closes
- [ ] Keyboard shortcut `⌘K` (Mac) or `Ctrl+K` (Windows) opens search

### 1.4 Graph / knowledge graph

- [ ] Graph panel is visible on the page (node graph rendered)
- [ ] Hovering a node shows a tooltip with the firm/page name
- [ ] Clicking a node navigates to that firm page
- [ ] Graph controls (zoom, filter) are present and responsive

### 1.5 Legal pages

- [ ] `/legal/terms-of-service` — page loads, content renders as styled prose
- [ ] `/legal/disclaimer` — page loads, content renders
- [ ] Both pages are NOT indexed (check: view source, look for `<meta name="robots" content="noindex">` — or verify they are excluded from sitemap)

### 1.6 SEO / crawlability

- [ ] `/sitemap.xml` — returns XML with firm URLs listed
- [ ] `/robots.txt` — returns text file (should allow crawling, disallow `/admin` and `/auth`)
- [ ] View source on any firm page — `<meta name="description">` is present and non-empty
- [ ] Open Graph: paste a firm URL into https://opengraph.xyz or similar — title, description, and `/og.png` image should appear

### 1.7 404 handling

- [ ] `/firms/cfd/made-up-firm` — shows a 404 / not-found page (not a crash)
- [ ] `/legal/fake-page` — shows 404

### 1.8 Auth redirect (protected routes)

- [ ] `/admin` — redirects to `/auth/sign-in` (not a blank page or error)

---

## Part 2 — Auth flows (new user)

### 2.1 Sign-up

- [ ] `/auth/sign-up` — form renders (email + password fields)
- [ ] Submit with a valid test email — confirmation email is sent (check inbox)
- [ ] Confirm email via the link — redirected back to the app, session is active
- [ ] After confirming, you are NOT redirected to `/admin` (you're a regular user)

### 2.2 Sign-in

- [ ] `/auth/sign-in` — form renders
- [ ] Submit with wrong password — error message displayed (not a crash)
- [ ] Submit with correct credentials — redirected into the app
- [ ] After sign-in: navigation bar shows a user indicator or sign-out option

### 2.3 Password reset

- [ ] `/auth/sign-in` — click "Forgot password" link
- [ ] Enter email, submit — confirmation shown
- [ ] Check inbox, click reset link — `/auth/update-password` loads
- [ ] Set a new password — form submits, redirected into the app

### 2.4 Sign-out

- [ ] Sign-out action clears session
- [ ] After sign-out, `/admin` redirects to sign-in again

---

## Part 3 — Admin (signed-in, admin email)

Sign in with the email listed in your `ADMIN_EMAILS` environment variable.

### 3.1 Access control

- [ ] `/admin` loads without redirect
- [ ] Sign in with a non-admin email — `/admin` redirects to `/` (not sign-in)

### 3.2 Bot usage log

- [ ] Page title reads "Admin — Bot Usage Log"
- [ ] Table renders with columns: firm, run_at, last_verified, changes_detected, pr_url, error
- [ ] If any bot runs have been logged, rows appear with real data
- [ ] If no runs yet, table is empty but doesn't crash

---

## Part 4 — Content integrity spot-check

Pick 3–4 firm pages at random and verify:

- [ ] No raw YAML visible in the page body (no `---` front-matter leaking through)
- [ ] No raw `[[wikilink]]` syntax visible (all resolved to `<a>` tags)
- [ ] No `**bold**` or `##heading` markdown visible as literal text
- [ ] Images (if any) load; broken image icons are a bug
- [ ] `sources:` footnotes at the bottom link to real firm websites (not localhost or placeholder)

---

## Part 5 — Performance spot-check (optional but recommended)

- [ ] Run Lighthouse on the home page and one firm page — target 90+ Performance, 100 Accessibility
- [ ] No layout shift visible on page load (CLS)
- [ ] Fonts load without flash of unstyled text

---

## Sign-off

| Check | Passed | Notes |
|-------|--------|-------|
| Guest flows | | |
| Auth flows | | |
| Admin page | | |
| Content integrity | | |
| Performance | | |

**Ready to ship when all rows show "Passed".**
