# Sprint 1 Tickets — OpenPropFirm

**Sprint Goal:** Project skeleton, repo structure, licenses, and infrastructure are in place. Nothing is visible to users yet, but everything is buildable.

**Status:** Confirmed — ready for execution
**Last updated:** 2026-03-29
**Reviewed by:** PM + Tech Lead (full challenge session)

> **Auth method — RESOLVED 2026-03-29:** Google OAuth only. Confirmed by founder. `docs/tech-plan.md` Section 3.8 is canonical. Before Sprint 2 Task 2.10 (`CompareAuthGate`), create Google Cloud Console OAuth credentials and add `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` to `.env.local` and Vercel env vars.

---

## S1-1: Initialize Next.js 15 app with TypeScript, shadcn/ui, and Tailwind v4

**Goal:** Bootstrap the complete project foundation — Next.js 15, strict TypeScript, shadcn/ui, Tailwind v4 CSS-based config, Prettier — in a single buildable and lint-clean state.

**Acceptance Criteria:**
- Run `npx create-next-app@latest openpropfirm --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` — Next.js version in `package.json` must be `15.x`
- `tsconfig.json` has `"strict": true`
- `globals.css` uses `@import "tailwindcss"` (Tailwind v4 CSS-based config) with an `@theme {}` block — no `tailwind.config.js` file exists
- Run `npx shadcn@latest init` (not `shadcn-ui` — that is the deprecated package name) choosing TypeScript, CSS variables, no default base color
- The following shadcn components installed in one command: `button breadcrumb command dialog popover checkbox skeleton separator tooltip scroll-area badge`
- All 12 installed shadcn components appear in `src/components/ui/` without error
- Prettier configured in `.prettierrc` with `singleQuote: true`, `semi: false`, `tabWidth: 2` and `prettier-plugin-tailwindcss` installed and listed in `plugins`
- `tsconfig.scripts.json` created at repo root, extending `tsconfig.json`, with `"module": "commonjs"` and `"outDir": "dist/scripts"` — required for `ts-node` script execution in Sprint 1 (S1-9) and later sprints
- `app/layout.tsx` has `suppressHydrationWarning` on the `<html>` element and an inline `<script>` in `<head>` that reads `localStorage.getItem("theme")` and sets `data-theme` on `document.documentElement` before first paint — prevents theme flash on load from day one
- `npm run build` succeeds with zero errors
- `npm run lint` passes with zero errors

**Notes:**
- Tailwind v4 uses a CSS-first config (`@import "tailwindcss"`, `@theme {}` block) — `create-next-app` may scaffold a v3-style `tailwind.config.js`. Delete it and replace with the v4 CSS-based approach per `docs/tech-plan.md` Section 3.11.
- The `suppressHydrationWarning` + anti-flash inline script belongs in Sprint 1, not Sprint 2 — every deployment from this sprint forward should be flash-free.
- `prettier-plugin-tailwindcss` enforces consistent class ordering — install it now or class ordering will be inconsistent for the entire project lifetime.

**Blocks:** Every other Sprint 1 ticket. Sprint 2 AppShell component.

---

## S1-2: Scaffold /data folder structure with all four firms

**Goal:** Create the complete canonical `/data` directory with every firm folder, content file, and template — all files have valid, parseable frontmatter ready for the validate-content script.

**Acceptance Criteria:**
- `/data` is at the repo root (not inside `/src`)
- Exact folder and file structure matches `docs/tech-plan.md` Section 4 canonical spec:
  - `firms/cfd/funded-next/`: `index.md`, `rules.md`, `promos.md`, `changelog.md`, `challenges/10k.md`, `challenges/25k.md`, `challenges/50k.md`, `challenges/100k.md`, `challenges/200k.md`
  - `firms/cfd/funding-pips/`: `index.md`, `rules.md`, `promos.md`, `changelog.md`, `challenges/5k.md`, `challenges/10k.md`, `challenges/25k.md`, `challenges/50k.md`, `challenges/100k.md`
  - `firms/futures/apex-funding/`: `index.md`, `rules.md`, `promos.md`, `changelog.md`, `challenges/25k.md`, `challenges/50k.md`, `challenges/100k.md`, `challenges/300k.md`
  - `firms/futures/lucid-funding/`: `index.md`, `rules.md`, `promos.md`, `changelog.md`, `challenges/10k.md`, `challenges/25k.md`, `challenges/50k.md`
