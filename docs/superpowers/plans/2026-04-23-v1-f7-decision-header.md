# v1-f7 — Decision Header Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three Decision Header leaf components — `SnapshotBar` (data layer, neutral bg), `KillYouFirstList` (opinion layer, amber tint), `FitScoreTable` (opinion layer, amber tint) — that render from the `decision.*` frontmatter already migrated onto the 4 firm files. v1-f9 will compose them into the firm detail page.

**Architecture:** Three standalone presentational components plus a shared pure-helper module for labeling and formatting. Components are server-rendered by default (no client-only directives); they take typed props (already exported from `scripts/monitor/schema.ts`) and emit markup that uses shadcn `Badge` for chips and the v1-f6 `--opinion-tint-*` tokens for the OPINION layer surface. No page wiring yet — that is v1-f9.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui (`Badge`), `lucide-react` icons, Zod schema types from `scripts/monitor/schema.ts`, vitest for pure helpers.

---

## Spec traceability

- **Spec §4.2 Decision Header cluster** — SnapshotBar (data), KillYouFirstList (opinion), FitScoreTable (opinion). Each consumes one top-level `decision.*` block.
- **Spec §3.4 three-layer page** — OPINION components MUST render with `--opinion-tint-bg` + `--opinion-tint-border` and a visible "Founder's opinion" label; DATA components use neutral `var(--background)`.
- **v1-f6 usage contract** (`docs/ui-guide.md` §6.5) — `KillYouFirstList` + `FitScoreTable` use `background: var(--opinion-tint-bg); border: 1px solid var(--opinion-tint-border);`. `SnapshotBar` does NOT use tint tokens.

---

## Testing strategy

The repo's current vitest config (`vitest.config.ts`) uses `environment: 'node'` and includes `src/**/*.test.ts` — no `.tsx` tests, no jsdom, no `@testing-library/react`. Setting up a DOM test environment for three presentational components is out of scope for v1-f7.

**Strategy:** Extract all branching logic — label pickers, status icons, star rendering — into pure functions in a sibling `.ts` module, unit-test those with vitest. Components themselves stay as thin JSX that composes those helpers. Validate component render by running `pnpm build` — Next.js's prerender will attempt to evaluate every firm page at build time via `generateStaticParams`, which shakes out any crash bugs. Visual validation happens in v1-f9 when the page actually mounts the components.

---

## File structure

**New files:**
- `src/components/firm/snapshot-helpers.ts` — pure: per-field label, status icon/value, source URL extraction for the 7 `DecisionSnapshot` fields.
- `src/components/firm/snapshot-helpers.test.ts` — vitest suite (~8 cases).
- `src/components/firm/SnapshotBar.tsx` — React server component; uses helpers + shadcn `Badge`.
- `src/components/firm/fit-score-helpers.ts` — pure: render-model for fit-score row (category → label; rating → star string or "not suitable" marker).
- `src/components/firm/fit-score-helpers.test.ts` — vitest suite (~5 cases).
- `src/components/firm/FitScoreTable.tsx` — React server component; uses fit-score helpers.
- `src/components/firm/KillYouFirstList.tsx` — React server component; minimal branching, unit-testable logic lives in the component body.

**No modifications** to existing code. v1-f9 will import these components into the firm page; until then they're dead code that the build still type-checks.

**No new npm deps.**

---

## Locked type contracts (imported, not redefined)

All types come from `scripts/monitor/schema.ts` — do not redefine:

```ts
import type {
  DecisionSnapshot,
  KillYouFirstEntry,
  FitScore,
  MaxDrawdown,
  ConsistencyRule,
} from '@/../scripts/monitor/schema'
```

Path alias note: `@/*` maps to `./src/*` per `tsconfig.json`. The `scripts/` directory sits at the repo root, so from `src/components/firm/*` the correct relative import is `../../../scripts/monitor/schema` or use TS's module resolution. Check whether `scripts/monitor/schema.ts` is included in the Next.js tsconfig — it may not be picked up under `@/*`. The cleanest approach: import via relative path `../../../scripts/monitor/schema` and pin this import path in all three components for consistency. (If TS errors on resolution, fall back to re-exporting the types from `src/types/decision.ts` — a new file that just `export type { ... } from '../../scripts/monitor/schema'` — but try the direct import first.)

**DecisionSnapshot shape** (for reference, do not redefine):

