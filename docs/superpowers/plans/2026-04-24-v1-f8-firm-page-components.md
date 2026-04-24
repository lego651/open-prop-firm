# v1-f8 — Firm-Page Data + Action Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the five firm-page components that sit below the Decision Header: `RuleBreakdown` (collapsible H2 sections from `rules.md`), `Changelog` (entries from `decision.changelog[]` with Stability Indicator UI placeholder), `PreTradeChecklist` (interactive + localStorage, graceful degradation), `AffiliateCTA` (null-render when `affiliate.url === null`), and `VerificationBadge` (7-day staleness warning). v1-f9 composes these plus v1-f7 into the firm page.

**Architecture:** Four server-rendered presentational components + one client component (`PreTradeChecklist`, because it owns persistent UI state). Each component has its render-model logic extracted into a pure helper module with vitest coverage; components stay thin. No new routes, no new pages — these are leaf components v1-f9 will wire in.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui (`Button`, `Checkbox`), `lucide-react` icons, `cheerio` (already a dep, used for HTML section splitting in `RuleBreakdown`), Zod schema types from `scripts/monitor/schema.ts`, vitest (`environment: node`) for pure helpers.

---

## Spec traceability

- **Spec §4.2 (below the header)** — five components listed, each mapped to one task group in this plan.
- **Spec §3.4 three-layer page** — DATA components (`RuleBreakdown`, `Changelog`, `VerificationBadge`) use neutral `var(--background)`; ACTION components (`PreTradeChecklist`, `AffiliateCTA`) use `--action-tint-bg` + `--action-tint-border` (v1-f6).
- **Spec §5.4 checklist semantics** — per-firm `localStorage` key `checklist:<firmSlug>`; user-initiated reset only (no auto-reset on date/session/reload); try/catch fallback to in-memory state.
- **Spec §6 error handling table** — each error mode is mapped to a defensive branch in the matching component:
  - `last_verified > 7 days` → amber stale warning in `VerificationBadge`.
  - `affiliate.url === null` → `AffiliateCTA` renders nothing.
  - `localStorage disabled/quota exceeded` → `PreTradeChecklist` falls back to in-memory state.
  - Duplicate / empty changelog → `Changelog` renders a "No changes tracked yet" empty-state and never crashes.
- **v1-f6 usage contract** (`docs/ui-guide.md` §6.5) — ACTION components use `background: var(--action-tint-bg); border: 1px solid var(--action-tint-border);`.
- **Stability Indicator explicit v1 scope** (spec §8) — UI placeholder only. `Changelog` renders the string `"—"` in the header slot; no computation, no data wiring.

---

## Testing strategy

Follows the v1-f7 pattern:

- **Pure helpers** (`changelog-helpers.ts`, `verification-helpers.ts`, `rule-breakdown-helpers.ts`, `checklist-storage.ts`) → vitest with `environment: node`, covering every branch.
- **Components** → no unit tests (repo has no jsdom/RTL setup; adding one is out of scope). Validation comes from `pnpm build` (Next.js prerenders every route; v1-f9 will mount these and surface crash bugs) + manual QA on staging.
- **Client component state transitions** for `PreTradeChecklist` are tested by extracting the localStorage read/write/clear/toggle logic into `checklist-storage.ts` and testing that module with a mock `Storage` object — no DOM needed.

---

## File structure

**New files:**

Helpers (pure, tested):
- `src/components/firm/changelog-helpers.ts`
- `src/components/firm/changelog-helpers.test.ts`
- `src/components/firm/verification-helpers.ts`
- `src/components/firm/verification-helpers.test.ts`
- `src/components/firm/rule-breakdown-helpers.ts`
- `src/components/firm/rule-breakdown-helpers.test.ts`
- `src/components/firm/checklist-storage.ts`
- `src/components/firm/checklist-storage.test.ts`

Components:
- `src/components/firm/Changelog.tsx` — server component, DATA layer
- `src/components/firm/VerificationBadge.tsx` — server component, DATA layer
- `src/components/firm/RuleBreakdown.tsx` — server component, DATA layer
- `src/components/firm/PreTradeChecklist.tsx` — client component, ACTION layer
- `src/components/firm/AffiliateCTA.tsx` — server component, ACTION layer

**Existing files touched:** none. All new files. v1-f9 imports these later.

**No new npm deps.** `cheerio` is already in `package.json` (used by graph-data scripts).

**Path alias note:** `@/*` maps to `./src/*`. `scripts/monitor/schema.ts` sits at repo root. Use the same import path v1-f7 landed on: `../../../scripts/monitor/schema`. If TS errors on module resolution, fall back to creating `src/types/decision.ts` that re-exports the types (exact pattern noted in v1-f7 Task 2 Step 2).

---

## Locked type contracts (imported, not redefined)

```ts
import type {
  ChangelogEntry,
  ChecklistItem,
  Affiliate,
  Decision,
} from '../../../scripts/monitor/schema'
```

Types live in `scripts/monitor/schema.ts` (v1-f1). Shapes already verified in v1-f7's plan; the only ones new to v1-f8:

```ts
// ChangelogEntry
{ date: string /* YYYY-MM-DD */; field: string; from: unknown; to: unknown; source_url: string }

// ChecklistItem
{ id: string /* snake_case */; label: string }

// Affiliate
{ url: string | null; utm: string }
```

Existing `Frontmatter` type at `src/types/content.ts` has `last_verified: string` (ISO 8601) and `verified_by: 'bot' | 'manual'`. `VerificationBadge` reads those two fields directly.

---

## Task 1: Changelog helpers + tests

**Files:**
- Create: `src/components/firm/changelog-helpers.ts`
- Test:   `src/components/firm/changelog-helpers.test.ts`

### Public contract

```ts
import type { ChangelogEntry } from '../../../scripts/monitor/schema'

export interface ChangelogRow {
  key: string                // stable React key, e.g. "2026-04-22|snapshot.consistency_rule.enabled"
  date: string               // YYYY-MM-DD, rendered as-is
  field: string              // e.g. "snapshot.consistency_rule.enabled"
  fromDisplay: string        // stringified "from" value
  toDisplay: string          // stringified "to" value
  sourceUrl: string
}

export function sortEntriesDescending(entries: ChangelogEntry[]): ChangelogEntry[]
export function formatChangelogValue(value: unknown): string
export function buildChangelogRows(entries: ChangelogEntry[]): ChangelogRow[]
```

### Rules (locked)

- **Sort:** descending by `date` (most recent first). If two entries share a date, preserve input order (stable sort).
- **`formatChangelogValue`** converts any `unknown` to a human-readable string:
  - `null` / `undefined` → `'—'` (em dash)
  - `boolean` → `'Yes'` for `true`, `'No'` for `false`
  - `number` → `String(value)` (no formatting — field semantics vary too much to pick a unit here)
  - `string` → the string itself
  - any other type (object, array) → `JSON.stringify(value)`
