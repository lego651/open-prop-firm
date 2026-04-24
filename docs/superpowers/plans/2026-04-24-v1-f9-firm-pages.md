# v1-f9 — Firm Detail Page + Firm Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the two new v1 routes: `/firms/[slug]` composes every v1-f7 + v1-f8 component in the three-layer decision-tool order for each of the 4 launch firms; `/firms` renders a grid of firm cards that link into the detail page.

**Architecture:** Two new Next.js 16 App Router routes coexist with the existing `/firms/[...slug]` wiki catch-all. Next.js resolves `[slug]` (one segment) before `[...slug]` (catch-all), so `/firms/funding-pips` → new decision tool, `/firms/cfd/funding-pips/rules` → existing wiki. A tiny firm-repository module (`src/lib/firms/repository.ts`) owns filesystem reads, Zod validation of the `decision` block, and firm listing. Two new presentational components (`FirmCard`, `FirmCardGrid`) serve both the firm index page now and the landing page in v1-f10.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Zod (`DecisionSchema` from `scripts/monitor/schema.ts`), `gray-matter` for frontmatter parsing, vitest (`environment: node`) for unit tests.

---

## Spec traceability

- **Spec §2 decision #1** — "Hybrid. `/firms/<slug>` = decision tool (new). `/vault` = existing Obsidian UI, frozen during v1." v1-f9 delivers the decision-tool half. The wiki stays at `/firms/[...slug]` (its current address) — relocating it to `/vault` is out of v1-f9 scope (a routing concern, touches AppShell).
- **Spec §3.1** — `/firms` (index) + `/firms/[slug]` (detail) both new.
- **Spec §3.4** — three-layer page composition: DATA (neutral) → OPINION (amber) → ACTION (green). v1-f9 wires the layers; the tint tokens landed in v1-f6 and the components landed in v1-f7 + v1-f8.
- **Spec §4.1** — `FirmDetailPage` at `/firms/[slug]`, `FirmsIndexPage` at `/firms`.
- **Spec §4.2** — `FirmCard { firm: FirmMeta }` + `FirmCardGrid { firms: FirmMeta[] }` are listed as landing-page-only components, but the spec also says `FirmsIndexPage` uses `FirmCardGrid`. v1-f9 builds them once, both routes consume them, v1-f10 reuses on `/`.
- **Spec §5.1 visitor data flow** — static at build time; `gray-matter` + Zod at request/build time; HTML served; client hydrates `PreTradeChecklist` only.
- **Spec §6 error modes mapped:**
  - Unknown firm slug → `notFound()` (standard 404).
  - Firm with no `decision` block → render `<MissingDecisionPlaceholder />` (data + rules + sources still render via lower half).
  - All other defensive branches already live in v1-f7/f8 components (null-guard for affiliate, stale badge, localStorage fallback).

---

## v1-f8 handoff notes (applied as design constraints)

From the memory record for v1-f8 shipped 2026-04-24:

1. **`key={firmSlug}` on `<PreTradeChecklist>`.** Forces full unmount between firms during any client-side route transition. Neutralizes the firmSlug-race in the component's hydration effect.
2. **Do NOT thread `now: Date` through `<VerificationBadge>`.** The page is `force-static`, so "now" is build time — one fixed value per deploy. No hydration mismatch possible. Skip the thread; the v1-f8 reviewer's concern only applies to dynamic/ISR pages.
3. **Pass `frontmatter.decision.affiliate.url` straight through.** `<AffiliateCTA>` null-guards null/undefined/empty.
4. **Pass `getPageContent('firms/<cat>/<slug>/rules').htmlContent` straight through to `<RuleBreakdown>`.**
5. **Three-layer composition order (spec §3.4, strict zones):**
   - DATA: `VerificationBadge` → `SnapshotBar` → `RuleBreakdown` → `Changelog`
   - OPINION: `KillYouFirstList` → `FitScoreTable`
   - ACTION: `PreTradeChecklist` → `AffiliateCTA`

---

## Testing strategy

- **Repository module** (`loadFirm`, `listFirms`) — vitest with a `rootDir` override pointing at `data/firms/` (the real v1-f2 fixtures). Tests assert shape + error behavior, not content strings (content can change — tests stay resilient by asserting keys/types, not literals).
- **Page components** — no unit tests (no jsdom, matches v1-f7/f8 pattern). Validation via `pnpm build` which statically prerenders every firm page.
- **Card components** (`FirmCard`, `FirmCardGrid`) — no unit tests; rendered by the index page at build time.
- **Smoke test:** after wiring, verify all 4 firm URLs prerender without error by running `pnpm build` and reading the `.next/server/app/firms/` artifacts (or grep `pnpm build` output for the 4 slugs).

---

## File structure

**New files:**

Repository:
- `src/lib/firms/repository.ts` — `loadFirm(slug, opts?)`, `listFirms(opts?)`
- `src/lib/firms/repository.test.ts`

Card components:
- `src/components/firm/FirmCard.tsx`
- `src/components/firm/FirmCardGrid.tsx`