```ts
{
  news_trading_allowed: boolean
  overnight_holding_allowed: boolean
  weekend_holding_allowed: boolean
  max_drawdown: { type: 'trailing_intraday' | 'trailing_eod' | 'static'; value_usd: number; source_url: string }
  consistency_rule: { enabled: boolean; max_daily_pct?: number; source_url: string }
  payout_split_pct: number
  best_for: string
}
```

**KillYouFirstEntry shape:**

```ts
{ title: string; detail: string; source_url: string }
```

**FitScore shape** (5 keys, each an integer 0–5):

```ts
{
  ny_scalping: number
  swing_trading: number
  news_trading: number
  beginner_friendly: number
  scalable: number
}
```

---

## Task 1: Snapshot helpers + tests

**Files:**
- Create: `src/components/firm/snapshot-helpers.ts`
- Test:   `src/components/firm/snapshot-helpers.test.ts`

The helpers take a `DecisionSnapshot` and return a structured list of `SnapshotChip` render-models that `SnapshotBar.tsx` will map over.

### Public contract

```ts
import type { DecisionSnapshot } from '../../../scripts/monitor/schema'

export type ChipStatus = 'allowed' | 'forbidden' | 'neutral'

export interface SnapshotChip {
  key: string                   // stable React key, e.g. "news_trading"
  label: string                 // display label, e.g. "News trading"
  value: string                 // display value, e.g. "Yes", "No", "$2,000", "100%"
  status: ChipStatus            // drives color — green for allowed, red for forbidden, neutral for numeric
  sourceUrl: string             // link to source of this field
}

export function buildSnapshotChips(snapshot: DecisionSnapshot): SnapshotChip[]
```

### Chip mapping (locked)

Emit exactly 6 chips in this order:

1. **News trading** — `news_trading_allowed`. value `"Yes"`/`"No"`, status `'allowed'`/`'forbidden'`, sourceUrl from snapshot.max_drawdown.source_url as fallback (see note below).
2. **Overnight holding** — `overnight_holding_allowed`. Same pattern.
3. **Weekend holding** — `weekend_holding_allowed`. Same pattern.
4. **Max drawdown** — `max_drawdown.value_usd` formatted as currency (USD, no decimals), followed by the type in parentheses: `"$2,000 (trailing EOD)"`. Status `'neutral'`. sourceUrl `max_drawdown.source_url`.
5. **Consistency rule** — if `consistency_rule.enabled === true`, value is `"${max_daily_pct}% daily cap"`; if `false`, value is `"None"`. Status `'allowed'` when NOT enabled (freer rule = green), `'forbidden'` when enabled (restriction = red). sourceUrl `consistency_rule.source_url`.
6. **Payout split** — `payout_split_pct`. value `"${payout_split_pct}%"`. Status `'neutral'`. sourceUrl fallback `max_drawdown.source_url`.

NOTE: `news_trading_allowed`, `overnight_holding_allowed`, `weekend_holding_allowed`, and `payout_split_pct` have no individual `source_url` in the schema — they live directly on the snapshot root. The existing v1-f3 bot uses `max_drawdown.source_url` as the fallback "snapshot-level" citation in `diff.ts`. Match that behavior: for those 4 fields, `sourceUrl = snapshot.max_drawdown.source_url`. This is consistent with how `diff.ts` already labels snapshot-level drift in PR bodies.

`best_for` is a free-form string — it is NOT rendered as a chip (the 6 chips are binary/quantitative decisions; `best_for` is editorial context that belongs as a subtitle in `SnapshotBar.tsx`, not in the chip array).

### Max-drawdown type label formatter

Helper function: `formatDrawdownType(t: MaxDrawdown['type']): string`:
- `'trailing_intraday'` → `'trailing intraday'`
- `'trailing_eod'` → `'trailing EOD'`
- `'static'` → `'static'`

### Max-drawdown value formatter

Helper: `formatDrawdownValue(usd: number, type: MaxDrawdown['type']): string`:
- `1500, 'trailing_intraday'` → `"$1,500 (trailing intraday)"`
- `2000, 'trailing_eod'` → `"$2,000 (trailing EOD)"`
- Use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })`.

### Step 1 — Write the failing tests

Create `src/components/firm/snapshot-helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildSnapshotChips,
  formatDrawdownType,
  formatDrawdownValue,
} from './snapshot-helpers'
import type { DecisionSnapshot } from '../../../scripts/monitor/schema'