- **Key generation:** `\`${date}|${field}\`` — changelog entries are deduped upstream by `{date, field, from, to}` so this key is unique per row.

### Step 1 — Write the failing tests

Create `src/components/firm/changelog-helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  sortEntriesDescending,
  formatChangelogValue,
  buildChangelogRows,
} from './changelog-helpers'
import type { ChangelogEntry } from '../../../scripts/monitor/schema'

const ENTRY = (date: string, field: string, from: unknown, to: unknown): ChangelogEntry => ({
  date,
  field,
  from,
  to,
  source_url: 'https://example.com/src',
})

describe('formatChangelogValue', () => {
  it('renders null and undefined as em dash', () => {
    expect(formatChangelogValue(null)).toBe('—')
    expect(formatChangelogValue(undefined)).toBe('—')
  })

  it('renders booleans as Yes/No', () => {
    expect(formatChangelogValue(true)).toBe('Yes')
    expect(formatChangelogValue(false)).toBe('No')
  })

  it('renders numbers as plain stringified numbers', () => {
    expect(formatChangelogValue(80)).toBe('80')
    expect(formatChangelogValue(0)).toBe('0')
    expect(formatChangelogValue(2500.5)).toBe('2500.5')
  })

  it('renders strings as-is', () => {
    expect(formatChangelogValue('trailing_eod')).toBe('trailing_eod')
    expect(formatChangelogValue('')).toBe('')
  })

  it('JSON-stringifies objects and arrays', () => {
    expect(formatChangelogValue({ a: 1 })).toBe('{"a":1}')
    expect(formatChangelogValue([1, 2])).toBe('[1,2]')
  })
})

describe('sortEntriesDescending', () => {
  it('sorts by date descending', () => {
    const input = [
      ENTRY('2026-01-01', 'a', 1, 2),
      ENTRY('2026-04-22', 'b', 3, 4),
      ENTRY('2026-03-15', 'c', 5, 6),
    ]
    const sorted = sortEntriesDescending(input)
    expect(sorted.map((e) => e.date)).toEqual(['2026-04-22', '2026-03-15', '2026-01-01'])
  })

  it('is stable when dates collide', () => {
    const input = [
      ENTRY('2026-04-22', 'first', 1, 2),
      ENTRY('2026-04-22', 'second', 3, 4),
      ENTRY('2026-04-22', 'third', 5, 6),
    ]
    const sorted = sortEntriesDescending(input)
    expect(sorted.map((e) => e.field)).toEqual(['first', 'second', 'third'])
  })

  it('does not mutate the input array', () => {
    const input = [ENTRY('2026-01-01', 'a', 1, 2), ENTRY('2026-04-22', 'b', 3, 4)]
    const snapshot = [...input]
    sortEntriesDescending(input)
    expect(input).toEqual(snapshot)
  })
})

describe('buildChangelogRows', () => {
  it('returns empty array for empty input', () => {
    expect(buildChangelogRows([])).toEqual([])
  })

  it('formats one row end-to-end', () => {
    const rows = buildChangelogRows([ENTRY('2026-04-22', 'snapshot.consistency_rule.enabled', false, true)])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      key: '2026-04-22|snapshot.consistency_rule.enabled',
      date: '2026-04-22',
      field: 'snapshot.consistency_rule.enabled',
      fromDisplay: 'No',
      toDisplay: 'Yes',
      sourceUrl: 'https://example.com/src',
    })
  })

  it('returns rows in descending-date order', () => {
    const rows = buildChangelogRows([
      ENTRY('2026-01-01', 'a', 1, 2),
      ENTRY('2026-04-22', 'b', 3, 4),
    ])
    expect(rows.map((r) => r.date)).toEqual(['2026-04-22', '2026-01-01'])
  })
})
```

Run `pnpm test -- changelog-helpers` — expect all to fail with "Cannot find module './changelog-helpers'".

### Step 2 — Implementation

Create `src/components/firm/changelog-helpers.ts`:

```ts
import type { ChangelogEntry } from '../../../scripts/monitor/schema'

export interface ChangelogRow {
  key: string
  date: string
  field: string
  fromDisplay: string
  toDisplay: string
  sourceUrl: string
}

export function formatChangelogValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

export function sortEntriesDescending(entries: ChangelogEntry[]): ChangelogEntry[] {
  return entries
    .map((entry, i) => ({ entry, i }))
    .sort((a, b) => {
      if (a.entry.date < b.entry.date) return 1
      if (a.entry.date > b.entry.date) return -1
      return a.i - b.i
    })
    .map((x) => x.entry)
}

export function buildChangelogRows(entries: ChangelogEntry[]): ChangelogRow[] {
  return sortEntriesDescending(entries).map((e) => ({
    key: `${e.date}|${e.field}`,
    date: e.date,
    field: e.field,
    fromDisplay: formatChangelogValue(e.from),
    toDisplay: formatChangelogValue(e.to),
    sourceUrl: e.source_url,
  }))
}
```

### Step 3 — Run tests

```bash
pnpm test -- changelog-helpers
pnpm tsc --noEmit
```

Expected: all tests pass, tsc clean.

### Step 4 — Commit

```bash
git add src/components/firm/changelog-helpers.ts src/components/firm/changelog-helpers.test.ts
git commit -m "$(cat <<'EOF'
feat: v1-f8 changelog-helpers render model for Changelog

Pure helpers mapping ChangelogEntry[] to sorted ChangelogRow[]. Covers
null/bool/number/string/object value formatting, stable descending sort,
and key generation for React lists.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Changelog component

**Files:**
- Create: `src/components/firm/Changelog.tsx`

### Public contract

```tsx
import type { ChangelogEntry } from '../../../scripts/monitor/schema'

interface ChangelogProps {
  entries: ChangelogEntry[]
}

export function Changelog({ entries }: ChangelogProps): JSX.Element
```

### Visual spec

- DATA layer — neutral `var(--background)`; no tint.
- Section title: "Rule change history".
- **Stability Indicator placeholder:** subtitle line `<p className="text-xs text-[var(--muted-foreground)]">Stability: —</p>`. The `—` is literal (per spec §8: v1 ships the placeholder only). Do not compute, do not read any data.
- **Empty state:** when `entries.length === 0`, render the title + placeholder line + a single `<p className="text-sm text-[var(--muted-foreground)]">No changes tracked yet.</p>`. No table.
- **Non-empty:** `<table>` with columns `Date`, `Field`, `Change`, `Source`.
  - `Change` column renders `fromDisplay` → `toDisplay` joined by `<span aria-label="changed to">→</span>`.
  - `Source` column is an external-target link: `<a href={row.sourceUrl} target="_blank" rel="noreferrer">view</a>`.
- Semantic `<table>` — matches repo's prose table styling per `docs/ui-guide.md` §3.5.
- No header-row emphasis beyond what the theme provides; `font-weight: 400` on `<th>` per ui-guide.

### Reference implementation

```tsx
import type { ChangelogEntry } from '../../../scripts/monitor/schema'
import { buildChangelogRows } from './changelog-helpers'

