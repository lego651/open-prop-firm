# Manual QA Checklist — OpenPropFirm v1

Run this against the production URL (or `npm run dev` locally) before launch.
Check each item off as you go. Two sections: **Guest** (no account) and **Signed-in user**.

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