- Every `.md` file has all required frontmatter fields: `title`, `firm` (kebab-case matching folder name), `category` (`cfd` or `futures`), `type` (valid enum: `basic-info | challenge | rules | promo | changelog`), `status: active`, `last_verified` (ISO 8601 UTC timestamp), `verified_by: manual`, `sources` (array with at least one placeholder entry — the firm's homepage URL — **not empty**, because the validate-content script treats empty sources as an error), `tags` (array)
- Challenge files additionally include: `challenge_size` (numeric), `price_usd: 0` (placeholder), `affiliate_available: false` (placeholder)
- Index files additionally include: `website` (firm's homepage URL), `founded: 0` (placeholder integer), `headquarters: ""` (placeholder string)
- Content body of each scaffold file contains the sentence: `"Placeholder — content will be added in Sprint 4."` plus one placeholder wikilink that will resolve internally (e.g., `index.md` links to its own `rules.md`)
- `/data/_templates/` exists with `firm-index.md`, `challenge.md`, `rules.md`, `promos.md`, `changelog.md` — each contains the full frontmatter schema with commented field descriptions for community contributors
- `/data/README.md` exists explaining how to clone `/data` into Obsidian and how wikilinks resolve
- `/data/LICENSE` contains the full CC-BY-NC-SA-4.0 license text

**Notes:**
- The PM's original ticket had wrong challenge tiers for all four firms — Funding Pips was entirely wrong. Use the tiers listed above (from `docs/tech-plan.md` Section 4). Sprint 4 will verify against official firm websites.
- `sources: []` is explicitly rejected by the S1-9 validate-content script — use `sources: [{url: "https://[firm-homepage]", label: "Official Website — to be expanded in Sprint 4"}]` as the placeholder.
- Tier accuracy for Sprint 4: Funded Next — verify 10k/25k/50k/100k/200k tiers exist on official site. Funding Pips — verify 5k/10k/25k/50k/100k. Apex — verify 25k/50k/100k/300k. Lucid — verify 10k/25k/50k.

**Blocks:** S1-9 (validate-content script requires parseable files). Sprint 2 NavPanel (`getContentTree.ts` reads this structure). Sprint 3 content rendering.

---

## S1-3: CSS and theme system scaffold

**Goal:** Create the full three-theme CSS variable system and prose CSS skeleton so that every deployment from Sprint 1 forward has correct theming with no flash on load.

**Acceptance Criteria:**
- `src/styles/themes.css` exists and defines all three `[data-theme="light"]`, `[data-theme="dark"]`, `[data-theme="blue"]` blocks with all CSS custom properties from `docs/ui-guide.md` Section 6.2: `--background`, `--foreground`, `--sidebar-bg`, `--border`, `--accent`, `--accent-fg`, `--muted`, `--muted-fg`, `--text-primary`, `--text-secondary`, `--text-muted`
- `src/styles/prose.css` exists with the `.prose` class defined but rules left empty (skeleton only — rules are populated in Sprint 3)
- Both files are imported into `src/app/globals.css` via `@import`
- `src/app/globals.css` maps shadcn component CSS variable names (`--background`, `--foreground`, `--border`, `--accent`) to the project's theme variables in an `@layer base` block — shadcn components inherit the correct theme colors automatically
- Manually toggling `data-theme` attribute on `<html>` in browser DevTools visibly changes background color for all three themes
- No white flash occurs on hard reload (relies on the anti-flash inline script from S1-1)
- `npm run build` passes after these files are added

**Notes:**
- Tailwind v4 does not support `darkMode: ["class"]` from v3. All theme colors come exclusively from CSS custom properties on `[data-theme]` selectors — never from Tailwind's `dark:` prefix utilities.
- Architecture contract: **Tailwind handles layout, spacing, flex, sizing. CSS variables handle all colors.** This must be respected by every component from Sprint 2 onward.
- shadcn variable names (`--background`, `--foreground`, etc.) intentionally match the project's variable names — preserve this mapping.

**Blocks:** Sprint 2 ThemeToggle component. Sprint 2 AppShell visual correctness. All visual regression testing.

---

## S1-4: LICENSE files and README

**Goal:** Create all required legal and documentation files — root LICENSE (AGPL-3.0), README with dual-license model and commercial contact, license badges.

**Acceptance Criteria:**
- `LICENSE` at repo root contains the full AGPL-3.0 license text (full text, not a summary)
- `/data/LICENSE` contains the full CC-BY-NC-SA-4.0 license text (created in S1-2; this ticket verifies it and adds the README references)
- `README.md` exists at repo root with:
  - One-paragraph project description matching the origin story from `docs/project-brief.md`
  - Tech stack list: Next.js 15, TypeScript, shadcn/ui, Tailwind CSS v4, Supabase Auth, Vercel Analytics, GitHub Actions
  - Dual-license summary: "`/src` code is AGPL-3.0. `/data` content is CC-BY-NC-SA-4.0. Commercial use of either requires a separate license — contact `commercial@openpropfirm.com`"
  - "How to run locally" section: clone → `npm install` → copy `.env.example` to `.env.local` → `npm run dev`
  - License badges (shields.io format) for AGPL-3.0 and CC-BY-NC-SA-4.0
  - Placeholder link: "CONTRIBUTING.md — Coming in Sprint 6"
  - Placeholder link: "Live site — Coming at launch"
  - GitHub Actions build status badge (link to bot.yml workflow)
  - `COMMERCIAL LICENSE` section explicitly stating commercial use requires a separate agreement and providing the contact email
- The `commercial@openpropfirm.com` address is a placeholder — founder must replace with a real monitored inbox before Sprint 6 launch

**Notes:**
- The root `LICENSE` covers all `/src` code by convention — do not create a separate `/src/LICENSE`. The PM's original draft hedged with "(or /src/LICENSE)" which is incorrect.
- License badges require no service integration — they are static shields.io image URLs embedded in markdown.

**Blocks:** Sprint 6 CONTRIBUTING.md (references both license files). Community contributions can begin after this ticket merges.

---

## S1-5: Vercel project setup and preview deployments

**Goal:** Connect the GitHub repo to Vercel, verify production and preview deployments work, and document all required environment variables in `.env.example`.

**Acceptance Criteria:**
- Vercel project created in the dashboard, linked to the GitHub repo, root directory set to `/`, framework preset set to Next.js
- Production branch set to `main`
- Pushing a commit to `main` triggers an automatic Vercel production build that completes successfully
- Pushing to a non-main branch triggers a preview deployment with a unique URL — verified by pushing a test branch
- `.env.example` at repo root documents every env var with inline comments:
  - `NEXT_PUBLIC_SITE_URL=https://openpropfirm.com` — note as placeholder, update when domain is purchased
  - `NEXT_PUBLIC_SUPABASE_URL` — "Get from Supabase project settings > API"
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — "Get from Supabase project settings > API"
  - `SUPABASE_SERVICE_KEY` — **"GitHub Actions secret ONLY. NEVER set as a Vercel env var or in .env.local. Full database write access."**
  - `HEALTH_CHECK_ISSUE_NUMBER=1` — GitHub Actions secret, update to real issue number in Sprint 6
  - `ANTHROPIC_API_KEY` — "GitHub Actions secret only. Used by monitoring bot LLM fallback in Sprint 6."
  - If Google OAuth (pending auth decision from S1-8): `NEXT_PUBLIC_SUPABASE_URL` already covers it; add `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` to the list
  - **`NEXT_PUBLIC_VERCEL_ANALYTICS_ID` must NOT appear in `.env.example`** — Vercel auto-injects this; documenting it as a manual var is incorrect and causes confusion
- The Vercel dashboard has `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` added as environment variables (placeholder values acceptable)
- Preview deployment URL loads the app without a 500 error

**Notes:**
- The PM's original draft listed `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` as an env var to document. This is wrong — Vercel auto-injects it. Do not add it.
- `SUPABASE_SERVICE_KEY` has full database write access and must never appear in Vercel's environment or `.env.local`. The warning in `.env.example` is critical.

**Blocks:** S1-6 (Analytics requires a live Vercel deployment to confirm data receipt). Sprint 2 preview deployments for component testing.

---

## S1-6: Vercel Analytics and Speed Insights

**Goal:** Add Vercel Analytics and Speed Insights to the app so that Gate 1 traffic metrics are tracked from the first production deployment.

**Acceptance Criteria:**
- `@vercel/analytics` and `@vercel/speed-insights` installed as dependencies (`npm install @vercel/analytics @vercel/speed-insights`)
- `<Analytics />` from `@vercel/analytics/react` rendered in `src/app/layout.tsx`
- `<SpeedInsights />` from `@vercel/speed-insights/next` rendered in `src/app/layout.tsx`
- After at least one manual visit to the production URL, the Vercel Analytics dashboard shows incoming page view data
- Vercel Speed Insights tab visible in the dashboard
- Neither component causes a build error or TypeScript error
- Neither component requires manual env var configuration
- In local development, components are present but do not throw errors (they are no-ops locally)

**Notes:**
- Analytics activates automatically when deployed to Vercel — no env var needed. This is why `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` is not in `.env.example`.
- Depends on S1-5 (requires a live Vercel deployment to verify data receipt).
- Without this, the Gate 1 kill/maintain decision at Day 60 is made blind.

**Blocks:** Gate 1 measurement (500 unique visitors in 30 days).

---

## S1-7: GitHub Actions workflow skeleton

**Goal:** Establish the monitoring bot workflow file so GitHub recognizes it, the manual trigger works, and the scaffold is ready for Sprint 6 implementation without structural changes.

**Acceptance Criteria:**
- `.github/workflows/bot.yml` exists with:
  - `on: schedule` with `cron: "0 6 * * *"` (daily at 06:00 UTC)
  - `on: workflow_dispatch` (manual trigger)
  - **No `push` trigger** — a `push` trigger would fire the bot on every code commit, hitting firm websites dozens of times per day during active development
  - Single job named `monitor` with `runs-on: ubuntu-latest`
  - Steps: `actions/checkout@v4` followed by `run: echo "Content monitor placeholder — to be implemented in Sprint 6"`
- Workflow appears in the GitHub Actions tab of the repository
- Triggering via `workflow_dispatch` from GitHub Actions UI completes with a green checkmark
- No secrets are referenced at this stage
- Job name (`monitor`) and step structure are the scaffold Sprint 6 will expand — Sprint 6 replaces the echo step, not the whole structure

**Notes:**
- The PM's original draft included a `push` trigger — this is wrong for a monitoring bot and has been removed.
- The `actions/checkout@v4` step is intentional even though not needed for the echo — it establishes the pattern Sprint 6 inherits and avoids a structural diff.

**Blocks:** Sprint 6 bot implementation.

---

## S1-8: Supabase project setup and auth method decision

**Goal:** Create the Supabase project and document all keys. Resolve the auth method conflict so Sprint 2's `CompareAuthGate` component can be built without ambiguity.

**Acceptance Criteria:**
- Supabase project created on the free tier (no credit card required at v1 volume)
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` copied into `.env.local` (not committed — already in `.gitignore`)
- `SUPABASE_SERVICE_KEY` stored as a GitHub Actions secret (not in `.env.local` or Vercel env vars)
- `.env.example` already has placeholder entries for all three keys (covered in S1-5) — this ticket verifies the real values are available locally
- **Auth method: Google OAuth only** (resolved 2026-03-29 by founder)
- `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` documented in `.env.example` with comment: "Create credentials in Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client ID. Authorized redirect URI: `https://[supabase-project-id].supabase.co/auth/v1/callback`"
- Google OAuth provider enabled in Supabase dashboard (Authentication > Providers > Google) using those credentials
- Decision noted as a comment in `.env.example`
- No Supabase client code exists in the application yet — keys only

**Notes:**
- Auth method resolved: Google OAuth only (2026-03-29). tech-plan Section 3.8 is canonical.
- Google OAuth requires a Google Cloud Console project with an OAuth 2.0 Client ID. The Supabase callback URL (`https://[project-id].supabase.co/auth/v1/callback`) must be added as an authorized redirect URI in the Google Console — this is the step that must happen before Sprint 2 Task 2.10.
- Supabase free tier: 500MB database, 50MB storage. At ~120 bot log rows/month, fine for all of 2026.

**Blocks:** Sprint 2 Task 2.10 (`CompareAuthGate` component). Sprint 5 full auth implementation.

---

## S1-9: Content validation prebuild script

**Goal:** Create a `prebuild` script that validates frontmatter completeness on every `/data` file so broken content is caught at build time, not at runtime.

**Acceptance Criteria:**
- `scripts/validate-content.ts` exists and performs checks on every `.md` file under `/data/firms/**`:
  - `title` is a non-empty string
  - `firm` is a non-empty kebab-case string
  - `category` is one of `cfd | futures`
  - `type` is one of `basic-info | challenge | rules | promo | changelog`
  - `status` is one of `active | inactive | shutdown`
  - `last_verified` is a valid ISO 8601 date string
  - `verified_by` is one of `bot | manual`
  - `sources` is an array with at least one entry (empty array is a validation error)
  - For `type: challenge` files: `challenge_size` is a non-negative number, `price_usd` is a non-negative number
  - For `type: basic-info` files: `website` is a non-empty string
- Script exits with code `1` and logs the specific filename and failing field if any file fails validation
- Script exits with code `0` and logs `"Validation passed: N files checked"` if all files are valid
- `package.json` has `"prebuild": "ts-node --project tsconfig.scripts.json scripts/validate-content.ts"`
- Running `npm run build` on the Sprint 1 scaffold (which has placeholder sources) passes validation
- Introducing a test file with `sources: []` and running `npm run build` produces an error naming that file — then delete the test file
- `ts-node` and `gray-matter` installed as `devDependencies` (use `fast-glob` for file walking, not `glob` v10+ which is ESM-only and breaks with `ts-node`)

**Notes:**
- This is tech-plan Task 1.9 — it was missing from the PM's original draft entirely.
- `gray-matter` may be needed here before Sprint 3 officially installs it — install in `devDependencies` now.
- Use `fast-glob` (CJS-compatible) rather than `glob@10+` (ESM-only, breaks `ts-node`).
- Uses `tsconfig.scripts.json` from S1-1 for `ts-node` execution — S1-1 is a hard dependency.

**Blocks:** Sprint 2 build integrity (`getContentTree.ts` reads the same files — malformed frontmatter is caught before it reaches the server component). Sprint 4 content creation (this script is the automated "done" gate for each content authoring task).

---

## Sprint 1 Dependency Order

```
S1-1 (Next.js init)
  └─ S1-3 (CSS/theme scaffold)
  └─ S1-9 (validate-content script — needs tsconfig.scripts.json from S1-1)
       └─ S1-2 (data scaffold — must pass S1-9 validation before Sprint 1 closes)

S1-4 (LICENSE + README) ← parallel, no code deps
S1-7 (GitHub Actions) ← parallel, no code deps
S1-8 (Supabase setup) ← parallel, no code deps; auth decision blocks Sprint 2

S1-5 (Vercel setup) ← needs S1-1 to have a buildable app
  └─ S1-6 (Analytics — needs live Vercel deployment to verify data)
```

## Sprint 1 Completion Gate

Sprint 1 is done when ALL of the following are true:
- [ ] Vercel preview URL is live and loads without error
- [ ] `/data` folder structure matches the canonical spec exactly with parseable frontmatter on every file
- [ ] `npm run build` passes (including `prebuild` validate-content script — zero validation errors)
- [ ] `LICENSE` exists at repo root (AGPL-3.0) and at `/data/LICENSE` (CC-BY-NC-SA-4.0)
- [ ] `.env.example` documents every required env var
- [ ] GitHub Actions `bot.yml` exists and passes `workflow_dispatch` manually
- [ ] Vercel Analytics dashboard shows at least one real page view
- [ ] Three themes (light/dark/blue) render correctly with no flash on load — verified in the Vercel preview deployment
- [ ] Google OAuth credentials created in Google Cloud Console and enabled in Supabase dashboard
