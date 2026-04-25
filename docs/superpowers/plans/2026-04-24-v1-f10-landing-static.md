# v1-f10 — Landing Page + Static Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first-5-seconds marketing surface: a landing page at `/` (hero + 4 firm cards + disclosure link), three static pages (`/about`, `/disclosure`, `/terms`), and a minimal site header/footer that wraps all four. Restructure the root layout so AppShell (the 3-panel wiki chrome) only applies to the wiki catch-all — decision-tool and marketing routes are AppShell-free.

**Architecture:** Next.js 16 App Router route group `(marketing)` contains landing + 3 static pages, with a shared marketing layout (header + footer). The existing wiki catch-all at `/firms/[...slug]` gets its own nested layout that wraps in AppShell; root layout strips AppShell. Static pages reuse a tiny markdown→HTML pipeline extracted from `src/app/legal/[slug]/page.tsx` (unified + remark-gfm + rehype-sanitize). FirmCardGrid from v1-f9 is reused verbatim on the landing.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, `gray-matter`, `unified`/`remark-parse`/`remark-gfm`/`remark-rehype`/`rehype-sanitize`/`rehype-external-links`/`rehype-stringify`, vitest (`environment: node`) for the static-page helper.

---

## Spec traceability

- **Spec §2 decision #6** — "Marketing-style landing page at `/`. Not the Obsidian wiki." v1-f10 delivers `/` + site chrome.
- **Spec §3.1 routes** — `/`, `/about`, `/disclosure`, `/terms` all new in v1.
- **Spec §4.1 pages** — LandingPage (`app/page.tsx` in spec; implemented as `app/(marketing)/page.tsx` due to route-group grouping), DisclosurePage, About, Terms.
- **Spec §4.2 Hero component** — `{}` props, headline + subhead + "Browse firms" CTA.
- **Spec §4.3 reused** — FirmCardGrid + FirmCard from v1-f9; ThemeProvider + theme tokens from existing globals.
- **Root-layout handoff from v1-f9 index memory** — "likely needs a `(marketing)` route group with its own layout that skips the 3-panel AppShell." Task 1 restructures.

---

## v1-f9 handoff notes applied

From `/Users/lego/.claude/projects/-Users-lego--Lego651-open-prop-firm/memory/project_v1_progress.md`:

1. **`(marketing)` route group + layout split.** Root strips AppShell; `firms/[...slug]/layout.tsx` re-adds AppShell only for the wiki catch-all. This is the minimum diff that ships v1-f10's landing with the right chrome without breaking the wiki.
2. **Reuse FirmCardGrid verbatim.** No `{ limit }` option added in v1-f10 — we show all 4 launch firms on the landing. Revisit only if the design calls for "top 3".
3. **`pickTopFitRow`** stays inside `FirmCard.tsx` in v1-f10 — no new external consumer yet.
4. **`server-only` test mock** — `test/mocks/empty.js` extraction is a nice-to-have; OUT OF SCOPE for v1-f10. Current vitest config works against the existing Next-internal path.
5. **Static-page pipeline** — the unified-pipeline in `src/app/legal/[slug]/page.tsx` is the pattern to copy. Factor to a shared helper so new static routes don't duplicate the 7-plugin chain.

---

## Architecture diagram — route + layout tree after v1-f10

```
src/app/
├── layout.tsx                       ← STRIPPED of AppShell (root shell only)
│                                       keeps: html/body/providers/Analytics/SpeedInsights
│
├── (marketing)/                     ← NEW route group (affects layout only, not URL)
│   ├── layout.tsx                   ← NEW marketing chrome (SiteHeader + children + SiteFooter)
│   ├── page.tsx                     ← NEW — landing /
│   ├── about/page.tsx               ← NEW
│   ├── disclosure/page.tsx          ← NEW
│   └── terms/page.tsx               ← NEW
│
├── firms/
│   ├── page.tsx                     ← v1-f9 (UNTOUCHED) — renders without AppShell after root strip
│   ├── [slug]/page.tsx              ← v1-f9 (UNTOUCHED) — renders without AppShell after root strip
│   └── [...slug]/                   ← wiki catch-all
│       ├── layout.tsx               ← NEW — wraps in AppShell (moves the tree-fetch here)
│       └── page.tsx                 ← UNTOUCHED
│
├── legal/[slug]/page.tsx            ← UNTOUCHED (no AppShell after strip; page already uses `prose` classes, fine)
├── admin/page.tsx                   ← UNTOUCHED (no AppShell after strip)
├── auth/                            ← UNTOUCHED (has own auth/layout.tsx)
└── not-found.tsx                    ← UNTOUCHED
```

**URL table (after v1-f10):**

| URL | File | Chrome |
|---|---|---|
| `/` | `(marketing)/page.tsx` | SiteHeader + SiteFooter |
| `/about` | `(marketing)/about/page.tsx` | SiteHeader + SiteFooter |
| `/disclosure` | `(marketing)/disclosure/page.tsx` | SiteHeader + SiteFooter |
| `/terms` | `(marketing)/terms/page.tsx` | SiteHeader + SiteFooter |
| `/firms` | `firms/page.tsx` (v1-f9) | none (bare article) |
| `/firms/funding-pips` | `firms/[slug]/page.tsx` (v1-f9) | none (bare article) |
| `/firms/cfd/funding-pips/rules` | `firms/[...slug]/page.tsx` (wiki) | AppShell |
| `/legal/terms-of-service` | `legal/[slug]/page.tsx` | none (bare article) |

No URL conflicts — route groups don't affect URLs, and `(marketing)/page.tsx` produces `/` (no sibling `page.tsx` at app root today).

---

## Testing strategy