interface ChangelogProps {
  entries: ChangelogEntry[]
}

/**
 * DATA layer — neutral. Renders rule-change history with Stability
 * Indicator placeholder (v1 = "—"; v2 will compute).
 */
export function Changelog({ entries }: ChangelogProps) {
  const rows = buildChangelogRows(entries)

  return (
    <section aria-label="Rule change history" className="mt-6">
      <h3 className="text-lg font-semibold">Rule change history</h3>
      <p className="text-xs text-[var(--muted-foreground)] mb-3">Stability: —</p>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No changes tracked yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
              <th className="py-2 pr-4 text-left font-normal">Date</th>
              <th className="py-2 pr-4 text-left font-normal">Field</th>
              <th className="py-2 pr-4 text-left font-normal">Change</th>
              <th className="py-2 text-left font-normal">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-[var(--border)]">
                <td className="py-2 pr-4 font-mono">{r.date}</td>
                <td className="py-2 pr-4 font-mono">{r.field}</td>
                <td className="py-2 pr-4">
                  <span>{r.fromDisplay}</span>
                  <span aria-label="changed to" className="mx-1 text-[var(--muted-foreground)]">→</span>
                  <span>{r.toDisplay}</span>
                </td>
                <td className="py-2">
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--link-fg)] hover:underline"
                  >
                    view
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
```

### Step 1 — Write the file

Paste the reference above.

### Step 2 — Type check + build

```bash
pnpm tsc --noEmit
pnpm build
```

Both clean. (No page mounts the component yet, so build only type-checks it.)

### Step 3 — Commit

```bash
git add src/components/firm/Changelog.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f8 Changelog data-layer component

Server component rendering decision.changelog[] entries as a descending-
date table. Includes Stability Indicator UI placeholder ("—") per v1
scope — no computation; v2 owns the real metric. Empty-state handled
with a friendly message.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Verification helpers + tests

**Files:**
- Create: `src/components/firm/verification-helpers.ts`
- Test:   `src/components/firm/verification-helpers.test.ts`

### Public contract

```ts
export interface VerificationDisplay {
  isoDate: string               // original input, passed through for `<time dateTime>`
  humanDate: string             // e.g. "Apr 24, 2026"
  daysSince: number             // whole days, floor
  isStale: boolean              // true if daysSince > threshold (default 7)
  verifiedBy: 'bot' | 'manual'
}

export function daysSince(lastVerified: string, now?: Date): number
export function buildVerificationDisplay(
  lastVerified: string,
  verifiedBy: 'bot' | 'manual',
  now?: Date,
  thresholdDays?: number,
): VerificationDisplay
```

### Rules (locked)

- `daysSince` accepts ISO 8601 string, parses via `new Date()`, computes `floor((now - lastVerified) / 86_400_000)`.
- Negative diffs (future `lastVerified`) → `0`. Never negative.
- `thresholdDays` default: `7`. Stale when `daysSince > threshold` (strictly greater — day 7 itself is still fresh).
- `humanDate` format: `'{MMM} {d}, {yyyy}'` via `Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' })`. Example: `Apr 24, 2026`.
- All tests inject `now` so they're deterministic — never rely on real time.

### Step 1 — Write the failing tests

Create `src/components/firm/verification-helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { daysSince, buildVerificationDisplay } from './verification-helpers'

const NOW = new Date('2026-04-24T00:00:00Z')

describe('daysSince', () => {
  it('returns 0 when last_verified is the same moment as now', () => {
    expect(daysSince('2026-04-24T00:00:00Z', NOW)).toBe(0)
  })

  it('returns whole days elapsed, floored', () => {
    expect(daysSince('2026-04-23T00:00:00Z', NOW)).toBe(1)
    expect(daysSince('2026-04-17T00:00:00Z', NOW)).toBe(7)
    expect(daysSince('2026-04-10T12:00:00Z', NOW)).toBe(13) // 13.5d floored
  })

  it('clamps negative diffs (future last_verified) to 0', () => {
    expect(daysSince('2026-05-01T00:00:00Z', NOW)).toBe(0)
  })
})

describe('buildVerificationDisplay', () => {
  it('is not stale when exactly 7 days old', () => {
    const d = buildVerificationDisplay('2026-04-17T00:00:00Z', 'bot', NOW)
    expect(d.daysSince).toBe(7)
    expect(d.isStale).toBe(false)
  })

  it('is stale at 8 days', () => {
    const d = buildVerificationDisplay('2026-04-16T00:00:00Z', 'bot', NOW)
    expect(d.daysSince).toBe(8)
    expect(d.isStale).toBe(true)
  })

  it('respects a custom threshold', () => {
    const d = buildVerificationDisplay('2026-04-22T00:00:00Z', 'bot', NOW, 1)
    expect(d.daysSince).toBe(2)
    expect(d.isStale).toBe(true)
  })

  it('formats a human-readable date', () => {
    const d = buildVerificationDisplay('2026-04-17T14:30:00Z', 'manual', NOW)
    expect(d.humanDate).toBe('Apr 17, 2026')
    expect(d.verifiedBy).toBe('manual')
    expect(d.isoDate).toBe('2026-04-17T14:30:00Z')
  })
})
```

Run `pnpm test -- verification-helpers` — expect all to fail.

### Step 2 — Implementation

Create `src/components/firm/verification-helpers.ts`:

```ts
const DAY_MS = 86_400_000

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export interface VerificationDisplay {
  isoDate: string
  humanDate: string
  daysSince: number
  isStale: boolean
  verifiedBy: 'bot' | 'manual'
}

export function daysSince(lastVerified: string, now: Date = new Date()): number {
  const last = new Date(lastVerified).getTime()
  const diffMs = now.getTime() - last
  if (diffMs <= 0) return 0
  return Math.floor(diffMs / DAY_MS)
}

export function buildVerificationDisplay(
  lastVerified: string,
  verifiedBy: 'bot' | 'manual',
  now: Date = new Date(),
  thresholdDays: number = 7,
): VerificationDisplay {
  const d = daysSince(lastVerified, now)
  return {
    isoDate: lastVerified,
    humanDate: DATE_FORMAT.format(new Date(lastVerified)),
    daysSince: d,
    isStale: d > thresholdDays,
    verifiedBy,
  }
}
```

### Step 3 — Run tests

```bash
pnpm test -- verification-helpers
pnpm tsc --noEmit
```

### Step 4 — Commit