const BASE: DecisionSnapshot = {
  news_trading_allowed: true,
  overnight_holding_allowed: true,
  weekend_holding_allowed: false,
  max_drawdown: {
    type: 'trailing_eod',
    value_usd: 2000,
    source_url: 'https://example.com/dd',
  },
  consistency_rule: {
    enabled: false,
    source_url: 'https://example.com/cr',
  },
  payout_split_pct: 100,
  best_for: 'Intraday futures scalpers',
}

describe('formatDrawdownType', () => {
  it('renames enum values into reader-friendly labels', () => {
    expect(formatDrawdownType('trailing_intraday')).toBe('trailing intraday')
    expect(formatDrawdownType('trailing_eod')).toBe('trailing EOD')
    expect(formatDrawdownType('static')).toBe('static')
  })
})

describe('formatDrawdownValue', () => {
  it('formats USD with thousands separator and no decimals', () => {
    expect(formatDrawdownValue(1500, 'trailing_intraday')).toBe('$1,500 (trailing intraday)')
    expect(formatDrawdownValue(2000, 'trailing_eod')).toBe('$2,000 (trailing EOD)')
    expect(formatDrawdownValue(50000, 'static')).toBe('$50,000 (static)')
  })
})

describe('buildSnapshotChips', () => {
  it('emits exactly 6 chips in the locked order', () => {
    const chips = buildSnapshotChips(BASE)
    expect(chips.map((c) => c.key)).toEqual([
      'news_trading',
      'overnight_holding',
      'weekend_holding',
      'max_drawdown',
      'consistency_rule',
      'payout_split',
    ])
  })

  it('marks boolean permissions as allowed/forbidden with Yes/No values', () => {
    const chips = buildSnapshotChips(BASE)
    const news = chips.find((c) => c.key === 'news_trading')!
    expect(news.label).toBe('News trading')
    expect(news.value).toBe('Yes')
    expect(news.status).toBe('allowed')

    const weekend = chips.find((c) => c.key === 'weekend_holding')!
    expect(weekend.value).toBe('No')
    expect(weekend.status).toBe('forbidden')
  })

  it('renders max drawdown with currency + type', () => {
    const chips = buildSnapshotChips(BASE)
    const dd = chips.find((c) => c.key === 'max_drawdown')!
    expect(dd.label).toBe('Max drawdown')
    expect(dd.value).toBe('$2,000 (trailing EOD)')
    expect(dd.status).toBe('neutral')
    expect(dd.sourceUrl).toBe('https://example.com/dd')
  })

  it('renders consistency rule as None when disabled, with allowed status', () => {
    const chips = buildSnapshotChips(BASE)
    const cr = chips.find((c) => c.key === 'consistency_rule')!
    expect(cr.label).toBe('Consistency rule')
    expect(cr.value).toBe('None')
    expect(cr.status).toBe('allowed')
    expect(cr.sourceUrl).toBe('https://example.com/cr')
  })

  it('renders consistency rule as "X% daily cap" when enabled, with forbidden status', () => {
    const withCR: DecisionSnapshot = {
      ...BASE,
      consistency_rule: {
        enabled: true,
        max_daily_pct: 30,
        source_url: 'https://example.com/cr2',
      },
    }
    const chips = buildSnapshotChips(withCR)
    const cr = chips.find((c) => c.key === 'consistency_rule')!
    expect(cr.value).toBe('30% daily cap')
    expect(cr.status).toBe('forbidden')
  })

  it('renders payout split as percentage with neutral status', () => {
    const chips = buildSnapshotChips(BASE)
    const p = chips.find((c) => c.key === 'payout_split')!
    expect(p.label).toBe('Payout split')
    expect(p.value).toBe('100%')
    expect(p.status).toBe('neutral')
  })

  it('falls back to max_drawdown.source_url for fields without their own source', () => {
    const chips = buildSnapshotChips(BASE)
    for (const key of ['news_trading', 'overnight_holding', 'weekend_holding', 'payout_split']) {
      expect(chips.find((c) => c.key === key)!.sourceUrl).toBe('https://example.com/dd')
    }
  })
})
```

Run `pnpm test -- snapshot-helpers` — expect all to fail with "Cannot find module './snapshot-helpers'".

### Step 2 — Implementation

Create `src/components/firm/snapshot-helpers.ts`:

```ts
import type { DecisionSnapshot, MaxDrawdown } from '../../../scripts/monitor/schema'