- **`loadStaticPage` helper** — vitest with `environment: node`. Assert: (a) returns `{ title, htmlContent }` for each valid slug, (b) throws/returns null for unknown slugs, (c) htmlContent is non-empty string.
- **Pages** — no unit tests (no jsdom; matches v1-f9 pattern). Validation via `pnpm build` static prerender.
- **Hero component** — no unit tests; rendered at build time on the landing.
- **Smoke test** — manual `pnpm dev` walkthrough of all 4 URLs + re-verify wiki at `/firms/cfd/funding-pips` still renders with AppShell.

---

## File structure

**New files:**

Marketing group:
- `src/app/(marketing)/layout.tsx`
- `src/app/(marketing)/page.tsx`
- `src/app/(marketing)/about/page.tsx`
- `src/app/(marketing)/disclosure/page.tsx`
- `src/app/(marketing)/terms/page.tsx`

Components:
- `src/components/marketing/Hero.tsx`
- `src/components/marketing/SiteHeader.tsx`
- `src/components/marketing/SiteFooter.tsx`

Helper:
- `src/lib/content/static.ts`
- `src/lib/content/static.test.ts`

Wiki layout (moves AppShell here):
- `src/app/firms/[...slug]/layout.tsx`

Content:
- `data/static/about.md`
- `data/static/disclosure.md`
- `data/static/terms.md`

**Modified files:**
- `src/app/layout.tsx` — remove AppShell + SearchProvider + `getContentTree` call.

**Untouched:**
- `src/app/firms/page.tsx`, `src/app/firms/[slug]/page.tsx` — v1-f9, kept.
- `src/app/firms/[...slug]/page.tsx` — wiki catch-all, kept.
- `src/app/legal/[slug]/page.tsx` — kept; its own markdown pipeline stays standalone.
- All v1-f7/f8/f9 components under `src/components/firm/`.
- `src/components/layout/AppShell.tsx` — kept, only its mount point moves.

**No new npm deps.** All markdown libs already present from `legal/[slug]/page.tsx`.

---

## Locked type contracts

```ts
// src/lib/content/static.ts
export interface StaticPage {
  slug: string                  // "about" | "disclosure" | "terms"
  title: string                 // from frontmatter
  htmlContent: string           // rendered HTML body, sanitized
}

export const STATIC_PAGE_SLUGS = ['about', 'disclosure', 'terms'] as const
export type StaticPageSlug = (typeof STATIC_PAGE_SLUGS)[number]

export async function loadStaticPage(
  slug: StaticPageSlug,
  opts?: { rootDir?: string },
): Promise<StaticPage>
```

Shared by all three static-page routes; helper throws (not returns null) on missing file because the three slugs are enumerated and a missing file is a build-time authoring bug, not a 404 case.

---

## Task 1: Root layout restructure — move AppShell to wiki catch-all

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/firms/[...slug]/layout.tsx`

### Rationale

Root layout currently wraps every page in `<AppShell>`. After v1-f10, only the wiki catch-all at `/firms/[...slug]` needs AppShell (3-panel Obsidian chrome). All other routes — landing, static, firm decision pages, legal, admin, auth — should render without it. The minimal diff: strip from root, add a nested layout at the wiki path.

### Step 1 — Rewrite `src/app/layout.tsx`

Target content (full file replacement):

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openpropfirm.com',
  ),
  title: {
    default: 'OpenPropFirm',
    template: '%s — OpenPropFirm',
  },
  description:
    'Pre-trade decision tool for prop firm traders. Compare challenges, rules, and fit across top prop trading firms.',
  openGraph: {
    title: 'OpenPropFirm',
    description:
      'Pre-trade decision tool for prop firm traders. Compare challenges, rules, and fit across top prop trading firms.',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openpropfirm.com',
    siteName: 'OpenPropFirm',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'OpenPropFirm' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenPropFirm',
    description:
      'Pre-trade decision tool for prop firm traders.',
    images: ['/og.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}}());`,
          }}
        />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

Changes vs current:
- Dropped: `AppShell`, `SearchProvider`, `getContentTree()` call, `async` on the function (no fetches left).
- Kept: `Inter` font, metadata, `html`/`body`, theme-restore inline script, `TooltipProvider`, Analytics, SpeedInsights.
- The description + OG text was adjusted from "information hub" wording to the decision-tool wording from the spec. Same length.

### Step 2 — Create `src/app/firms/[...slug]/layout.tsx`

This adds AppShell + SearchProvider back for the wiki catch-all ONLY.

```tsx
import { SearchProvider } from '@/contexts/SearchContext'
import { getContentTree } from '@/lib/content/getContentTree'
import AppShell from '@/components/layout/AppShell'

export default async function WikiLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { treeData } = await getContentTree()

  return (
    <SearchProvider>
      <AppShell treeData={treeData}>{children}</AppShell>
    </SearchProvider>
  )
}
```