```bash
git add src/components/firm/verification-helpers.ts src/components/firm/verification-helpers.test.ts
git commit -m "$(cat <<'EOF'
feat: v1-f8 verification-helpers staleness + display model

Pure helpers computing days-since-verified and building VerificationDisplay.
Default threshold 7 days (strictly greater triggers stale). Human date via
Intl.DateTimeFormat UTC, e.g. "Apr 24, 2026". All tests inject `now` for
determinism.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: VerificationBadge component

**Files:**
- Create: `src/components/firm/VerificationBadge.tsx`

**Note on naming:** the repo already has `src/components/content/VerifiedBadge.tsx` (used by the frozen `/vault` UI; takes `lastVerified`, `status` — different props, different semantics). We create a new `VerificationBadge.tsx` under `src/components/firm/` rather than extending the existing one — the two badges serve different flows and the `/vault` one must stay untouched during v1.

### Public contract

```tsx
interface VerificationBadgeProps {
  lastVerified: string         // ISO 8601 UTC
  verifiedBy: 'bot' | 'manual'
  sourcesUrl?: string | null   // optional hover/click target; if absent, badge is non-interactive
}

export function VerificationBadge(props: VerificationBadgeProps): JSX.Element
```

### Visual spec

- DATA layer — neutral surface. Inline element, rendered above `SnapshotBar` on the firm page (v1-f9 positions it).
- Two states:
  - **Fresh** (`isStale === false`): green-ish small pill with `CheckCircle` icon from `lucide-react`. Text: `Last verified: Apr 24, 2026 (bot)` — verifiedBy in parens.
  - **Stale** (`isStale === true`): amber pill with `AlertTriangle` icon. Text: `⚠ Stale — last verified 12 days ago (bot)`.
- Both states include a `<time dateTime={isoDate}>` wrapping the date for machine-readability.
- If `sourcesUrl` is provided, the whole pill is wrapped in `<a href={sourcesUrl} target="_blank" rel="noreferrer" title="View sources">` — the hover-link spec (§4.2 row "VerificationBadge").
- Color tokens:
  - Fresh: reuse `--verified-badge-*` (same palette the existing `VerifiedBadge.tsx` uses — keeps visual parity).
  - Stale: amber using `--opinion-tint-bg` + `--opinion-tint-border` + a foreground from the existing `--wikilink-missing-fg` or a new `--warn-fg` if present (check `themes.css` first; if not present, use the hex `text-amber-600 dark:text-amber-400` as a last resort — but prefer an existing token).

### Reference implementation

```tsx
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { buildVerificationDisplay } from './verification-helpers'

interface VerificationBadgeProps {
  lastVerified: string
  verifiedBy: 'bot' | 'manual'
  sourcesUrl?: string | null
}

/**
 * DATA layer. Fresh (<=7 days) renders green "Last verified" pill.
 * Stale (>7 days) renders amber warning pill. Optional sourcesUrl
 * wraps the pill in a link.
 */
export function VerificationBadge({ lastVerified, verifiedBy, sourcesUrl }: VerificationBadgeProps) {
  const d = buildVerificationDisplay(lastVerified, verifiedBy)

  const pill = d.isStale ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--opinion-tint-border)] bg-[var(--opinion-tint-bg)] px-3 py-1 text-xs font-medium">
      <AlertTriangle size={12} aria-hidden="true" />
      <span>
        Stale — last verified{' '}
        <time dateTime={d.isoDate}>{d.daysSince} days ago</time>
        {' '}
        ({verifiedBy})
      </span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--verified-badge-border)] bg-[var(--verified-badge-bg)] px-3 py-1 text-xs font-medium text-[var(--verified-badge-fg)]">
      <CheckCircle size={12} aria-hidden="true" />
      <span>
        Last verified: <time dateTime={d.isoDate}>{d.humanDate}</time> ({verifiedBy})
      </span>
    </span>
  )

  if (sourcesUrl) {
    return (
      <a href={sourcesUrl} target="_blank" rel="noreferrer" title="View sources" className="inline-block">
        {pill}
      </a>
    )
  }
  return pill
}
```

**Before pasting:** open `src/styles/themes.css` and confirm `--verified-badge-bg`, `--verified-badge-border`, `--verified-badge-fg` exist (the existing `VerifiedBadge.tsx` references them — they should). If they don't, fall back to `--opinion-tint-*` for the fresh state too and note the mismatch in the commit message.

### Step 1 — Write the file

Paste the reference above.

### Step 2 — Type check + build

```bash
pnpm tsc --noEmit
pnpm build
```

Both clean.

### Step 3 — Commit

```bash
git add src/components/firm/VerificationBadge.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f8 VerificationBadge with staleness warning

Server component rendering fresh/stale pill based on 7-day threshold
(via verification-helpers). Fresh uses --verified-badge-* palette for
parity with /vault's VerifiedBadge. Stale uses --opinion-tint-* amber.
Optional sourcesUrl wraps the pill in a link per spec §4.2 hover-link
requirement.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Rule-breakdown helpers + tests

**Files:**
- Create: `src/components/firm/rule-breakdown-helpers.ts`
- Test:   `src/components/firm/rule-breakdown-helpers.test.ts`

### Public contract

```ts
export interface RuleSection {
  slug: string            // stable React key, e.g. "drawdown-rules" (derived from title)
  title: string           // the H2 text
  html: string            // inner HTML between this H2 and the next (siblings only)
}

export function splitRulesIntoSections(rulesHtml: string): RuleSection[]
```

### Rules (locked)