export type ChipStatus = 'allowed' | 'forbidden' | 'neutral'

export interface SnapshotChip {
  key: string
  label: string
  value: string
  status: ChipStatus
  sourceUrl: string
}

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatDrawdownType(t: MaxDrawdown['type']): string {
  switch (t) {
    case 'trailing_intraday':
      return 'trailing intraday'
    case 'trailing_eod':
      return 'trailing EOD'
    case 'static':
      return 'static'
  }
}

export function formatDrawdownValue(usd: number, type: MaxDrawdown['type']): string {
  return `${USD.format(usd)} (${formatDrawdownType(type)})`
}

function yesNoChip(
  key: string,
  label: string,
  allowed: boolean,
  sourceUrl: string,
): SnapshotChip {
  return {
    key,
    label,
    value: allowed ? 'Yes' : 'No',
    status: allowed ? 'allowed' : 'forbidden',
    sourceUrl,
  }
}

/**
 * Build the 6-chip render model for SnapshotBar. The order and labels are
 * locked — SnapshotBar relies on them for layout.
 */
export function buildSnapshotChips(snapshot: DecisionSnapshot): SnapshotChip[] {
  const fallbackSource = snapshot.max_drawdown.source_url

  const chips: SnapshotChip[] = [
    yesNoChip('news_trading', 'News trading', snapshot.news_trading_allowed, fallbackSource),
    yesNoChip(
      'overnight_holding',
      'Overnight holding',
      snapshot.overnight_holding_allowed,
      fallbackSource,
    ),
    yesNoChip(
      'weekend_holding',
      'Weekend holding',
      snapshot.weekend_holding_allowed,
      fallbackSource,
    ),
    {
      key: 'max_drawdown',
      label: 'Max drawdown',
      value: formatDrawdownValue(snapshot.max_drawdown.value_usd, snapshot.max_drawdown.type),
      status: 'neutral',
      sourceUrl: snapshot.max_drawdown.source_url,
    },
  ]

  if (snapshot.consistency_rule.enabled && typeof snapshot.consistency_rule.max_daily_pct === 'number') {
    chips.push({
      key: 'consistency_rule',
      label: 'Consistency rule',
      value: `${snapshot.consistency_rule.max_daily_pct}% daily cap`,
      status: 'forbidden',
      sourceUrl: snapshot.consistency_rule.source_url,
    })
  } else {
    chips.push({
      key: 'consistency_rule',
      label: 'Consistency rule',
      value: 'None',
      status: 'allowed',
      sourceUrl: snapshot.consistency_rule.source_url,
    })
  }

  chips.push({
    key: 'payout_split',
    label: 'Payout split',
    value: `${snapshot.payout_split_pct}%`,
    status: 'neutral',
    sourceUrl: fallbackSource,
  })

  return chips
}
```

### Step 3 — Run tests

`pnpm test -- snapshot-helpers` → expect 8 passed.
`pnpm tsc --noEmit` → expect clean.

### Step 4 — Commit

```bash
git add src/components/firm/snapshot-helpers.ts src/components/firm/snapshot-helpers.test.ts
git commit -m "$(cat <<'EOF'
feat: v1-f7 snapshot-helpers render model for SnapshotBar

Pure chip-building logic that maps DecisionSnapshot to 6 SnapshotChip
render models in a locked order. Handles boolean permissions, max-drawdown
currency formatting, consistency-rule on/off states, and payout-split %.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: SnapshotBar component

**Files:**
- Create: `src/components/firm/SnapshotBar.tsx`

### Public contract

```tsx
import type { DecisionSnapshot } from '../../../scripts/monitor/schema'

interface SnapshotBarProps {
  snapshot: DecisionSnapshot
}

export function SnapshotBar({ snapshot }: SnapshotBarProps): JSX.Element
```

### Visual spec