### Step 3 — Type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm build
```

Expected: clean. Build log should show `/firms/cfd/funding-pips`, `/firms/cfd/funding-pips/rules`, etc. prerender successfully (wiki catch-all still works). `/firms` + `/firms/funding-pips` still prerender (v1-f9).

### Step 4 — Manual smoke test

```bash
pnpm dev
```

Open in browser:
- http://localhost:3000/firms/cfd/funding-pips — expect Obsidian 3-panel layout (sidebar file tree + content + optional graph). If sidebar is missing, the wiki layout didn't mount correctly.
- http://localhost:3000/firms — expect bare v1-f9 firm index (no sidebar).
- http://localhost:3000/firms/funding-pips — expect bare v1-f9 decision page (no sidebar).
- http://localhost:3000/ — expect Next.js default not-found (no landing yet; that's Task 5).
- http://localhost:3000/legal/terms-of-service — expect prose-formatted legal page (no sidebar).

If the wiki loses its sidebar, STOP and inspect `src/app/firms/[...slug]/layout.tsx` file location — it must be `[...slug]/layout.tsx` not `[slug]/layout.tsx`.

### Step 5 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git checkout -b feat/v1-f10-landing-static
git add src/app/layout.tsx src/app/firms/\[...slug\]/layout.tsx
git commit -m "$(cat <<'EOF'
[s1] feat: v1-f10 strip AppShell from root, scope to wiki catch-all

Root layout now renders only html/body/providers. Wiki chrome (3-panel
AppShell + SearchProvider + getContentTree) moves to a nested layout at
src/app/firms/[...slug]/layout.tsx — so only the Obsidian-shaped wiki
URLs (/firms/cfd/funding-pips, /firms/cfd/funding-pips/rules, etc.) get
the 3-panel shell. Decision-tool pages (/firms, /firms/[slug]) and the
forthcoming marketing routes render bare, matching spec §3.1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Static-page helper + tests

**Files:**
- Create: `src/lib/content/static.ts`
- Create: `src/lib/content/static.test.ts`
- Create: `data/static/about.md` (placeholder — real content in Task 3)
- Create: `data/static/disclosure.md` (placeholder)
- Create: `data/static/terms.md` (placeholder)

### Step 1 — Seed minimal fixture content so tests have real data

Create `data/static/about.md`:

```md
---
title: 'About'
---

# About

Placeholder — replaced in Task 3.
```

Create `data/static/disclosure.md`:

```md
---
title: 'Disclosure'
---

# Disclosure

Placeholder — replaced in Task 3.
```

Create `data/static/terms.md`:

```md
---
title: 'Terms'
---

# Terms

Placeholder — replaced in Task 3.
```

### Step 2 — Write failing tests

Create `src/lib/content/static.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import path from 'path'
import { loadStaticPage, STATIC_PAGE_SLUGS } from './static'

const REAL_DATA = path.join(process.cwd(), 'data', 'static')

describe('loadStaticPage', () => {
  it('loads each of the 3 static slugs', async () => {
    for (const slug of STATIC_PAGE_SLUGS) {
      const page = await loadStaticPage(slug, { rootDir: REAL_DATA })
      expect(page.slug).toBe(slug)
      expect(page.title.length).toBeGreaterThan(0)
      expect(page.htmlContent.length).toBeGreaterThan(0)
      // sanity: rendered HTML should contain an <h1> (each fixture has one)
      expect(page.htmlContent).toMatch(/<h1>/i)
    }
  })

  it('exposes title from frontmatter, not slug', async () => {
    const page = await loadStaticPage('about', { rootDir: REAL_DATA })
    expect(page.title).toBe('About')
  })

  it('throws a clear error if the file is missing', async () => {
    await expect(
      loadStaticPage('about', { rootDir: path.join(process.cwd(), 'no-such-dir') }),
    ).rejects.toThrow(/static page/i)
  })

  it('STATIC_PAGE_SLUGS is the spec-required triple', () => {
    expect(STATIC_PAGE_SLUGS).toEqual(['about', 'disclosure', 'terms'])
  })
})
```

Run: `pnpm test -- static` — expect failures ("Cannot find module './static'").

### Step 3 — Implement helper

Create `src/lib/content/static.ts`:

```ts
import 'server-only'
import { readFile } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeStringify from 'rehype-stringify'

export const STATIC_PAGE_SLUGS = ['about', 'disclosure', 'terms'] as const
export type StaticPageSlug = (typeof STATIC_PAGE_SLUGS)[number]

export interface StaticPage {
  slug: StaticPageSlug
  title: string
  htmlContent: string
}

export interface LoadStaticPageOptions {
  rootDir?: string
}

function defaultRoot(): string {
  return path.join(process.cwd(), 'data', 'static')
}

export async function loadStaticPage(
  slug: StaticPageSlug,
  opts: LoadStaticPageOptions = {},
): Promise<StaticPage> {
  const root = opts.rootDir ?? defaultRoot()
  const filePath = path.join(root, `${slug}.md`)
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch (err) {
    throw new Error(
      `[static] static page not found: ${slug} at ${filePath} (${(err as Error).message})`,
    )
  }
  const { data, content } = matter(raw)
  const title = typeof data.title === 'string' && data.title.length > 0
    ? data.title
    : slug.charAt(0).toUpperCase() + slug.slice(1)
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] })
    .use(rehypeStringify)
    .process(content)
  return { slug, title, htmlContent: String(file) }
}
```

### Step 4 — Run tests

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm test -- static
pnpm tsc --noEmit
```

All 4 tests pass. tsc clean.

### Step 5 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/lib/content/static.ts src/lib/content/static.test.ts data/static/about.md data/static/disclosure.md data/static/terms.md
git commit -m "$(cat <<'EOF'
[s1] feat: v1-f10 static-page helper + placeholder fixtures

New loadStaticPage(slug) helper that reads data/static/<slug>.md and
returns {slug, title, htmlContent} using the same unified pipeline as
/legal/[slug] (remark-parse → remark-gfm → remark-rehype → sanitize →
external-links → stringify). Throws on missing file — the 3 slugs are
enumerated and a missing file is a build-time authoring bug, not a 404.
Placeholder markdown fixtures seeded; real content in a follow-up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Author real static-page content

**Files:**
- Modify: `data/static/about.md`
- Modify: `data/static/disclosure.md`
- Modify: `data/static/terms.md`

### Step 1 — `data/static/about.md` (full content)

Replace the Task 2 placeholder with:

```md
---
title: 'About OpenPropFirm'
---

# About OpenPropFirm

OpenPropFirm is a pre-trade decision tool for prop firm traders. One page, five seconds, answers the only question that matters: should I trade this firm today, and how do I avoid blowing the account?

## Why this exists

The prop firm space changes fast — drawdown rules, payout policies, and pricing shift without much warning. Most resources lag by weeks, or bury the current rules behind marketing copy. When a trader blows an account on stale information, no one is held accountable.

OpenPropFirm exists to close that gap with three things working together:

1. **Sourced data.** Every claim about a firm's rules links to the source page that was consulted, with a timestamp for when it was last verified.
2. **A daily monitoring bot.** The source pages are re-fetched daily. When a watched field changes, a pull request opens with a before/after diff. The bot is the reason the data stays honest.
3. **Labeled opinion.** Separate from the data, a "Kill You First" list and Fit Score offer a trader's read on each firm. These are opinion — always labeled, never mixed with the data.

## Who runs it

OpenPropFirm is built and maintained by a single trader who trades all four launch firms (Funded Next, Funding Pips, Apex Trader Funding, Lucid Trading). The opinion layer on every firm page is authored first-hand, not outsourced.

## How it's monetized

Affiliate links only. If you decide to fund an account with a firm we cover, you may click a disclosed affiliate link and the site earns a small referral. There is no paid tier, no gated content, no commissioned reviews, no B2B verified-firm badges. Ever. Trust is the asset; anything that compromises it is off the table.

More detail on how that works lives on the [disclosure page](/disclosure).

## Open source

The site and its data are published under open-source licenses on GitHub. Code is AGPL-3.0; data is CC-BY-NC-SA-4.0. The monitoring bot, the firm frontmatter, and the page components are all public. Pull requests welcome.

- Repo: [github.com/lego651/open-prop-firm](https://github.com/lego651/open-prop-firm)
- Issue tracker: same repo's issues tab
- Contact: `hello@openpropfirm.com`
```

### Step 2 — `data/static/disclosure.md` (full content)

Replace the Task 2 placeholder with:

```md
---
title: 'Disclosure & Sourcing Policy'
---

# Disclosure & Sourcing Policy

_Last updated: April 2026_

## Affiliate relationships

Some firms on this site have affiliate programs. When we have an active affiliate link to a firm, the Action zone on that firm's page shows an affiliate button, labeled as such. If you click the button and sign up for a funded challenge, OpenPropFirm may earn a referral fee from that firm at no additional cost to you.

**Firms without affiliate programs are listed with equal prominence.** Snapshot, rule breakdown, Kill You First, Fit Score, and Pre-Trade Checklist are written and shown the same way whether we earn a referral or not. Affiliate relationships do not and will not influence:

- Which firms appear on the site
- The order firms appear in the firm index
- The content of any Snapshot Bar, Kill You First entry, or Fit Score rating
- The changelog or verification badge

If a firm pays us and we don't like the rules, we still say we don't like the rules.

## Sourcing

Every field in the Snapshot Bar and Rule Breakdown traces back to a source URL on the firm's own site — the rules page, the help center, or the official FAQ. Those source URLs appear on each firm page and are checked daily by an automated bot. When a source page changes in a way that affects a watched field, a pull request is opened with the before/after diff, reviewed, and merged. Every merge appends a changelog entry.

The `last_verified` badge on every firm page shows when the source pages were last successfully checked. A stale badge (>7 days) surfaces an amber warning.

## What we do NOT accept

- Payment to list a firm, boost its ranking, or suppress negative information
- "Verified firm" fees from prop firms
- Sponsored reviews or commissioned content
- Subscription fees from readers

All revenue flows from affiliate referrals only.

## What we cannot guarantee

The daily bot catches changes when firms update their own public pages. It does not catch:

- Rule changes communicated only by email to existing challenge holders
- Rule changes phrased in ways the scraper can't parse (e.g. a PDF)
- Violations of posted rules enforced selectively

Always verify the critical rules on the firm's own site before funding an account. The decision tool is a pre-trade aid, not a substitute for reading the firm's terms.

## Questions

Open an issue on [GitHub](https://github.com/lego651/open-prop-firm) or email `hello@openpropfirm.com`.
```

### Step 3 — `data/static/terms.md` (full content — merges existing ToS + Disclaimer)

Replace the Task 2 placeholder with:

```md
---
title: 'Terms of Service & Disclaimer'
---

# Terms of Service & Disclaimer

_Last updated: April 2026_

## 1. Acceptance

By accessing or using OpenPropFirm ("the Site"), you agree to these Terms of Service. If you do not agree, do not use the Site.

## 2. Nature of the content

OpenPropFirm is an independent, community-maintained pre-trade decision tool for prop firm traders. The Site describes third-party proprietary trading evaluation firms ("prop firms"). We are not affiliated with, endorsed by, or sponsored by any prop firm unless explicitly stated, and any affiliate relationships are disclosed on the [disclosure page](/disclosure).

**All information is provided for informational purposes only.** Nothing on this Site constitutes financial, investment, trading, or legal advice. Prop firm evaluation programs involve real financial risk — you may lose fees paid to a firm, and you may blow an account even while following every rule correctly. Do your own research before committing funds.

**Always consult a qualified financial professional before making investment or trading decisions.**

## 3. Content accuracy

We make reasonable efforts to keep information accurate using an [automated monitoring bot](https://github.com/lego651/open-prop-firm) that re-checks source pages daily. The `last_verified` timestamp on every firm page reflects when that firm's sources were last successfully checked.

However:

- Prop firm rules, fees, and programs change frequently.
- The `last_verified` timestamp indicates when content was reviewed — it does not guarantee current accuracy.
- Challenge parameters (drawdown limits, profit targets, fees, consistency rules, news trading policies) should always be independently verified on the firm's official website before you purchase or trade.

We make no representations or warranties, express or implied, about the completeness, accuracy, reliability, or suitability of any information on this Site.

## 4. Affiliate relationships

Some firm pages link to affiliate programs. When active, these links are disclosed on the affected page and in our [disclosure policy](/disclosure). Affiliate relationships do not influence editorial content.

## 5. Intellectual property

The Site's source code is licensed under [AGPL-3.0](https://github.com/lego651/open-prop-firm/blob/main/LICENSE). The prop firm content is licensed under [CC-BY-NC-SA-4.0](https://github.com/lego651/open-prop-firm/blob/main/data/LICENSE). Commercial use of either requires a separate license — contact `commercial@openpropfirm.com`.

## 6. Prohibited use

You may not use this Site to:

- Scrape content for commercial products without a commercial license
- Impersonate another person or entity
- Introduce malware or attempt to gain unauthorized access to our systems
- Violate any applicable law

## 7. Third-party links

This Site contains links to third-party websites, including prop firm official sites. These are provided for convenience. We have no control over the content of those sites and accept no responsibility for them.

## 8. Disclaimer of warranties

The Site is provided "as is" without warranty of any kind. We make no guarantees that the Site will be uninterrupted, error-free, or that information will be accurate or complete.

## 9. Limitation of liability

To the fullest extent permitted by applicable law, OpenPropFirm and its contributors shall not be liable for any loss or damage — including financial loss — arising from your use of or reliance on the Site.

## 10. Changes to these terms

We may update these terms at any time. Continued use of the Site after changes constitutes acceptance of the revised terms.

## 11. Contact

Questions? Open an issue on [GitHub](https://github.com/lego651/open-prop-firm) or email `hello@openpropfirm.com`.
```

### Step 4 — Re-run static tests

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm test -- static
```

All 4 tests still pass. The test that asserts `<h1>` in htmlContent continues to pass (each real file has an H1).

### Step 5 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add data/static/about.md data/static/disclosure.md data/static/terms.md
git commit -m "$(cat <<'EOF'
[s1] feat: v1-f10 static page content (about, disclosure, terms)

Real copy for the 3 static pages. /about describes the project and
maintainer. /disclosure lays out the affiliate + sourcing policy per
spec §2 and the CEO-locked "affiliate-only, never firm-paid" stance.
/terms merges the existing data/legal ToS + disclaimer into a single
policy page reachable from the footer. Existing data/legal/* files
retained for now — the /legal/[slug] route still serves them; a
follow-up may redirect or remove.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: SiteHeader + SiteFooter components

**Files:**
- Create: `src/components/marketing/SiteHeader.tsx`
- Create: `src/components/marketing/SiteFooter.tsx`

### SiteHeader contract + spec

- Top-of-page horizontal bar: logo/wordmark on left, nav links on right.
- Nav links: `Firms` → `/firms`, `About` → `/about`, `Disclosure` → `/disclosure`.
- Sticky on scroll (`sticky top-0`) with a subtle bottom border.
- No interactivity beyond links — plain server component.
- Max width aligns with page content (`max-w-5xl` padded).

### Step 1 — Write `src/components/marketing/SiteHeader.tsx`

```tsx
import Link from 'next/link'

const NAV_LINKS = [
  { href: '/firms', label: 'Firms' },
  { href: '/about', label: 'About' },
  { href: '/disclosure', label: 'Disclosure' },
] as const

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          OpenPropFirm
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
```

### SiteFooter contract + spec

- Bottom-of-page horizontal bar.
- Left: affiliate disclosure line ("Some links are affiliate links — see Disclosure.").
- Right: links to `/terms`, `/disclosure`, GitHub repo (`https://github.com/lego651/open-prop-firm`).
- Muted foreground text, top border, same max width as header.

### Step 2 — Write `src/components/marketing/SiteFooter.tsx`

```tsx
import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/terms', label: 'Terms' },
  { href: '/disclosure', label: 'Disclosure' },
  { href: 'https://github.com/lego651/open-prop-firm', label: 'GitHub', external: true },
] as const

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-6 text-xs text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Some links are affiliate links —{' '}
          <Link href="/disclosure" className="underline hover:text-[var(--foreground)]">
            see Disclosure
          </Link>
          .
        </p>
        <ul className="flex flex-wrap items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <li key={link.href}>
              {'external' in link && link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--foreground)]"
                >
                  {link.label}
                </a>
              ) : (
                <Link href={link.href} className="hover:text-[var(--foreground)]">
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
```

### Step 3 — Type check

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
```

Clean.

### Step 4 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/components/marketing/SiteHeader.tsx src/components/marketing/SiteFooter.tsx
git commit -m "$(cat <<'EOF'
[s1] feat: v1-f10 SiteHeader + SiteFooter

Shared chrome for the (marketing) route group. Header: sticky bar with
wordmark + Firms/About/Disclosure nav. Footer: affiliate-disclosure
micro-copy + Terms/Disclosure/GitHub links. Both pure server components,
no interactivity, aligned to max-w-5xl.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Marketing route-group layout

**Files:**
- Create: `src/app/(marketing)/layout.tsx`

### Step 1 — Write `src/app/(marketing)/layout.tsx`

```tsx
import { SiteHeader } from '@/components/marketing/SiteHeader'
import { SiteFooter } from '@/components/marketing/SiteFooter'

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
```

### Step 2 — Type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm build
```

Clean. The layout alone produces no new routes.

### Step 3 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/app/\(marketing\)/layout.tsx
git commit -m "$(cat <<'EOF'
[s1] feat: v1-f10 (marketing) route-group layout

Wraps landing + about + disclosure + terms in SiteHeader + SiteFooter.
Route groups don't affect URLs — (marketing)/page.tsx produces /,
(marketing)/about/page.tsx produces /about, etc. Bare flex column with
min-h-screen so the footer sticks to viewport bottom on short pages.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Hero component