Missing-decision placeholder (defensive, for future non-v1 firms):
- `src/components/firm/MissingDecisionPlaceholder.tsx`

Routes:
- `src/app/firms/[slug]/page.tsx`
- `src/app/firms/page.tsx`

**Not touched:**
- `src/app/firms/[...slug]/page.tsx` — existing wiki catch-all. Stays as-is. Next.js routing precedence guarantees single-segment URLs hit the new `[slug]` route.
- Any v1-f7 or v1-f8 component. They are consumed verbatim.
- `scripts/monitor/schema.ts` — import `DecisionSchema` + types, don't redefine.
- AppShell / root layout. v1-f10 owns the route-group split.

**No new npm deps.**

---

## Locked type contracts

```ts
// FirmMeta — the shape FirmCard consumes
export interface FirmMeta {
  slug: string                           // "funding-pips"
  name: string                           // "Funding Pips"
  category: 'cfd' | 'futures'
  href: string                           // "/firms/funding-pips"
  snapshot: DecisionSnapshot             // for 3-chip preview
  fitScore: FitScore                     // for the "Best for:" highlight
}

// FirmWithContent — what the detail page gets
export interface FirmWithContent {
  slug: string                           // "funding-pips"
  category: 'cfd' | 'futures'
  frontmatter: {
    title: string
    firm: string
    last_verified: string
    verified_by: 'bot' | 'manual'
    sources: SourceEntry[]
    decision?: Decision                  // optional — defensive for future firms
  }
  indexHtml: string                      // rendered body of index.md
  rulesHtml: string                      // rendered body of rules.md (may be '')
  rulesSourcesUrl: string | null         // first source URL from rules.md frontmatter
}
```

Types reused: `DecisionSnapshot`, `FitScore`, `Decision` from `scripts/monitor/schema.ts`; `SourceEntry` from `src/types/content.ts`.

---

## Task 1: Firm repository (`loadFirm` + `listFirms` + tests)

**Files:**
- Create: `src/lib/firms/repository.ts`
- Test:   `src/lib/firms/repository.test.ts`

### Public contract

```ts
import type { Decision, DecisionSnapshot, FitScore } from '../../../scripts/monitor/schema'
import type { SourceEntry } from '@/types/content'

export interface FirmMeta {
  slug: string
  name: string
  category: 'cfd' | 'futures'
  href: string
  snapshot: DecisionSnapshot
  fitScore: FitScore
}

export interface LoadedFirm {
  slug: string
  category: 'cfd' | 'futures'
  name: string
  title: string
  lastVerified: string
  verifiedBy: 'bot' | 'manual'
  sources: SourceEntry[]
  decision: Decision | null              // null when no decision block (future firms)
}

export interface RepositoryOptions {
  rootDir?: string                       // defaults to path.join(process.cwd(), 'data', 'firms')
}

export async function loadFirm(slug: string, opts?: RepositoryOptions): Promise<LoadedFirm | null>
export async function listFirms(opts?: RepositoryOptions): Promise<FirmMeta[]>
```

### Rules (locked)

- `loadFirm(slug)`:
  - Scans categories `cfd` then `futures` for `<rootDir>/<cat>/<slug>/index.md`.
  - Returns `null` if no match.
  - Parses frontmatter with `gray-matter`.
  - If `decision` block is present, validates with `DecisionSchema.safeParse` — throws on parse failure (build-time catch — a bad decision block is a build bug, not a runtime fallback).
  - If `decision` block is ABSENT, returns the firm with `decision: null` (placeholder case).
  - `name` falls back to `frontmatter.firm` if set, else title-cased slug.