- Input is the HTML string produced by `getPageContent` for `rules.md` (sanitized already by `rehypeSanitize`).
- Split on every top-level `<h2>` element. The `<h2>` itself is stripped from the emitted `html` (the component re-renders it in the `<summary>`).
- Content between H2s (including `<h3>` subheadings, paragraphs, tables, lists) is preserved verbatim as innerHTML.
- Content **before** the first H2 is dropped (it's typically a firm-summary paragraph that duplicates `index.md` — keeping it here would violate single-source-of-truth).
- If no `<h2>` exists, returns `[]` — the component renders nothing (defensive; `rules.md` should always have sections).
- Use `cheerio` (already a dep via `package.json` line `"cheerio": "^1.2.0"`). Import as `import { load } from 'cheerio'`.
- `slug` derivation: lowercase + replace non-alphanumeric runs with `-` + strip leading/trailing `-`. Example: `"Drawdown Rules"` → `"drawdown-rules"`.

### Step 1 — Write the failing tests

Create `src/components/firm/rule-breakdown-helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { splitRulesIntoSections } from './rule-breakdown-helpers'

const FIXTURE = `
<p>Intro paragraph that should be dropped.</p>
<h2>Drawdown Rules</h2>
<p>Daily drawdown is balance-based.</p>
<ul><li>One</li><li>Two</li></ul>
<h2>Trading Restrictions</h2>
<h3>EAs</h3>
<p>Permitted for execution only.</p>
<h2>Consistency Rules</h2>
<p>No formal rule.</p>
`.trim()

describe('splitRulesIntoSections', () => {
  it('returns empty array when there are no H2s', () => {
    expect(splitRulesIntoSections('<p>No headings here.</p>')).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(splitRulesIntoSections('')).toEqual([])
  })

  it('emits one section per top-level H2', () => {
    const sections = splitRulesIntoSections(FIXTURE)
    expect(sections.map((s) => s.title)).toEqual([
      'Drawdown Rules',
      'Trading Restrictions',
      'Consistency Rules',
    ])
  })

  it('derives URL-safe slugs from titles', () => {
    const sections = splitRulesIntoSections(FIXTURE)
    expect(sections.map((s) => s.slug)).toEqual([
      'drawdown-rules',
      'trading-restrictions',
      'consistency-rules',
    ])
  })

  it('preserves all sibling content until the next H2 in the html field', () => {
    const sections = splitRulesIntoSections(FIXTURE)
    expect(sections[0].html).toContain('Daily drawdown is balance-based.')
    expect(sections[0].html).toContain('<ul>')
    expect(sections[0].html).not.toContain('Trading Restrictions')

    expect(sections[1].html).toContain('<h3>EAs</h3>')
    expect(sections[1].html).toContain('Permitted for execution only.')
    expect(sections[1].html).not.toContain('Consistency Rules')
  })

  it('drops content before the first H2', () => {
    const sections = splitRulesIntoSections(FIXTURE)
    const joined = sections.map((s) => s.html).join('')
    expect(joined).not.toContain('Intro paragraph that should be dropped')
  })
})
```

Run `pnpm test -- rule-breakdown-helpers` — expect all to fail.

### Step 2 — Implementation

Create `src/components/firm/rule-breakdown-helpers.ts`:

```ts
import { load } from 'cheerio'

export interface RuleSection {
  slug: string
  title: string
  html: string
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function splitRulesIntoSections(rulesHtml: string): RuleSection[] {
  if (!rulesHtml) return []

  const $ = load(`<div id="__root">${rulesHtml}</div>`)
  const root = $('#__root')
  const sections: RuleSection[] = []

  const h2s = root.children('h2').toArray()
  if (h2s.length === 0) return []

  for (const h2 of h2s) {
    const $h2 = $(h2)
    const title = $h2.text().trim()
    const siblings: string[] = []
    let node = h2.next
    while (node && !(node.type === 'tag' && 'name' in node && node.name === 'h2')) {
      siblings.push($.html(node))
      node = node.next
    }
    sections.push({
      slug: slugify(title),
      title,
      html: siblings.join(''),
    })
  }

  return sections
}
```

**Cheerio API notes (v1.x):**
- `load(html)` returns a `$` function.
- `$(selector).children(tagName)` selects direct children only — the behavior we want (don't dive into nested H2s inside tables etc.).
- Traversal via the DOM node's `.next` pointer is stable across cheerio 1.x; `.name` check works on tag nodes.
- `$.html(node)` serializes a single node back to HTML string.

### Step 3 — Run tests

```bash
pnpm test -- rule-breakdown-helpers
pnpm tsc --noEmit
```

If cheerio's node-pointer traversal API differs from the above (it's been stable since 1.0 but double-check), adapt to use the `nextUntil('h2')` jQuery-style selector:

```ts
const $siblings = $h2.nextUntil('h2')
const html = $siblings.toArray().map((n) => $.html(n)).join('')
```

Both approaches work; prefer whichever type-checks clean.

### Step 4 — Commit

```bash
git add src/components/firm/rule-breakdown-helpers.ts src/components/firm/rule-breakdown-helpers.test.ts
git commit -m "$(cat <<'EOF'
feat: v1-f8 rule-breakdown-helpers HTML section splitter

Pure helper using cheerio to split rules.md's rendered HTML into one
RuleSection per top-level H2. Preserves inner HTML verbatim between
headings; drops preamble above the first H2 to avoid duplicating the
firm-summary paragraph from index.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: RuleBreakdown component

**Files:**
- Create: `src/components/firm/RuleBreakdown.tsx`

### Public contract

```tsx
interface RuleBreakdownProps {
  rulesHtml: string     // output of getPageContent().htmlContent for firms/<cat>/<slug>/rules
}

export function RuleBreakdown({ rulesHtml }: RuleBreakdownProps): JSX.Element | null
```

### Visual spec

- DATA layer — neutral.
- Section title: "Rule breakdown".
- Sections render as native HTML `<details>` elements (zero-JS collapsibles; default-closed).
- `<summary>` contains the section title; default marker is fine (can be styled later).
- Section body is `dangerouslySetInnerHTML` — the HTML is already `rehypeSanitize`-cleaned upstream by `getPageContent`.
- If `splitRulesIntoSections` returns `[]`, the component returns `null` (nothing to show — defensive; every firm file has `rules.md` with H2s).

### Reference implementation

```tsx
import { splitRulesIntoSections } from './rule-breakdown-helpers'

interface RuleBreakdownProps {
  rulesHtml: string
}

/**
 * DATA layer. Renders rules.md body as default-closed <details> sections,
 * one per top-level H2. Native HTML — no client JS.
 */
export function RuleBreakdown({ rulesHtml }: RuleBreakdownProps) {
  const sections = splitRulesIntoSections(rulesHtml)
  if (sections.length === 0) return null

  return (
    <section aria-label="Rule breakdown" className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Rule breakdown</h3>
      <div className="space-y-2">
        {sections.map((s) => (
          <details key={s.slug} className="rounded-md border border-[var(--border)] px-4 py-2">
            <summary className="cursor-pointer select-none py-1 font-medium">{s.title}</summary>
            <div
              className="prose prose-sm mt-2 max-w-none text-[var(--foreground)]"
              dangerouslySetInnerHTML={{ __html: s.html }}
            />
          </details>
        ))}
      </div>
    </section>
  )
}
```

**Safety note:** the HTML comes from `rehypeSanitize` with the default schema + `rehypeExternalLinks`. `dangerouslySetInnerHTML` is safe here because the input has already gone through the sanitizer in `getPageContent`. Do not use this component with untrusted HTML from any other source.

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
git add src/components/firm/RuleBreakdown.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f8 RuleBreakdown collapsible H2 sections

Server component that splits rules.md's sanitized HTML into one
default-closed <details> per H2. Native collapsibles — zero client JS.
Nothing renders when there are no sections (defensive guard).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Checklist storage helpers + tests

**Files:**
- Create: `src/components/firm/checklist-storage.ts`
- Test:   `src/components/firm/checklist-storage.test.ts`

### Public contract

```ts
export type ChecklistState = Record<string, boolean>  // id → checked

export const STORAGE_KEY_PREFIX = 'checklist:'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function storageKey(firmSlug: string): string
export function loadChecklistState(firmSlug: string, storage: StorageLike | null): ChecklistState
export function saveChecklistState(firmSlug: string, state: ChecklistState, storage: StorageLike | null): void
export function clearChecklistState(firmSlug: string, storage: StorageLike | null): void
export function toggleItem(state: ChecklistState, id: string): ChecklistState
export function isAnyChecked(state: ChecklistState): boolean
```

### Rules (locked)

- Key format: `\`checklist:${firmSlug}\`` — matches spec §5.4.
- **Storage is injected** — never reference `window` / `localStorage` directly in this module. That keeps the module pure (Node `environment: node` vitest can run it) and makes the component's graceful-degradation trivial: pass `null` when storage unavailable.
- `load` with `storage === null` → returns `{}`.
- `load` with parse error (corrupt JSON) → returns `{}` (do NOT throw; do NOT log — logging would fire on every SSR read if called wrong).
- `save` with `storage === null` → no-op.
- `save` wraps `setItem` in try/catch (quota exceeded etc.); failure is silently swallowed to match the "graceful degradation" requirement in spec §5.4.
- `toggleItem` is pure: returns a **new** object (never mutates).
- `isAnyChecked` returns `true` if any value in the state object is `true`.

### Step 1 — Write the failing tests

Create `src/components/firm/checklist-storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEY_PREFIX,
  storageKey,
  loadChecklistState,
  saveChecklistState,
  clearChecklistState,
  toggleItem,
  isAnyChecked,
  type StorageLike,
} from './checklist-storage'

function makeMemoryStorage(): StorageLike & { _dump: () => Record<string, string> } {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
    _dump: () => Object.fromEntries(map),
  }
}

describe('storageKey', () => {
  it('prefixes the firm slug', () => {
    expect(storageKey('apex-funding')).toBe('checklist:apex-funding')
    expect(STORAGE_KEY_PREFIX).toBe('checklist:')
  })
})

describe('loadChecklistState', () => {
  it('returns {} when storage is null', () => {
    expect(loadChecklistState('apex-funding', null)).toEqual({})
  })

  it('returns {} when nothing has been stored', () => {
    const s = makeMemoryStorage()
    expect(loadChecklistState('apex-funding', s)).toEqual({})
  })

  it('parses valid stored JSON', () => {
    const s = makeMemoryStorage()
    s.setItem('checklist:apex-funding', JSON.stringify({ a: true, b: false }))
    expect(loadChecklistState('apex-funding', s)).toEqual({ a: true, b: false })
  })

  it('returns {} on corrupt JSON (does not throw)', () => {
    const s = makeMemoryStorage()
    s.setItem('checklist:apex-funding', 'not-json')
    expect(loadChecklistState('apex-funding', s)).toEqual({})
  })
})

describe('saveChecklistState', () => {
  it('no-ops with null storage', () => {
    expect(() => saveChecklistState('x', { a: true }, null)).not.toThrow()
  })

  it('writes JSON under the right key', () => {
    const s = makeMemoryStorage()
    saveChecklistState('apex-funding', { a: true }, s)
    expect(s._dump()['checklist:apex-funding']).toBe(JSON.stringify({ a: true }))
  })

  it('swallows setItem errors (quota exceeded etc.)', () => {
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceeded') },
      removeItem: () => {},
    }
    expect(() => saveChecklistState('x', { a: true }, throwing)).not.toThrow()
  })
})

describe('clearChecklistState', () => {
  it('no-ops with null storage', () => {
    expect(() => clearChecklistState('x', null)).not.toThrow()
  })

  it('removes the key', () => {
    const s = makeMemoryStorage()
    s.setItem('checklist:apex-funding', JSON.stringify({ a: true }))
    clearChecklistState('apex-funding', s)
    expect(s.getItem('checklist:apex-funding')).toBeNull()
  })
})

describe('toggleItem', () => {
  it('returns a new object with the value flipped', () => {
    const state = { a: false, b: true }
    const next = toggleItem(state, 'a')
    expect(next).toEqual({ a: true, b: true })
    expect(next).not.toBe(state)
    expect(state).toEqual({ a: false, b: true }) // original unchanged
  })

  it('treats missing keys as previously false', () => {
    expect(toggleItem({}, 'a')).toEqual({ a: true })
  })
})

describe('isAnyChecked', () => {
  it('returns false for empty state', () => {
    expect(isAnyChecked({})).toBe(false)
  })

  it('returns false when all values are false', () => {
    expect(isAnyChecked({ a: false, b: false })).toBe(false)
  })

  it('returns true when at least one value is true', () => {
    expect(isAnyChecked({ a: false, b: true })).toBe(true)
  })
})
```

Run `pnpm test -- checklist-storage` — expect all to fail.

### Step 2 — Implementation

Create `src/components/firm/checklist-storage.ts`:

```ts
export type ChecklistState = Record<string, boolean>

export const STORAGE_KEY_PREFIX = 'checklist:'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function storageKey(firmSlug: string): string {
  return `${STORAGE_KEY_PREFIX}${firmSlug}`
}

export function loadChecklistState(
  firmSlug: string,
  storage: StorageLike | null,
): ChecklistState {
  if (!storage) return {}
  const raw = storage.getItem(storageKey(firmSlug))
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ChecklistState
    }
    return {}
  } catch {
    return {}
  }
}

export function saveChecklistState(
  firmSlug: string,
  state: ChecklistState,
  storage: StorageLike | null,
): void {
  if (!storage) return
  try {
    storage.setItem(storageKey(firmSlug), JSON.stringify(state))
  } catch {
    // quota exceeded, disabled, etc. — graceful degradation per spec §5.4
  }
}

export function clearChecklistState(firmSlug: string, storage: StorageLike | null): void {
  if (!storage) return
  try {
    storage.removeItem(storageKey(firmSlug))
  } catch {
    // same silent failure contract
  }
}

export function toggleItem(state: ChecklistState, id: string): ChecklistState {
  return { ...state, [id]: !state[id] }
}

export function isAnyChecked(state: ChecklistState): boolean {
  for (const v of Object.values(state)) {
    if (v) return true
  }
  return false
}
```

### Step 3 — Run tests

```bash
pnpm test -- checklist-storage
pnpm tsc --noEmit
```

### Step 4 — Commit

```bash
git add src/components/firm/checklist-storage.ts src/components/firm/checklist-storage.test.ts
git commit -m "$(cat <<'EOF'
feat: v1-f8 checklist-storage pure state helpers

Dependency-injected storage module for PreTradeChecklist. Load/save/clear
are null-safe and swallow errors (quota, disabled, corrupt JSON) per
spec §5.4 graceful-degradation requirement. toggleItem + isAnyChecked
are pure state transitions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: PreTradeChecklist component

**Files:**
- Create: `src/components/firm/PreTradeChecklist.tsx`

### Public contract

```tsx
'use client'

import type { ChecklistItem } from '../../../scripts/monitor/schema'

interface PreTradeChecklistProps {
  items: ChecklistItem[]
  firmSlug: string
}

export function PreTradeChecklist(props: PreTradeChecklistProps): JSX.Element
```

### Visual spec

- ACTION layer — `--action-tint-bg` + `--action-tint-border`.
- Section title: "Pre-trade checklist".
- Each item: shadcn `Checkbox` + `<label>`; full-row click target.
- Reset link appears BELOW the list when `isAnyChecked(state)` is true. Text: "Reset for today". Click clears state (not a date-based reset — "for today" is just user-facing copy per spec §5.4).
- **No visual reset on date change.** The user is in control.

### SSR hydration contract (critical)

Next.js App Router will SSR this client component. We must not read localStorage during SSR (throws ReferenceError: `localStorage is not defined`). Pattern:

1. Initial `useState<ChecklistState>({})` — all unchecked.
2. `useEffect` once on mount: read localStorage, call `setState`.
3. On every state change after mount: write localStorage.

This means the first render on the client is unchecked (matches server), then after hydration it reconciles. Brief flash of unchecked is acceptable per spec (graceful degradation is the priority; no content-layout-shift since structure is identical).

### Reference implementation

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import type { ChecklistItem } from '../../../scripts/monitor/schema'
import {
  loadChecklistState,
  saveChecklistState,
  clearChecklistState,
  toggleItem,
  isAnyChecked,
  type ChecklistState,
  type StorageLike,
} from './checklist-storage'

interface PreTradeChecklistProps {
  items: ChecklistItem[]
  firmSlug: string
}

function getStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * ACTION layer — green-tinted. Interactive checklist persisted per-firm
 * in localStorage. Falls back to in-memory state if storage is unavailable.
 * User-initiated reset only; no auto-reset on date/session/reload.
 */
export function PreTradeChecklist({ items, firmSlug }: PreTradeChecklistProps) {
  const [state, setState] = useState<ChecklistState>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(loadChecklistState(firmSlug, getStorage()))
    setHydrated(true)
  }, [firmSlug])

  useEffect(() => {
    if (!hydrated) return
    saveChecklistState(firmSlug, state, getStorage())
  }, [hydrated, firmSlug, state])

  const handleToggle = (id: string) => {
    setState((prev) => toggleItem(prev, id))
  }

  const handleReset = () => {
    setState({})
    clearChecklistState(firmSlug, getStorage())
  }

  return (
    <section
      aria-label="Pre-trade checklist"
      className="rounded-lg mt-4 p-4 bg-[var(--action-tint-bg)] border border-[var(--action-tint-border)]"
    >
      <h3 className="text-lg font-semibold mb-3">Pre-trade checklist</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <Checkbox
              id={`${firmSlug}:${item.id}`}
              checked={!!state[item.id]}
              onCheckedChange={() => handleToggle(item.id)}
            />
            <label
              htmlFor={`${firmSlug}:${item.id}`}
              className="cursor-pointer text-sm select-none"
            >
              {item.label}
            </label>
          </li>
        ))}
      </ul>
      {isAnyChecked(state) && (
        <button
          type="button"
          onClick={handleReset}
          className="mt-3 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-2"
        >
          Reset for today
        </button>
      )}
    </section>
  )
}
```

**Checkbox prop check:** the shadcn `Checkbox` in this repo (`src/components/ui/checkbox.tsx`) wraps `@base-ui/react/checkbox` — confirm the prop is `onCheckedChange` and not `onChange`. The base-ui primitive uses `onCheckedChange` per the `CheckboxPrimitive.Root.Props` type. If it differs, adjust.

### Step 1 — Write the file

Paste the reference.

### Step 2 — Type check + build

```bash
pnpm tsc --noEmit
pnpm build
```

If `onCheckedChange` type-errors, try `onChange` or inspect `CheckboxPrimitive.Root.Props` for the right event name.

### Step 3 — Commit

```bash
git add src/components/firm/PreTradeChecklist.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f8 PreTradeChecklist interactive + localStorage

Client component persisting checklist state per firmSlug in localStorage
via checklist-storage helpers. SSR-safe (initial unchecked, reconciled
on mount). Reset-for-today link surfaces when any box is checked.
Graceful degradation when storage unavailable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: AffiliateCTA component

**Files:**
- Create: `src/components/firm/AffiliateCTA.tsx`

### Public contract

```tsx
interface AffiliateCTAProps {
  firmSlug: string
  url: string | null
  utm: string                // e.g. "openprop"
}

export function AffiliateCTA(props: AffiliateCTAProps): JSX.Element | null
```

### Visual spec

- ACTION layer — `--action-tint-bg` + `--action-tint-border`.
- **Critical invariant:** `url === null` → return `null`. No empty section. No "coming soon". Spec §6 "no dead buttons ever".
- Button uses shadcn `Button` variant `default`.
- CTA copy: `Open an account with {firmSlug}` — firmSlug rendered as-is (lowercase with dashes is acceptable for v1; v1-f9 or landing can pass a humanized name if needed).
- Disclosure text below button: `Affiliate link — we may earn a commission at no extra cost to you.` (small, muted).
- `href` computation: append `utm_source` query param using `URL` constructor to handle URLs that already have query strings:

```ts
const withUtm = new URL(url)
withUtm.searchParams.set('utm_source', utm)
const href = withUtm.toString()
```

- `target="_blank"` + `rel="noopener noreferrer nofollow sponsored"` (the `sponsored` value is per Google's guidance for paid links).

### Reference implementation

```tsx
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface AffiliateCTAProps {
  firmSlug: string
  url: string | null
  utm: string
}

function buildHref(url: string, utm: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source', utm)
    return u.toString()
  } catch {
    return url
  }
}