**Files:**
- Create: `src/components/marketing/Hero.tsx`

### Contract + spec

- Big headline: "The pre-trade decision page for prop firm traders."
- Subhead: "Sourced rules, monitored daily. Labeled opinion from someone who trades all four. One page, five seconds."
- Primary CTA: "Browse firms" → `/firms`.
- Secondary link: "Read the disclosure" → `/disclosure`.
- Centered, generous vertical padding.

### Step 1 — Write `src/components/marketing/Hero.tsx`

```tsx
import Link from 'next/link'

export function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
        The pre-trade decision page for prop firm traders.
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--muted-foreground)] sm:text-lg">
        Sourced rules, monitored daily. Labeled opinion from someone who trades all four.
        One page, five seconds.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/firms"
          className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          Browse firms
        </Link>
        <Link
          href="/disclosure"
          className="text-sm text-[var(--muted-foreground)] underline-offset-4 hover:underline hover:text-[var(--foreground)]"
        >
          Read the disclosure →
        </Link>
      </div>
    </section>
  )
}
```

### Step 2 — Type check

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
```

Clean.

### Step 3 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/components/marketing/Hero.tsx
git commit -m "$(cat <<'EOF'
[s1] feat: v1-f10 Hero component

Landing hero: headline + subhead + "Browse firms" primary CTA +
"Read the disclosure" secondary link. Centered, max-w-3xl, generous
vertical padding. Pure server component.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Landing page (`/`)

**Files:**
- Create: `src/app/(marketing)/page.tsx`

### Composition

1. `<Hero />`
2. Section heading: "Firms we cover" + one-line subtitle
3. `<FirmCardGrid firms={firms} />` (from v1-f9)
4. Small footer blurb linking to `/disclosure` + "Clone to Obsidian" linking to the GitHub repo

### Step 1 — Write `src/app/(marketing)/page.tsx`

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { listFirms } from '@/lib/firms/repository'
import { FirmCardGrid } from '@/components/firm/FirmCardGrid'
import { Hero } from '@/components/marketing/Hero'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'OpenPropFirm — the pre-trade decision page for prop firm traders',
  description:
    'Sourced rules, monitored daily. Labeled opinion from a founder who trades all four firms. One page, five seconds — should you trade this firm today?',
}

export default async function LandingPage() {
  const firms = await listFirms()

  return (
    <>
      <Hero />

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <header className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Firms we cover</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Each firm has a sourced snapshot, a "Kill You First" warning list, a fit score,
            and an interactive pre-trade checklist.
          </p>
        </header>
        <FirmCardGrid firms={firms} />

        <p className="mt-10 text-sm text-[var(--muted-foreground)]">
          Affiliate links are disclosed on each firm page and in the{' '}
          <Link href="/disclosure" className="underline hover:text-[var(--foreground)]">
            disclosure policy
          </Link>
          . The site is open source —{' '}
          <a
            href="https://github.com/lego651/open-prop-firm"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--foreground)]"
          >
            clone it to Obsidian
          </a>
          .
        </p>
      </section>
    </>
  )
}
```

### Step 2 — Type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm build
```

Expected: build log shows `/` prerenders. All v1-f9 routes still prerender. Wiki catch-all still prerenders.

### Step 3 — Manual smoke

```bash
pnpm dev
```

Open http://localhost:3000/ — expect:
- Sticky header with wordmark + Firms/About/Disclosure.
- Hero with headline, subhead, Browse firms CTA, Read the disclosure link.
- "Firms we cover" section with a 1/2/3-column grid of 4 cards (verify all 4 render with chips + best-for line).
- Clone-to-Obsidian blurb below grid.
- Footer with affiliate disclosure + Terms/Disclosure/GitHub links.

Click "Browse firms" → should land on `/firms` (v1-f9 index, no SiteHeader/SiteFooter — they only wrap `(marketing)` routes).

Note: /firms and /firms/[slug] do NOT get the SiteHeader/SiteFooter in v1-f10 scope. That's an intentional boundary — adding site chrome to the decision-tool pages requires more design work (Decision Header already occupies the top of those pages). Keep v1-f10 minimal.

### Step 4 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/app/\(marketing\)/page.tsx
git commit -m "$(cat <<'EOF'
[s1] feat: v1-f10 landing page at /

Hero + "Firms we cover" section reusing FirmCardGrid from v1-f9 +
clone-to-Obsidian + disclosure blurb. Static, generateStaticParams
not needed (single route). Renders inside the (marketing) layout
so SiteHeader + SiteFooter wrap it automatically.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Static page routes (`/about`, `/disclosure`, `/terms`)

**Files:**
- Create: `src/app/(marketing)/about/page.tsx`
- Create: `src/app/(marketing)/disclosure/page.tsx`
- Create: `src/app/(marketing)/terms/page.tsx`

Each follows the same shape. Define a tiny inline render helper inline on each page rather than extracting a shared `StaticPageView` component — three 15-line files are easier to read than a shared component + three 3-line files.

### Step 1 — Write `src/app/(marketing)/about/page.tsx`

```tsx
import type { Metadata } from 'next'
import { loadStaticPage } from '@/lib/content/static'

export const dynamic = 'force-static'

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('about')
  return { title: page.title }
}

export default async function AboutPage() {
  const page = await loadStaticPage('about')
  return (
    <article className="prose prose-sm prose-invert mx-auto max-w-3xl px-6 py-10">
      <div dangerouslySetInnerHTML={{ __html: page.htmlContent }} />
    </article>
  )
}
```

### Step 2 — Write `src/app/(marketing)/disclosure/page.tsx`

Identical shape, swap `'about'` → `'disclosure'`:

```tsx
import type { Metadata } from 'next'
import { loadStaticPage } from '@/lib/content/static'