- No `use client` directive — server component.
- Renders a flex-wrap row of 6 Badges (one per chip from `buildSnapshotChips`) plus a `best_for` subtitle below.
- Each Badge variant mapping: `allowed` → green (`--verified-badge-*` palette for consistency), `forbidden` → red accent, `neutral` → default shadcn Badge styling.
- Each Badge wraps the label as `<span>`; the value renders inside the badge alongside (e.g., `News trading: Yes`).
- The `sourceUrl` is attached as an `aria-label` + `title` on each chip; no visible link icon at this size (v1-f8's `VerificationBadge` carries the source-trust signaling for the snapshot as a whole).
- Container: `var(--background)` (DATA layer — neutral, NOT tinted).
- Below the chip row: `<p className="text-sm text-[var(--muted-foreground)] mt-2">{snapshot.best_for}</p>`.

### Reference implementation

```tsx
import { Badge } from '@/components/ui/badge'
import type { DecisionSnapshot } from '../../../scripts/monitor/schema'
import { buildSnapshotChips, type ChipStatus } from './snapshot-helpers'

interface SnapshotBarProps {
  snapshot: DecisionSnapshot
}

function badgeClassForStatus(status: ChipStatus): string {
  switch (status) {
    case 'allowed':
      return 'bg-[var(--verified-badge-bg)] border-[var(--verified-badge-border)] text-[var(--verified-badge-fg)]'
    case 'forbidden':
      return 'bg-[var(--wikilink-missing-fg)]/10 border-[var(--wikilink-missing-fg)]/30 text-[var(--wikilink-missing-fg)]'
    case 'neutral':
      return ''
  }
}

/**
 * DATA layer — neutral background. Renders 6 chips built from the firm's
 * DecisionSnapshot plus a best_for subtitle.
 */
export function SnapshotBar({ snapshot }: SnapshotBarProps) {
  const chips = buildSnapshotChips(snapshot)

  return (
    <section aria-label="Firm snapshot" className="bg-[var(--background)] py-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Badge
            key={chip.key}
            variant="outline"
            className={badgeClassForStatus(chip.status)}
            title={`Source: ${chip.sourceUrl}`}
            aria-label={`${chip.label}: ${chip.value} (source: ${chip.sourceUrl})`}
          >
            <span className="font-medium">{chip.label}:</span>
            <span className="ml-1">{chip.value}</span>
          </Badge>
        ))}
      </div>
      <p className="text-sm text-[var(--muted-foreground)] mt-2">{snapshot.best_for}</p>
    </section>
  )
}
```

Verify the shadcn `Badge` import path: open `src/components/ui/badge.tsx` and confirm the named export `Badge` (and that it accepts `variant="outline"` and a `className` prop). If the repo uses `export default`, adjust the import. If `variant="outline"` isn't available, drop the prop.

### Step 1 — Write the component file

Paste the reference implementation above, adjusting the Badge import shape if needed based on the verification above.

### Step 2 — Type check

```bash
pnpm tsc --noEmit
```

Expected: clean. If the `../../../scripts/monitor/schema` import errors ("Cannot find module"), create `src/types/decision.ts` that re-exports the types:

```ts
export type {
  DecisionSnapshot,
  KillYouFirstEntry,
  FitScore,
  MaxDrawdown,
  ConsistencyRule,
  ChangelogEntry,
  ChecklistItem,
  Decision,
} from '../../scripts/monitor/schema'
```

…and import from `@/types/decision` in `SnapshotBar.tsx` and `snapshot-helpers.ts`. If that ALSO errors, check `tsconfig.json`'s `include` array — `scripts/**/*.ts` may need to be added.

### Step 3 — Full test + build

```bash
pnpm test
pnpm build
```

Expected: 101 + 8 = 109 passing tests. Build succeeds — Next.js will type-check the component and include it in the module graph even though no page mounts it yet.

### Step 4 — Commit

```bash
git add src/components/firm/SnapshotBar.tsx
# If you created src/types/decision.ts, also stage it:
# git add src/types/decision.ts
git commit -m "$(cat <<'EOF'
feat: v1-f7 SnapshotBar data-layer component

Server component that renders 6 chips from DecisionSnapshot (via
buildSnapshotChips) plus the best_for subtitle. Chip colors reuse the
existing --verified-badge-* palette for allowed state. Source URL
attached as accessible title on each chip.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: KillYouFirstList component

**Files:**
- Create: `src/components/firm/KillYouFirstList.tsx`

### Public contract

```tsx
import type { KillYouFirstEntry } from '../../../scripts/monitor/schema'

interface KillYouFirstListProps {
  warnings: KillYouFirstEntry[]
}

export function KillYouFirstList({ warnings }: KillYouFirstListProps): JSX.Element | null
```

### Visual spec

- OPINION layer — uses `background: var(--opinion-tint-bg)` + `border: 1px solid var(--opinion-tint-border)` per v1-f6 usage contract.
- Header row: a "Founder's opinion" label (small, uppercase, `text-[var(--muted-foreground)]`) + section title "Will kill your account first" (larger).
- Each warning item: `<article>` with a lucide `AlertTriangle` icon, title (`font-medium`), detail (`text-sm text-[var(--muted-foreground)]`), and a "Source" link (`text-xs`, `var(--link-fg)`) to `source_url`.
- When `warnings` is empty or undefined, return `null` (defensive — validator enforces `min(1)` but a stale firm file could be broken). **No placeholder UI.**

### Reference implementation

```tsx
import { AlertTriangle } from 'lucide-react'
import type { KillYouFirstEntry } from '../../../scripts/monitor/schema'

interface KillYouFirstListProps {
  warnings: KillYouFirstEntry[]
}

/**
 * OPINION layer — amber-tinted. Renders 2-3 "account killer" warnings
 * authored by the founder, each with a linked source.
 */
export function KillYouFirstList({ warnings }: KillYouFirstListProps) {
  if (!warnings || warnings.length === 0) return null

  return (
    <section
      aria-label="Account killers"
      className="rounded-lg p-4 mt-4 bg-[var(--opinion-tint-bg)] border border-[var(--opinion-tint-border)]"
    >
      <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-1">
        Founder&rsquo;s opinion
      </div>
      <h3 className="text-lg font-semibold mb-3">Will kill your account first</h3>
      <ul className="space-y-3">
        {warnings.map((w) => (
          <li key={w.title} className="flex gap-3">
            <AlertTriangle
              className="h-4 w-4 shrink-0 mt-1 text-[var(--wikilink-missing-fg)]"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-medium">{w.title}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{w.detail}</p>
              <a
                href={w.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--link-fg)] hover:underline"
              >
                Source
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

### Step 1 — Write the file

Paste the reference above. No test file — the component's only conditional is the empty-array null-render which is exercised by the build-time prerender of the real 4-firm corpus (each firm has >=1 entry). Keep the `if (!warnings || warnings.length === 0)` guard as explicit defense.

### Step 2 — Type check + build

```bash
pnpm tsc --noEmit
pnpm build
```

Both clean.

### Step 3 — Commit

```bash
git add src/components/firm/KillYouFirstList.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f7 KillYouFirstList opinion-layer component

Renders 2-3 founder-authored "account killer" warnings on an amber-tinted
surface (--opinion-tint-bg). Each entry has a source link. Null-renders
when the array is empty (defensive — schema enforces min(1), but a
corrupt file should not crash the page).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Fit-score helpers + tests

**Files:**
- Create: `src/components/firm/fit-score-helpers.ts`
- Test:   `src/components/firm/fit-score-helpers.test.ts`

### Public contract

```ts
import type { FitScore } from '../../../scripts/monitor/schema'

export interface FitScoreRow {
  key: keyof FitScore                  // e.g. 'ny_scalping'
  label: string                        // e.g. 'NY scalping'
  rating: number                       // 0..5
  display: string                      // "★★★★☆" for 4; "❌ not suitable" for 0
}

export function buildFitScoreRows(fitScore: FitScore): FitScoreRow[]
export function renderStars(rating: number): string
```

### Label mapping (locked)

- `ny_scalping` → `'NY scalping'`
- `swing_trading` → `'Swing trading'`
- `news_trading` → `'News trading'`
- `beginner_friendly` → `'Beginner friendly'`
- `scalable` → `'Scalable'`

### Star rendering

- `0` → `'❌ not suitable'` (per spec §4.2: "0 stars = ❌")
- `1..5` → `rating` copies of `'★'` (U+2605) followed by `(5 - rating)` copies of `'☆'` (U+2606). So `3` → `'★★★☆☆'`.
- Values outside 0..5 are clamped (defensive; schema enforces 0..5 but render should never crash). Clamp to the nearest in-range value.

### Step 1 — Write the failing tests

Create `src/components/firm/fit-score-helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildFitScoreRows, renderStars } from './fit-score-helpers'
import type { FitScore } from '../../../scripts/monitor/schema'

const SAMPLE: FitScore = {
  ny_scalping: 4,
  swing_trading: 1,
  news_trading: 5,
  beginner_friendly: 0,
  scalable: 3,
}

describe('renderStars', () => {
  it('renders 0 as the "not suitable" marker', () => {
    expect(renderStars(0)).toBe('❌ not suitable')
  })

  it('renders 1..5 as filled/empty star pairs summing to 5', () => {
    expect(renderStars(1)).toBe('★☆☆☆☆')
    expect(renderStars(3)).toBe('★★★☆☆')
    expect(renderStars(5)).toBe('★★★★★')
  })

  it('clamps out-of-range values', () => {
    expect(renderStars(-1)).toBe('❌ not suitable')
    expect(renderStars(10)).toBe('★★★★★')
  })
})

describe('buildFitScoreRows', () => {
  it('emits 5 rows in the locked order', () => {
    const rows = buildFitScoreRows(SAMPLE)
    expect(rows.map((r) => r.key)).toEqual([
      'ny_scalping',
      'swing_trading',
      'news_trading',
      'beginner_friendly',
      'scalable',
    ])
  })

  it('maps each key to its reader-friendly label and star display', () => {
    const rows = buildFitScoreRows(SAMPLE)
    const news = rows.find((r) => r.key === 'news_trading')!
    expect(news.label).toBe('News trading')
    expect(news.rating).toBe(5)
    expect(news.display).toBe('★★★★★')

    const beginner = rows.find((r) => r.key === 'beginner_friendly')!
    expect(beginner.label).toBe('Beginner friendly')
    expect(beginner.display).toBe('❌ not suitable')
  })
})
```

Run `pnpm test -- fit-score-helpers` — expect 5 failures ("Cannot find module").

### Step 2 — Implementation

Create `src/components/firm/fit-score-helpers.ts`:

```ts
import type { FitScore } from '../../../scripts/monitor/schema'

export interface FitScoreRow {
  key: keyof FitScore
  label: string
  rating: number
  display: string
}

const LABELS: Record<keyof FitScore, string> = {
  ny_scalping: 'NY scalping',
  swing_trading: 'Swing trading',
  news_trading: 'News trading',
  beginner_friendly: 'Beginner friendly',
  scalable: 'Scalable',
}

const ORDER: Array<keyof FitScore> = [
  'ny_scalping',
  'swing_trading',
  'news_trading',
  'beginner_friendly',
  'scalable',
]

export function renderStars(rating: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)))
  if (clamped === 0) return '❌ not suitable'
  return '★'.repeat(clamped) + '☆'.repeat(5 - clamped)
}

export function buildFitScoreRows(fitScore: FitScore): FitScoreRow[] {
  return ORDER.map((key) => {
    const rating = fitScore[key]
    return {
      key,
      label: LABELS[key],
      rating,
      display: renderStars(rating),
    }
  })
}
```

### Step 3 — Run tests

`pnpm test -- fit-score-helpers` → 5 passed.
`pnpm tsc --noEmit` → clean.

### Step 4 — Commit

```bash
git add src/components/firm/fit-score-helpers.ts src/components/firm/fit-score-helpers.test.ts
git commit -m "$(cat <<'EOF'
feat: v1-f7 fit-score-helpers render model for FitScoreTable

Pure helpers that map FitScore to 5 ordered rows with human labels and
star displays (★☆ for 1-5, "❌ not suitable" for 0, clamped for
defense). Locked label + order so the table layout is stable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: FitScoreTable component

**Files:**
- Create: `src/components/firm/FitScoreTable.tsx`

### Public contract

```tsx
import type { FitScore } from '../../../scripts/monitor/schema'

interface FitScoreTableProps {
  fitScore: FitScore
}

export function FitScoreTable({ fitScore }: FitScoreTableProps): JSX.Element
```

### Visual spec

- OPINION layer — `--opinion-tint-bg` + `--opinion-tint-border`.
- "Founder's opinion" label at top (small uppercase, matches `KillYouFirstList`).
- Section title: "Fit score".
- 5-row table/grid: trading style on the left, star display (or "❌ not suitable") on the right.
- Rendered as a `<table>` for semantic HTML (it's a table of ratings) — use the repo's existing `prose`-style table treatment. See `docs/ui-guide.md` §3.5 blockquote/table section for the styling rules (transparent bg, normal-weight headers).
- No header row (the two columns are self-evident; a header would be decorative overhead).

### Reference implementation

```tsx
import type { FitScore } from '../../../scripts/monitor/schema'
import { buildFitScoreRows } from './fit-score-helpers'

interface FitScoreTableProps {
  fitScore: FitScore
}

/**
 * OPINION layer — amber-tinted. Renders the 5-row fit-score table for
 * this firm. Star display uses U+2605/U+2606; 0 stars renders as
 * "❌ not suitable".
 */
export function FitScoreTable({ fitScore }: FitScoreTableProps) {
  const rows = buildFitScoreRows(fitScore)

  return (
    <section
      aria-label="Fit score"
      className="rounded-lg p-4 mt-4 bg-[var(--opinion-tint-bg)] border border-[var(--opinion-tint-border)]"
    >
      <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-1">
        Founder&rsquo;s opinion
      </div>
      <h3 className="text-lg font-semibold mb-3">Fit score</h3>
      <table className="w-full border-collapse">
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-[var(--opinion-tint-border)]">
              <td className="py-2 pr-4 text-[var(--foreground)]">{r.label}</td>
              <td className="py-2 text-right font-mono tracking-wide">{r.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
```

### Step 1 — Write the file

Paste the reference.

### Step 2 — Type check + build

```bash
pnpm tsc --noEmit
pnpm build
```

Both clean.

### Step 3 — Commit

```bash
git add src/components/firm/FitScoreTable.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f7 FitScoreTable opinion-layer component

5-row table of trading style × star rating for the firm, rendered on an
amber-tinted surface. Star display via fit-score-helpers. No header row
(columns are self-evident). Semantic <table> markup.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Full validation + fast-forward to main

### Step 1 — Full test + type check + build

```bash
pnpm tsc --noEmit
pnpm test
pnpm build
```

Expected:
- `tsc`: clean
- `test`: 114/114 (previous 101 + 8 snapshot + 5 fit-score)
- `build`: succeeds with no errors. Pre-existing `react-hooks/set-state-in-effect` lint warnings in `src/components/content/ContentPanelRight.tsx` are not introduced by this branch.

### Step 2 — Commit the plan doc

```bash
git add docs/superpowers/plans/2026-04-23-v1-f7-decision-header.md
git commit -m "$(cat <<'EOF'
docs: v1-f7 plan

Reference artifact kept alongside v1-f1..f6 plans.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 3 — Fast-forward merge to main + push (no PR)

Per Jason's 2026-04-23 directive ("no need to open PR, just commit and push to main"):

```bash
git checkout main
git pull --ff-only origin main
git merge --ff-only feat/v1-f7-decision-header
git push origin main
```

If `--ff-only` fails (e.g. main advanced while you were working), rebase the feature branch onto main first:

```bash
git checkout feat/v1-f7-decision-header
git rebase origin/main
git checkout main
git merge --ff-only feat/v1-f7-decision-header
git push origin main
```

### Step 4 — Delete the feature branch

```bash
git branch -d feat/v1-f7-decision-header
git push origin --delete feat/v1-f7-decision-header 2>/dev/null || true
```

---

## Self-review (performed by plan author)

**1. Spec coverage:**
- [x] §4.2 SnapshotBar — Task 1 + Task 2.
- [x] §4.2 KillYouFirstList — Task 3.
- [x] §4.2 FitScoreTable — Task 4 + Task 5.
- [x] §3.4 three-layer architecture — KillYouFirstList + FitScoreTable use `--opinion-tint-*`; SnapshotBar uses neutral `--background`.
- [x] "Founder's opinion" label present on both OPINION components.
- [x] 0 stars = ❌ (Task 4 spec'd explicitly + tested).

**2. Placeholder scan:** None. Every code block is complete. Every helper has a test.

**3. Type consistency:**
- All three components import types from `../../../scripts/monitor/schema` consistently.
- `SnapshotChip` / `FitScoreRow` / `ChipStatus` are defined once each and reused across tasks.
- Helper function names (`buildSnapshotChips`, `formatDrawdownType`, `formatDrawdownValue`, `renderStars`, `buildFitScoreRows`) match across tasks.

**4. Scope guard:**
- No page wiring (`app/firms/[slug]/page.tsx`) — that's v1-f9.
- No RuleBreakdown, Changelog, PreTradeChecklist, AffiliateCTA, VerificationBadge — those are v1-f8.
- No ThemeProvider changes — themes + opinion tints already landed in v1-f6.

**5. Rollback plan:** All changes are additive files under `src/components/firm/*`. Reverting the 5 feat commits plus the plan-doc commit returns `main` to the v1-f6 state with zero consumer impact (no page mounts these yet).