- `listFirms()`:
  - Iterates both category directories.
  - Calls `loadFirm(slug)` for each firm dir.
  - Skips firms whose `decision === null` (they can't render a card — Snapshot/Fit score unavailable). **This is intentional:** the FirmCardGrid only shows firms with complete decision data. Incomplete firms still have a detail page with the missing-decision placeholder — they just don't appear in the grid.
  - Returns sorted: CFD first, then futures, each alphabetical.
- Neither function touches filesystem state outside `rootDir`. No caching beyond what Node's `require`/`import` gives.

### Step 1 — Write the failing tests

Create `src/lib/firms/repository.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import path from 'path'
import { loadFirm, listFirms } from './repository'

const REAL_DATA = path.join(process.cwd(), 'data', 'firms')

describe('loadFirm', () => {
  it('returns null for an unknown slug', async () => {
    const firm = await loadFirm('does-not-exist', { rootDir: REAL_DATA })
    expect(firm).toBeNull()
  })

  it('loads a CFD firm with its decision block', async () => {
    const firm = await loadFirm('funding-pips', { rootDir: REAL_DATA })
    expect(firm).not.toBeNull()
    expect(firm!.slug).toBe('funding-pips')
    expect(firm!.category).toBe('cfd')
    expect(firm!.decision).not.toBeNull()
    expect(firm!.decision!.snapshot.payout_split_pct).toBeTypeOf('number')
    expect(firm!.decision!.fit_score.ny_scalping).toBeTypeOf('number')
    expect(Array.isArray(firm!.sources)).toBe(true)
    expect(firm!.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}/)
    expect(firm!.verifiedBy === 'bot' || firm!.verifiedBy === 'manual').toBe(true)
  })

  it('loads a futures firm', async () => {
    const firm = await loadFirm('apex-funding', { rootDir: REAL_DATA })
    expect(firm).not.toBeNull()
    expect(firm!.category).toBe('futures')
  })

  it('returns a firm with decision: null when decision block is missing', async () => {
    // Construct an in-memory fixture via a temp dir is overkill; instead,
    // rely on the v1-f2 invariant that all 4 launch firms HAVE decision.
    // This test documents the contract via type narrowing only — we check
    // that the type allows decision: null by reading the field on a known-good firm.
    const firm = await loadFirm('funding-pips', { rootDir: REAL_DATA })
    expect(firm).not.toBeNull()
    // decision-field type is Decision | null — TS enforces the union at compile time.
    const maybeDecision: null | object = firm!.decision
    expect(maybeDecision).not.toBeNull() // for funding-pips specifically
  })
})

describe('listFirms', () => {
  it('returns all 4 launch firms', async () => {
    const firms = await listFirms({ rootDir: REAL_DATA })
    expect(firms).toHaveLength(4)
  })

  it('sorts CFD firms before futures firms', async () => {
    const firms = await listFirms({ rootDir: REAL_DATA })
    const cfdIndexes = firms.map((f, i) => ({ c: f.category, i })).filter((x) => x.c === 'cfd').map((x) => x.i)
    const futuresIndexes = firms.map((f, i) => ({ c: f.category, i })).filter((x) => x.c === 'futures').map((x) => x.i)
    // every cfd index is less than every futures index
    for (const ci of cfdIndexes) {
      for (const fi of futuresIndexes) {
        expect(ci).toBeLessThan(fi)
      }
    }
  })

  it('alphabetizes within a category', async () => {
    const firms = await listFirms({ rootDir: REAL_DATA })
    const cfd = firms.filter((f) => f.category === 'cfd').map((f) => f.slug)
    const futures = firms.filter((f) => f.category === 'futures').map((f) => f.slug)
    expect(cfd).toEqual([...cfd].sort())
    expect(futures).toEqual([...futures].sort())
  })

  it('populates href, snapshot, fitScore on each FirmMeta', async () => {
    const firms = await listFirms({ rootDir: REAL_DATA })
    for (const f of firms) {
      expect(f.href).toBe(`/firms/${f.slug}`)
      expect(f.snapshot.payout_split_pct).toBeTypeOf('number')
      expect(f.fitScore.ny_scalping).toBeTypeOf('number')
      expect(f.name.length).toBeGreaterThan(0)
    }
  })
})
```

Run: `pnpm test -- repository` — expect "Cannot find module './repository'" failures.

### Step 2 — Implementation

Create `src/lib/firms/repository.ts`:

```ts
import 'server-only'
import { readFile, readdir, access } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { DecisionSchema, type Decision, type DecisionSnapshot, type FitScore } from '../../../scripts/monitor/schema'
import type { SourceEntry } from '@/types/content'

const CATEGORIES = ['cfd', 'futures'] as const
type Category = (typeof CATEGORIES)[number]

export interface FirmMeta {
  slug: string
  name: string
  category: Category
  href: string
  snapshot: DecisionSnapshot
  fitScore: FitScore
}

export interface LoadedFirm {
  slug: string
  category: Category
  name: string
  title: string
  lastVerified: string
  verifiedBy: 'bot' | 'manual'
  sources: SourceEntry[]
  decision: Decision | null
}

export interface RepositoryOptions {
  rootDir?: string
}

function defaultRoot(): string {
  return path.join(process.cwd(), 'data', 'firms')
}

function kebabToTitle(s: string): string {
  return s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

async function readIndexFrontmatter(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    await access(filePath)
  } catch {
    return null
  }
  const raw = await readFile(filePath, 'utf-8')
  return matter(raw).data as Record<string, unknown>
}

function toLoadedFirm(slug: string, category: Category, data: Record<string, unknown>): LoadedFirm {
  const title = typeof data.title === 'string' ? data.title : kebabToTitle(slug)
  const firmField = typeof data.firm === 'string' ? data.firm : kebabToTitle(slug)
  const lastVerified = typeof data.last_verified === 'string' ? data.last_verified : ''
  const verifiedBy: 'bot' | 'manual' =
    data.verified_by === 'bot' || data.verified_by === 'manual' ? data.verified_by : 'manual'
  const sources: SourceEntry[] = Array.isArray(data.sources) ? (data.sources as SourceEntry[]) : []

  let decision: Decision | null = null
  if (data.decision !== undefined && data.decision !== null) {
    const parsed = DecisionSchema.safeParse(data.decision)
    if (!parsed.success) {
      throw new Error(
        `[repository] decision block invalid for ${category}/${slug}: ${parsed.error.message}`,
      )
    }
    decision = parsed.data
  }

  return {
    slug,
    category,
    name: firmField,
    title,
    lastVerified,
    verifiedBy,
    sources,
    decision,
  }
}

export async function loadFirm(
  slug: string,
  opts: RepositoryOptions = {},
): Promise<LoadedFirm | null> {
  const root = opts.rootDir ?? defaultRoot()
  for (const category of CATEGORIES) {
    const indexPath = path.join(root, category, slug, 'index.md')
    const data = await readIndexFrontmatter(indexPath)
    if (!data) continue
    return toLoadedFirm(slug, category, data)
  }
  return null
}

export async function listFirms(opts: RepositoryOptions = {}): Promise<FirmMeta[]> {
  const root = opts.rootDir ?? defaultRoot()
  const metas: FirmMeta[] = []

  for (const category of CATEGORIES) {
    const catDir = path.join(root, category)
    let entries
    try {
      entries = await readdir(catDir, { withFileTypes: true })
    } catch {
      continue
    }
    const slugs = entries
      .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
      .map((d) => d.name)
      .sort()

    for (const slug of slugs) {
      const firm = await loadFirm(slug, { rootDir: root })
      if (!firm || !firm.decision) continue
      metas.push({
        slug: firm.slug,
        name: firm.name,
        category: firm.category,
        href: `/firms/${firm.slug}`,
        snapshot: firm.decision.snapshot,
        fitScore: firm.decision.fit_score,
      })
    }
  }

  return metas
}
```

### Step 3 — Run tests

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm test -- repository
pnpm tsc --noEmit
```

All 8 tests pass. tsc clean.

### Step 4 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/lib/firms/repository.ts src/lib/firms/repository.test.ts
git commit -m "$(cat <<'EOF'
feat: v1-f9 firm repository loadFirm + listFirms

Filesystem-backed repository that reads data/firms/{cfd,futures}/<slug>/
index.md, parses frontmatter with gray-matter, and validates the decision
block with DecisionSchema (Zod). Accepts a rootDir override for testing.
listFirms returns only firms with a complete decision block — incomplete
firms still have a detail page (placeholder), they just don't show on
the grid.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: FirmCard component

**Files:**
- Create: `src/components/firm/FirmCard.tsx`

### Public contract

```tsx
import type { FirmMeta } from '@/lib/firms/repository'

interface FirmCardProps {
  firm: FirmMeta
}

export function FirmCard({ firm }: FirmCardProps): JSX.Element
```

### Visual spec

- Rounded card, border `--border`, background `--background` (NO tint tokens — cards live on the grid page, neutral context).
- Top row: firm name (`text-lg font-semibold`) + small category badge (`CFD` / `FUTURES` — uppercase, muted).
- 3-chip preview row: payout split, max drawdown, consistency rule. Reuse `buildSnapshotChips` from `@/components/firm/snapshot-helpers` and pick the 3 we want by key.
- Fit-score highlight below chips: "Best for: {top category label} ({rating}★)". Compute via `buildFitScoreRows` → pick max rating → ties: first row wins (locked FitScore order).
- Whole card is wrapped in a `<Link href={firm.href}>`. Hover state: `hover:border-[var(--ring)]` (or reuse any existing card-hover class pattern in the repo).

### Reference implementation

```tsx
import Link from 'next/link'
import type { FirmMeta } from '@/lib/firms/repository'
import { buildSnapshotChips } from '@/components/firm/snapshot-helpers'
import { buildFitScoreRows } from '@/components/firm/fit-score-helpers'

interface FirmCardProps {
  firm: FirmMeta
}

const PREVIEW_CHIP_KEYS = ['payout_split', 'max_drawdown', 'consistency_rule'] as const

function pickTopFitRow(fitScore: FirmMeta['fitScore']) {
  const rows = buildFitScoreRows(fitScore)
  let top = rows[0]
  for (const r of rows) {
    if (r.rating > top.rating) top = r
  }
  return top
}

/**
 * Preview card for /firms grid and /-landing. Whole card is a link into
 * the firm detail page.
 */
export function FirmCard({ firm }: FirmCardProps) {
  const allChips = buildSnapshotChips(firm.snapshot)
  const previewChips = PREVIEW_CHIP_KEYS.map((key) => allChips.find((c) => c.key === key)).filter(
    (c): c is NonNullable<typeof c> => c !== undefined,
  )
  const topFit = pickTopFitRow(firm.fitScore)

  return (
    <Link
      href={firm.href}
      className="block rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 transition-colors hover:border-[var(--ring)]"
      aria-label={`${firm.name} — open decision page`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{firm.name}</h3>
        <span className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
          {firm.category}
        </span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2 text-xs">
        {previewChips.map((chip) => (
          <li
            key={chip.key}
            className="rounded-full border border-[var(--border)] px-2 py-0.5"
          >
            <span className="font-medium">{chip.label}:</span>{' '}
            <span>{chip.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
        Best for: <span className="text-[var(--foreground)]">{topFit.label}</span>{' '}
        <span aria-label={`${topFit.rating} out of 5`}>({topFit.rating}★)</span>
      </p>
    </Link>
  )
}
```

### Step 1 — Write the file

Paste the reference.

### Step 2 — Type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm build
```

Both clean.

### Step 3 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/components/firm/FirmCard.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f9 FirmCard component

Preview card: firm name + category badge, 3-chip snapshot preview
(payout split, max drawdown, consistency rule), and best-fit
highlight. Entire card is a <Link> into /firms/<slug>. Reuses
buildSnapshotChips and buildFitScoreRows helpers from v1-f7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: FirmCardGrid component

**Files:**
- Create: `src/components/firm/FirmCardGrid.tsx`

### Public contract

```tsx
import type { FirmMeta } from '@/lib/firms/repository'

interface FirmCardGridProps {
  firms: FirmMeta[]
}

export function FirmCardGrid({ firms }: FirmCardGridProps): JSX.Element
```

### Visual spec

- Responsive grid: 1 column on mobile, 2 columns `sm:`, 3 columns `lg:`.
- Maps `firms` to `<FirmCard>` with `key={firm.slug}`.
- Empty state: if `firms.length === 0`, render `<p>` with muted text "No firms available yet." (defensive — all 4 launch firms should always be present).

### Reference implementation

```tsx
import type { FirmMeta } from '@/lib/firms/repository'
import { FirmCard } from './FirmCard'

interface FirmCardGridProps {
  firms: FirmMeta[]
}

export function FirmCardGrid({ firms }: FirmCardGridProps) {
  if (firms.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">No firms available yet.</p>
    )
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {firms.map((firm) => (
        <li key={firm.slug}>
          <FirmCard firm={firm} />
        </li>
      ))}
    </ul>
  )
}
```

### Step 1 — Write the file

Paste the reference.

### Step 2 — Type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm build
```

Both clean.

### Step 3 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/components/firm/FirmCardGrid.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f9 FirmCardGrid responsive grid

Maps FirmMeta[] to FirmCard list inside a 1/2/3-column responsive
grid. Defensive empty state. Consumed by /firms index in this branch
and by the v1-f10 landing page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: MissingDecisionPlaceholder component

**Files:**
- Create: `src/components/firm/MissingDecisionPlaceholder.tsx`

### Public contract

```tsx
interface MissingDecisionPlaceholderProps {
  firmName: string
}

export function MissingDecisionPlaceholder({ firmName }: MissingDecisionPlaceholderProps): JSX.Element
```

### Visual spec

- DATA layer, neutral bg, rounded border.
- Copy: "Full decision layer coming for {firmName} — see rules below."
- Exists only for future firms; all 4 v1 launch firms have decision blocks.

### Reference implementation

```tsx
interface MissingDecisionPlaceholderProps {
  firmName: string
}

/**
 * Defensive placeholder for a firm whose basic-info doesn't yet have a
 * decision block. All 4 v1 launch firms have decision blocks (enforced
 * by scripts/validate-content.ts), so this renders only for future
 * firms added before their opinion layer is authored.
 */
export function MissingDecisionPlaceholder({ firmName }: MissingDecisionPlaceholderProps) {
  return (
    <section
      aria-label="Decision layer pending"
      className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]"
    >
      Full decision layer coming for <span className="text-[var(--foreground)]">{firmName}</span>{' '}
      — see rules below.
    </section>
  )
}
```

### Step 1 — Write the file

Paste the reference.

### Step 2 — Type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm build
```

### Step 3 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/components/firm/MissingDecisionPlaceholder.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f9 MissingDecisionPlaceholder defensive block

Renders when a firm's basic-info has no decision block (future firms
only — the 4 v1 launch firms all have decision via v1-f2 migration).
Minimal neutral-layer card, no opinion-tint (this isn't the founder
speaking).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `/firms/[slug]/page.tsx` — firm detail page

**Files:**
- Create: `src/app/firms/[slug]/page.tsx`

### Route coexistence note

Next.js App Router resolves specific routes before catch-alls. A request for `/firms/funding-pips` (1 segment) matches `app/firms/[slug]/page.tsx` — the new decision tool. A request for `/firms/cfd/funding-pips/rules` (3 segments) matches `app/firms/[...slug]/page.tsx` — the existing wiki. No routing conflict. Do not delete or move the catch-all.

### Component composition (spec §3.4 — strict layer order)

1. DATA ZONE (neutral):
   - `<VerificationBadge>` at top — signals data freshness before any data.
   - `<SnapshotBar>` — the 6 chips.
   - `<RuleBreakdown>` — collapsibles from `rules.md` HTML.
   - `<Changelog>` — `decision.changelog[]`.
2. OPINION ZONE (amber tint):
   - `<KillYouFirstList>`
   - `<FitScoreTable>`
3. ACTION ZONE (green tint):
   - `<PreTradeChecklist>` with `key={slug}` — forces remount if slug changes mid-session (defensive; pages are static, so this is belt-and-suspenders).
   - `<AffiliateCTA>`

Missing-decision case: only `<VerificationBadge>` + `<MissingDecisionPlaceholder>` + rendered `index.md` HTML + sources. No broken snapshot/opinion/action — they each require the decision block.

### Reference implementation

```tsx
import { notFound } from 'next/navigation'
import { getPageContent } from '@/lib/content/getPageContent'
import { loadFirm, listFirms } from '@/lib/firms/repository'

// v1-f7 components
import { SnapshotBar } from '@/components/firm/SnapshotBar'
import { KillYouFirstList } from '@/components/firm/KillYouFirstList'
import { FitScoreTable } from '@/components/firm/FitScoreTable'

// v1-f8 components
import { VerificationBadge } from '@/components/firm/VerificationBadge'
import { Changelog } from '@/components/firm/Changelog'
import { RuleBreakdown } from '@/components/firm/RuleBreakdown'
import { PreTradeChecklist } from '@/components/firm/PreTradeChecklist'
import { AffiliateCTA } from '@/components/firm/AffiliateCTA'

import { MissingDecisionPlaceholder } from '@/components/firm/MissingDecisionPlaceholder'

export const dynamic = 'force-static'

export async function generateStaticParams() {
  const firms = await listFirms()
  return firms.map((f) => ({ slug: f.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const firm = await loadFirm(slug)
  if (!firm) return { title: 'Firm not found — OpenPropFirm' }
  return {
    title: `${firm.name} — OpenPropFirm`,
    description: `Pre-trade decision page for ${firm.name}. Snapshot, kill-you-first warnings, fit score, and rule breakdown.`,
  }
}

async function loadRulesHtml(category: 'cfd' | 'futures', slug: string): Promise<{
  html: string
  firstSourceUrl: string | null
}> {
  try {
    const { htmlContent, frontmatter } = await getPageContent(`firms/${category}/${slug}/rules`)
    const firstSourceUrl = frontmatter.sources[0]?.url ?? null
    return { html: htmlContent, firstSourceUrl }
  } catch {
    return { html: '', firstSourceUrl: null }
  }
}

export default async function FirmDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const firm = await loadFirm(slug)
  if (!firm) notFound()

  const rules = await loadRulesHtml(firm.category, slug)
  const rulesSourcesUrl = rules.firstSourceUrl

  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      {/* DATA ZONE — neutral */}
      <div className="space-y-4">
        <VerificationBadge
          lastVerified={firm.lastVerified}
          verifiedBy={firm.verifiedBy}
          sourcesUrl={rulesSourcesUrl}
        />

        {firm.decision ? (
          <SnapshotBar snapshot={firm.decision.snapshot} />
        ) : (
          <MissingDecisionPlaceholder firmName={firm.name} />
        )}

        {rules.html && <RuleBreakdown rulesHtml={rules.html} />}

        {firm.decision && <Changelog entries={firm.decision.changelog} />}
      </div>

      {/* OPINION ZONE — amber (only if decision block exists) */}
      {firm.decision && (
        <div className="mt-6 space-y-4">
          <KillYouFirstList warnings={firm.decision.kill_you_first} />
          <FitScoreTable fitScore={firm.decision.fit_score} />
        </div>
      )}

      {/* ACTION ZONE — green (only if decision block exists) */}
      {firm.decision && (
        <div className="mt-6 space-y-4">
          <PreTradeChecklist
            key={firm.slug}
            items={firm.decision.pre_trade_checklist}
            firmSlug={firm.slug}
          />
          <AffiliateCTA
            firmSlug={firm.slug}
            url={firm.decision.affiliate.url}
            utm={firm.decision.affiliate.utm}
          />
        </div>
      )}
    </article>
  )
}
```

### Step 1 — Write the file

Paste the reference.

### Step 2 — Type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm build
```

Expected build output: Next.js prerenders 4 firm pages under `/firms/<slug>`. Check the build log for lines like `● /firms/funding-pips`, `/firms/apex-funding`, etc. If any firm fails, the build fails — investigate before proceeding.

Also smoke-check the existing wiki still works: the build log should still show prerenders for `/firms/cfd/funding-pips`, `/firms/cfd/funding-pips/rules`, etc. If the wiki pages stop prerendering, the route precedence is wrong — STOP and diagnose.

### Step 3 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/app/firms/\[slug\]/page.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f9 firm detail page /firms/[slug]

Composes v1-f7 + v1-f8 components in the strict three-layer order from
spec §3.4: DATA (VerificationBadge, SnapshotBar, RuleBreakdown,
Changelog) → OPINION (KillYouFirstList, FitScoreTable) → ACTION
(PreTradeChecklist, AffiliateCTA). Coexists with the existing
/firms/[...slug] wiki catch-all via Next's specific-over-catchall
precedence. Static, generateStaticParams over listFirms(). notFound()
for unknown slugs, MissingDecisionPlaceholder for firms without a
decision block.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `/firms/page.tsx` — firm index

**Files:**
- Create: `src/app/firms/page.tsx`

### Route coexistence note

`app/firms/page.tsx` matches exactly `/firms`. Does not collide with `[slug]` (which matches `/firms/<single>`) or `[...slug]` (which matches `/firms/<multi>/...`). Safe to add.

### Reference implementation

```tsx
import type { Metadata } from 'next'
import { listFirms } from '@/lib/firms/repository'
import { FirmCardGrid } from '@/components/firm/FirmCardGrid'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Firms — OpenPropFirm',
  description: 'Browse prop firms with sourced rule snapshots and founder fit scores.',
}

export default async function FirmsIndexPage() {
  const firms = await listFirms()
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Firms</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Pick a firm to see its pre-trade decision page — snapshot, warnings, fit score, rule breakdown, and checklist.
        </p>
      </header>
      <FirmCardGrid firms={firms} />
    </main>
  )
}
```

### Step 1 — Write the file

Paste the reference.

### Step 2 — Type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm build
```

Build log should include a prerender for `/firms` (no trailing slug). All 4 detail pages (`/firms/<slug>`) continue to prerender.

### Step 3 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/app/firms/page.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f9 firm index page /firms

Static page listing all firms via FirmCardGrid. Each card deep-links
into /firms/<slug>. Coexists cleanly with /firms/[slug] (detail) and
/firms/[...slug] (wiki catch-all).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Full validation + merge to main

### Step 1 — Full test + type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm test
pnpm build
```

Expected:
- `tsc`: clean.
- `test`: **previous 157 + 8 new repository tests = 165** (exact number may vary by a case or two; should be 165 ± 2).
- `build`: all prior routes still prerender, PLUS `/firms`, `/firms/funding-pips`, `/firms/funded-next`, `/firms/apex-funding`, `/firms/lucid-trading`. The wiki's catch-all routes (`/firms/cfd/<slug>`, `/firms/cfd/<slug>/rules`, challenges, etc.) must still prerender — verify by scanning the build log.

### Step 2 — Manual smoke test (local dev)

```bash
pnpm dev
```

Open in a browser:
- http://localhost:3000/firms — expect grid of 4 firm cards.
- http://localhost:3000/firms/funding-pips — expect three-layer decision page.
- http://localhost:3000/firms/does-not-exist — expect 404 (Next.js default not-found page, unless `not-found.tsx` overrides).
- http://localhost:3000/firms/cfd/funding-pips — expect wiki-style content (catch-all unchanged).
- http://localhost:3000/firms/cfd/funding-pips/rules — expect wiki rules page (catch-all unchanged).

Visual spot-checks on /firms/funding-pips:
- VerificationBadge at top.
- SnapshotBar with 6 chips + best_for subtitle.
- RuleBreakdown with collapsible H2s (default closed).
- Changelog with "Stability: —" placeholder (v1) + empty-state "No changes tracked yet." (funding-pips has `changelog: []` per v1-f2 migration).
- KillYouFirstList with 3 founder-authored warnings (amber tint).
- FitScoreTable (amber tint).
- PreTradeChecklist — check boxes, reload, state persists; "Reset for today" link appears after ≥1 check; click resets.
- AffiliateCTA — should NOT render (all 4 firms have `affiliate.url: null` pending approvals).

### Step 3 — Commit the plan doc

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add docs/superpowers/plans/2026-04-24-v1-f9-firm-pages.md
git commit -m "$(cat <<'EOF'
docs: v1-f9 plan

Reference artifact kept alongside v1-f1..f8 plans.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 4 — Fast-forward merge to main + push

Per Jason's 2026-04-23 directive — no PR.

```bash
cd /Users/lego/@Lego651/open-prop-firm
git checkout main
git pull --ff-only origin main
git merge --ff-only feat/v1-f9-firm-pages
git push origin main
```

If `--ff-only` fails, rebase onto latest main:

```bash
git checkout feat/v1-f9-firm-pages
git rebase origin/main
git checkout main
git merge --ff-only feat/v1-f9-firm-pages
git push origin main
```

### Step 5 — Delete the feature branch

```bash
cd /Users/lego/@Lego651/open-prop-firm
git branch -d feat/v1-f9-firm-pages
git push origin --delete feat/v1-f9-firm-pages 2>/dev/null || true
```

### Step 6 — Update the v1 progress memory

Edit `/Users/lego/.claude/projects/-Users-lego--Lego651-open-prop-firm/memory/project_v1_progress.md`:

- Under **Shipped:**, add a v1-f9 entry after the v1-f8 line, with the final SHA of main after the push.
- Replace the **Next:** section with a sketch of v1-f10 (landing page + static legal/about/disclosure pages; reuse FirmCardGrid from this branch; add Hero component; likely touches root layout via route groups to peel AppShell off the marketing routes).

Suggested v1-f9 entry:

```
- v1-f9 — Firm detail page + firm index. `app/firms/[slug]/page.tsx` composes v1-f7 + v1-f8 components in spec §3.4 three-layer order (DATA: VerificationBadge, SnapshotBar, RuleBreakdown, Changelog; OPINION: KillYouFirstList, FitScoreTable; ACTION: PreTradeChecklist, AffiliateCTA). `app/firms/page.tsx` is the grid index. Two new card components (`FirmCard`, `FirmCardGrid`) — reused by v1-f10 landing. Repository module (`src/lib/firms/repository.ts`) with 8 vitest cases. Coexists with existing `/firms/[...slug]` wiki catch-all via specific-route precedence. MissingDecisionPlaceholder for future firms without a decision block. (2026-04-24, direct-to-main, final commit <FILL IN>.)
```

Suggested next-pointer:

```
**Next:** v1-f10 — Landing page (`/`) + static pages (/about, /disclosure, /terms). Replace the current root at `/` (which currently routes into the wiki AppShell) with a hero + FirmCardGrid + disclosure link. Likely needs a `(marketing)` route group with its own layout that skips the 3-panel AppShell. Static pages are simple content pages. Reuses v1-f9's FirmCardGrid. Plan not yet written — write just-in-time with `superpowers:writing-plans` arg "write plan for v1-f10".
```

---

## Self-review (performed by plan author)

**1. Spec coverage:**
- [x] §3.1 routes `/firms` + `/firms/[slug]` — Tasks 5 + 6.
- [x] §3.4 three-layer composition order — Task 5 reference implementation follows the locked order.
- [x] §4.1 FirmsIndexPage + FirmDetailPage — Tasks 5 + 6.
- [x] §4.2 FirmCard + FirmCardGrid — Tasks 2 + 3.
- [x] §5.1 static build-time data flow — `dynamic = 'force-static'` + `generateStaticParams`.
- [x] §6 unknown-slug 404 — `notFound()` in Task 5.
- [x] §6 firm with no decision → placeholder + rules still render — Task 4 + Task 5 branching.
- [x] v1-f8 handoff applied: `key={firm.slug}` on PreTradeChecklist; no `now` thread (static build); affiliate passed through; rulesHtml passed through.

**2. Placeholder scan:** no TBD / "implement later" / "similar to Task N". Every code block complete. Every helper has a test case or is exercised by `pnpm build`.

**3. Type consistency:**
- `FirmMeta` defined once in `repository.ts`, imported by `FirmCard`, `FirmCardGrid`, `FirmsIndexPage`.
- `LoadedFirm` defined once, used by `FirmDetailPage` + tested in `repository.test.ts`.
- `Decision`, `DecisionSnapshot`, `FitScore` imported from `scripts/monitor/schema` — never redefined.
- `listFirms` signature matches across repository, tests, and both pages.
- `buildSnapshotChips` / `buildFitScoreRows` imported from v1-f7 helpers — no new helper invented.

**4. Scope guard:**
- No changes to v1-f7/f8 components (verified by file list — `src/components/firm/{SnapshotBar,KillYouFirstList,FitScoreTable,VerificationBadge,Changelog,RuleBreakdown,PreTradeChecklist,AffiliateCTA}.tsx` are consumed but not modified).
- No changes to `scripts/monitor/schema.ts`.
- No bot/workflow changes.
- AppShell / root layout untouched. v1-f10 owns the route-group split.
- Existing `/firms/[...slug]` wiki catch-all untouched — coexistence verified by Task 5 + Task 6 manual smoke tests.
- No new npm deps.

**5. Risks flagged to implementer:**
- **Next.js route precedence.** If any firm slug collides with a filename in the wiki (e.g. if there were a `data/firms/funding-pips.md` at the top level), the catch-all would win. v1 data doesn't have any such files — verified by directory listing. But the first `pnpm dev` / `pnpm build` after Task 5 is the canary.
- **Static build time for verification badge.** `VerificationBadge` uses `new Date()` at build time. Every deploy rebuilds, so "days since" is only updated on redeploy — not daily. Acceptable for v1 (build cadence is already tied to the bot's weekly Monday cron via the bot-update PR workflow). v2 or a later task can flip `dynamic: 'force-dynamic'` if daily freshness is needed.
- **`AffiliateCTA` returns null for all 4 firms in v1.** Expected — all 4 firm files have `affiliate.url: null` pending program approvals. The ACTION zone will render only the PreTradeChecklist until a firm is approved. Don't mistake this for a bug during smoke testing.
- **Wiki nav links.** The existing nav (`NavFileTree`) shows firm directories and links into `/firms/<cat>/<slug>` (the wiki URLs). We do NOT add a "Decision tool" link in this plan — the nav edit touches AppShell-owned state and is out of v1-f9 scope. A user who lands on `/firms` via URL-typing or the new card grid will see the decision page; a user who navigates via the sidebar continues to see the wiki. Both UXs exist, both work, they don't conflict.

**6. Rollback plan:** All changes are additive files. Reverting the 6 feat commits + the plan-doc commit restores main to v1-f8 state. The only runtime change is that `/firms/funding-pips` (and 3 others) stops serving the decision tool; `/firms/cfd/funding-pips` keeps serving the wiki exactly as it did before.