/**
 * ACTION layer. Renders nothing when url is null — critical invariant:
 * no dead buttons ever (spec §6). Appends utm_source without clobbering
 * existing query params.
 */
export function AffiliateCTA({ firmSlug, url, utm }: AffiliateCTAProps) {
  if (url === null) return null

  const href = buildHref(url, utm)

  return (
    <section
      aria-label="Open account with firm"
      className="rounded-lg mt-4 p-4 bg-[var(--action-tint-bg)] border border-[var(--action-tint-border)]"
    >
      <Button asChild variant="default">
        <a href={href} target="_blank" rel="noopener noreferrer nofollow sponsored">
          <ExternalLink size={14} aria-hidden="true" />
          <span>Open an account with {firmSlug}</span>
        </a>
      </Button>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        Affiliate link — we may earn a commission at no extra cost to you.
      </p>
    </section>
  )
}
```

**Button `asChild` prop check:** verify the repo's shadcn `Button` supports `asChild`. Open `src/components/ui/button.tsx` — it imports from `@base-ui/react/button`. If `asChild` isn't supported there, wrap the button as `<a>…<Button>…</Button>…</a>` instead (the button carries only the styling in that fallback).

### Step 1 — Write the file

Paste the reference. Adjust the `asChild` pattern if base-ui Button doesn't support it.

### Step 2 — Type check + build

```bash
pnpm tsc --noEmit
pnpm build
```

### Step 3 — Commit

```bash
git add src/components/firm/AffiliateCTA.tsx
git commit -m "$(cat <<'EOF'
feat: v1-f8 AffiliateCTA with null-render guard