export const dynamic = 'force-static'

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('disclosure')
  return { title: page.title }
}

export default async function DisclosurePage() {
  const page = await loadStaticPage('disclosure')
  return (
    <article className="prose prose-sm prose-invert mx-auto max-w-3xl px-6 py-10">
      <div dangerouslySetInnerHTML={{ __html: page.htmlContent }} />
    </article>
  )
}
```

### Step 3 — Write `src/app/(marketing)/terms/page.tsx`

Identical shape, swap `'about'` → `'terms'`:

```tsx
import type { Metadata } from 'next'
import { loadStaticPage } from '@/lib/content/static'

export const dynamic = 'force-static'

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('terms')
  return { title: page.title }
}

export default async function TermsPage() {
  const page = await loadStaticPage('terms')
  return (
    <article className="prose prose-sm prose-invert mx-auto max-w-3xl px-6 py-10">
      <div dangerouslySetInnerHTML={{ __html: page.htmlContent }} />
    </article>
  )
}
```

### Step 4 — Type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm build
```

Expected: build log shows `/about`, `/disclosure`, `/terms` prerender in addition to `/`, `/firms`, 4 firm detail pages, wiki catch-all pages.

### Step 5 — Manual smoke

```bash
pnpm dev
```

Open each URL:
- http://localhost:3000/about — header + prose content + footer.
- http://localhost:3000/disclosure — same shape.
- http://localhost:3000/terms — same shape.

Scroll to footer on each; "Terms" and "Disclosure" links work.

Click "Firms" in header → `/firms` (v1-f9).

### Step 6 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/app/\(marketing\)/about/page.tsx src/app/\(marketing\)/disclosure/page.tsx src/app/\(marketing\)/terms/page.tsx
git commit -m "$(cat <<'EOF'
[s1] feat: v1-f10 static pages /about /disclosure /terms

Three thin routes, each 15 lines: loadStaticPage(slug), render the
htmlContent inside a prose article. Static, no generateStaticParams
(single pages). Metadata pulls title from the markdown frontmatter.
All three sit inside the (marketing) layout and get SiteHeader + SiteFooter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Full validation + merge to main

### Step 1 — Full test + type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm test
pnpm build
```

Expected:
- `tsc`: clean.
- `test`: previous count + 4 new static tests. (Count should be previous + 4, plus or minus.)
- `build`: all routes prerender. Spot-check the build log for these lines:
  - `/` (landing)
  - `/about`, `/disclosure`, `/terms`
  - `/firms`
  - `/firms/funding-pips`, `/firms/funded-next`, `/firms/apex-funding`, `/firms/lucid-trading`
  - Wiki catch-all routes under `/firms/cfd/<slug>` and `/firms/futures/<slug>`
  - `/legal/terms-of-service`, `/legal/disclaimer`

### Step 2 — Manual smoke (golden path)

```bash
pnpm dev
```

Walk:
1. `/` — hero, grid, footer. Click "Browse firms".
2. `/firms` — v1-f9 grid, no site chrome (intentional). Click first card.
3. `/firms/funding-pips` — v1-f9 decision page, three-layer composition. Use browser back.
4. `/firms` → click "Disclosure" by typing URL → `/disclosure`. Header + prose.
5. `/` → header nav "About" → `/about`.
6. `/` → footer "Terms" → `/terms`.
7. `/firms/cfd/funding-pips` (wiki URL) — expect 3-panel AppShell. Sidebar, content, optional graph.
8. `/firms/cfd/funding-pips/rules` — still wiki, still AppShell.
9. `/legal/terms-of-service` — prose page, no site chrome (acceptable — it's the old route; new `/terms` is the canonical one).
10. `/does-not-exist` — not-found page renders (no AppShell, no site chrome — acceptable for v1).

### Step 3 — Lint check (if project uses ESLint)

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm lint 2>/dev/null || true
```

If lint config exists and passes, good. If the project has no `lint` script, skip.

### Step 4 — Commit the plan doc

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add docs/superpowers/plans/2026-04-24-v1-f10-landing-static.md
git commit -m "$(cat <<'EOF'
[s1] docs: v1-f10 plan

Reference artifact kept alongside v1-f1..f9 plans.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 5 — Fast-forward merge to main + push

Per Jason's 2026-04-23 directive — no PR.

```bash
cd /Users/lego/@Lego651/open-prop-firm
git checkout main
git pull --ff-only origin main
git merge --ff-only feat/v1-f10-landing-static
git push origin main
```

If `--ff-only` fails (main moved):

```bash
git checkout feat/v1-f10-landing-static
git rebase origin/main
git checkout main
git merge --ff-only feat/v1-f10-landing-static
git push origin main
```

### Step 6 — Delete the feature branch

```bash
cd /Users/lego/@Lego651/open-prop-firm
git branch -d feat/v1-f10-landing-static
git push origin --delete feat/v1-f10-landing-static 2>/dev/null || true
```

### Step 7 — Update the v1 progress memory

Edit `/Users/lego/.claude/projects/-Users-lego--Lego651-open-prop-firm/memory/project_v1_progress.md`:

Under **Shipped:**, add a v1-f10 entry after v1-f9 with the final SHA on main:

```
- v1-f10 — Landing page (`/`) + static pages (`/about`, `/disclosure`, `/terms`). Root layout stripped of AppShell; AppShell moved to `src/app/firms/[...slug]/layout.tsx` for wiki-only chrome. New `(marketing)` route group with `SiteHeader` + `SiteFooter` wraps landing + 3 static routes. Hero component. Reused FirmCardGrid verbatim. Shared `loadStaticPage(slug)` helper in `src/lib/content/static.ts` reads `data/static/<slug>.md` via the same unified pipeline as `/legal/[slug]`. 4 new vitest cases. (2026-04-24, direct-to-main, final commit <FILL IN>.)
```

Replace the **Next:** section with a sketch of v1-f11:

```
**Next:** v1-f11 — Launch readiness + manual QA + affiliate tracking. Three discrete deliverables: (a) extend `docs/manual-qa.md` with a 10-minute pre-deploy ritual that walks every firm page + all marketing routes + verifies SnapshotBar values, Kill You First rendering, checklist state, affiliate CTA disclosure; (b) create an affiliate-application tracking doc (which programs applied to, status, UTM registered, URL once approved); (c) review Vercel production domain + deploy settings (openpropfirm.com, env vars, branch protection posture, Analytics). Also: tune the bot operational debt before the Monday 06:00 UTC cron — Funding Pips 404, Apex + Lucid 403. Plan not yet written — invoke `superpowers:writing-plans` with arg "write plan for v1-f11".
```

---

## Self-review (performed by plan author)

**1. Spec coverage:**
- [x] §2 decision #6 "Marketing-style landing page" — Task 7.
- [x] §3.1 routes `/`, `/about`, `/disclosure`, `/terms` — Tasks 7, 8.
- [x] §4.1 LandingPage + DisclosurePage + About + Terms — Tasks 7, 8.
- [x] §4.2 Hero — Task 6.
- [x] §4.3 "reused FirmCardGrid" — Task 7 imports it verbatim from v1-f9.
- [x] v1-f9 handoff note "needs a `(marketing)` route group that skips AppShell" — Task 1 + Task 5.
- [x] Affiliate-only-forever policy surfaced in the disclosure copy — Task 3.
- [x] Sourced-data + daily-monitoring + labeled-opinion thesis explained in the about copy — Task 3.

**2. Placeholder scan:** No TBD / "implement later" / "similar to Task N". Each static page's full content is authored inline in Task 3. The three static-page routes intentionally repeat their tiny 15-line shape rather than share a component — commented in Task 8 step 1.

**3. Type consistency:**
- `StaticPage`, `StaticPageSlug`, `STATIC_PAGE_SLUGS` defined once in `static.ts`, imported by tests + 3 page files.
- `FirmMeta` + `listFirms` imported from v1-f9 repository — not redefined.
- `FirmCardGrid` imported from v1-f9 — not redefined.
- No new helpers invented; `loadStaticPage` is the only new exported function.

**4. Scope guard:**
- No changes to any v1-f7/f8/f9 component.
- No changes to `scripts/monitor/schema.ts` or any bot code.
- No changes to `docs/manual-qa.md` (v1-f11).
- No changes to `data/firms/**` (v1-f2 territory).
- No changes to `/legal/[slug]/page.tsx` — kept operational; its own unified pipeline is standalone by design.
- `DEFAULT_FIRM_SLUG` in `lib/constants.ts` stays as-is; `not-found.tsx` still links there (acceptable — a 404 landing on a firm page is sensible).
- No new npm deps.

**5. Risks flagged to implementer:**

- **Moving AppShell off the root layout is the highest-risk change.** It changes the chrome on `/legal/[slug]`, `/admin`, `/auth/*` — which currently render inside AppShell, sometimes with awkward layering. Task 1 Step 4's smoke test explicitly walks those URLs after the restructure. If a page breaks, the fix is to add a page-specific layout that re-wraps in AppShell for that route — not to undo Task 1.
- **Route-group URL mapping.** `(marketing)/page.tsx` maps to `/`. Next 16 App Router respects route groups as invisible URL nodes. If Next errors about conflicting routes during Task 7's build, check for a stray `src/app/page.tsx` outside `(marketing)` (there shouldn't be one).
- **Wiki layout must sit at `[...slug]`, not `[slug]`.** Task 1 Step 2 creates `src/app/firms/[...slug]/layout.tsx`. If accidentally placed at `src/app/firms/[slug]/layout.tsx`, it would wrap the v1-f9 decision pages in AppShell — the exact opposite of what v1-f10 wants.
- **`data/static/` is a new directory.** Make sure `pnpm build` picks up new markdown files under it via the `loadStaticPage` helper (Node fs access at runtime; nothing to configure in Next config).
- **The `/legal/terms-of-service` route continues to work** after v1-f10. That's intentional — removing it now would 404 existing external links. A follow-up in v1-f11 or later can add a 301 redirect from `/legal/terms-of-service` → `/terms` and `/legal/disclaimer` → `/terms`, but that's not v1-f10 scope.
- **SiteHeader's nav intentionally omits `/terms`.** Terms lives in the footer because "Firms, About, Disclosure" is the primary nav a new visitor scans; Terms is legalese they only reach when they need it. If Jason wants Terms in the header, it's a one-line edit to `NAV_LINKS` in `SiteHeader.tsx`.
- **No SiteHeader/SiteFooter on `/firms/*` decision pages** — intentional in v1-f10 scope. If Jason wants the site chrome on decision pages too, that's a follow-up; the fix is to move v1-f9's `firms/page.tsx` + `firms/[slug]/page.tsx` into `(marketing)/firms/...` — which would collide with the existing `/firms/[...slug]` wiki catch-all. Resolving that collision is a non-trivial routing refactor, best deferred.

**6. Rollback plan:** All changes except Task 1's root-layout rewrite are additive. Rolling back:
- `git revert` the Task 1 commit restores AppShell on every route — safe.
- `git revert` the Task 5 + 7 + 8 commits removes the new marketing pages.
- `git revert` the Task 2 + 3 commits removes `data/static/*` and the helper.
- No data migration to undo. No schema changes. No bot changes.