Server component. Returns null when affiliate.url === null — critical
invariant from spec §6 ("no dead buttons ever"). Appends utm_source
safely using URL(). rel="sponsored" per Google guidance on paid links.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Full validation + commit plan doc + fast-forward to main

### Step 1 — Full test + type check + build

```bash
pnpm tsc --noEmit
pnpm test
pnpm build
```

Expected:
- `tsc`: clean.
- `test`: previous-total + 4 new helper suites. Count exactly (changelog-helpers ~10 cases, verification-helpers ~7 cases, rule-breakdown-helpers ~5 cases, checklist-storage ~12 cases ≈ **34 new tests**).
- `build`: clean. Components are not mounted by any route yet, but Next.js type-checks the whole module graph. Pre-existing `react-hooks/set-state-in-effect` warnings in `src/components/content/ContentPanelRight.tsx` are not introduced by this branch — do not touch them.

### Step 2 — Commit the plan doc

```bash
git add docs/superpowers/plans/2026-04-24-v1-f8-firm-page-components.md
git commit -m "$(cat <<'EOF'
docs: v1-f8 plan

Reference artifact kept alongside v1-f1..f7 plans.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 3 — Fast-forward merge to main + push (no PR)

Per Jason's 2026-04-23 directive ("skip PR review — commit directly on a local feature branch, fast-forward to main, push"):

```bash
git checkout main
git pull --ff-only origin main
git merge --ff-only feat/v1-f8-firm-page-components
git push origin main
```

If `--ff-only` fails because main advanced while you were working, rebase the feature branch onto the latest main first:

```bash
git checkout feat/v1-f8-firm-page-components
git rebase origin/main
git checkout main
git merge --ff-only feat/v1-f8-firm-page-components
git push origin main
```

### Step 4 — Delete the feature branch

```bash
git branch -d feat/v1-f8-firm-page-components
git push origin --delete feat/v1-f8-firm-page-components 2>/dev/null || true
```

### Step 5 — Update the v1 progress memory

Update `/Users/lego/.claude/projects/-Users-lego--Lego651-open-prop-firm/memory/project_v1_progress.md`:

- Add a `v1-f8` entry to the "Shipped" section with final commit SHA + test-count summary.
- Change the `Next:` pointer from `v1-f8` to `v1-f9` with a one-line sketch of what v1-f9 builds (`app/firms/[slug]/page.tsx` + `app/firms/page.tsx` composing v1-f7 + v1-f8 components; slug resolution; `notFound()` for unknown slug; VerificationBadge + SnapshotBar + KillYouFirstList + FitScoreTable + RuleBreakdown + Changelog + PreTradeChecklist + AffiliateCTA in three-layer order per spec §3.4).

---

## Self-review (performed by plan author)

**1. Spec coverage:**
- [x] §4.2 RuleBreakdown — Tasks 5 + 6.
- [x] §4.2 Changelog (with Stability Indicator placeholder) — Tasks 1 + 2. Placeholder literal `"—"` in the component JSX.
- [x] §4.2 PreTradeChecklist (interactive + localStorage + fallback) — Tasks 7 + 8. SSR hydration contract spelled out.
- [x] §4.2 AffiliateCTA (null-render guard) — Task 9. `if (url === null) return null` is the first line.
- [x] §4.2 VerificationBadge (7-day staleness) — Tasks 3 + 4. Threshold locked at `> 7` days.
- [x] §3.4 three-layer architecture — DATA components use neutral background; ACTION components use `--action-tint-*`. OPINION was v1-f7.
- [x] §5.4 checklist storage semantics — key format, user-only reset, try/catch fallback all covered.
- [x] §6 error table: null affiliate → null render; stale verification → amber warning; storage failure → in-memory fallback; empty changelog → empty-state message. All mapped.
- [x] §8 Stability Indicator v1 scope — UI placeholder only, literal `"—"`. No data wiring.

**2. Placeholder scan:** No TBD, no "implement later", no "similar to Task N". Every code block is complete. Every helper has a test. Every component has a visual spec + reference implementation.

**3. Type consistency:**
- `ChecklistState`, `StorageLike`, `ChangelogRow`, `VerificationDisplay`, `RuleSection` each defined once in their helper module and imported by the component.
- Function names stable across tasks: `buildChangelogRows`, `buildVerificationDisplay`, `splitRulesIntoSections`, `loadChecklistState`, `saveChecklistState`, `clearChecklistState`, `toggleItem`, `isAnyChecked`, `buildHref`.
- All components import Zod-derived types from `../../../scripts/monitor/schema` consistently (v1-f7 pattern).

**4. Scope guard:**
- No page wiring (`app/firms/[slug]/page.tsx`) — that's v1-f9.
- No changes to v1-f7 components (`SnapshotBar`, `KillYouFirstList`, `FitScoreTable`).
- No schema changes — `scripts/monitor/schema.ts` stays as v1-f1 shipped it.
- No bot changes — scraper/diff/runner stay as v1-f3/f4/f5 shipped them.
- No new npm deps — cheerio is already installed.
- Existing `src/components/content/VerifiedBadge.tsx` is NOT touched. A new `VerificationBadge.tsx` lives alongside in `src/components/firm/`.

**5. Risks flagged to implementer:**
- `base-ui` `Checkbox` prop name (`onCheckedChange` vs `onChange`) — verified in the component code but double-check at implementation.
- `base-ui` `Button` `asChild` support — confirm before using; fallback pattern given.
- Cheerio 1.x API stability — primary implementation uses `.next` pointer traversal; alternative `nextUntil('h2')` pattern provided.
- `--verified-badge-*` tokens exist in `themes.css` (used by existing `VerifiedBadge.tsx` — should be present). Confirm before Task 4.

**6. Rollback plan:** All changes are additive files under `src/components/firm/*` plus one plan doc. Reverting the feat commits + plan doc commit returns `main` to the v1-f7 state with zero consumer impact (no page mounts these yet).
