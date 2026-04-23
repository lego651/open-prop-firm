import { describe, it, expect } from 'vitest'
import { applyChangelogToFileContent } from './write-changelog'
import type { NewChangelogEntry } from './parse-pr-body'

const MERGE_DATE = '2026-04-23'

const FILE_WITH_EMPTY_CHANGELOG = `---
title: Apex
firm: Apex Trader Funding
decision:
  snapshot:
    news_trading_allowed: true
    payout_split_pct: 90
    best_for: 'intraday scalping'
  kill_you_first:
    - title: 'a'
      detail: 'b'
      source_url: 'https://x/a'
  fit_score:
    ny_scalping: 4
    swing_trading: 1
    news_trading: 4
    beginner_friendly: 2
    scalable: 3
  pre_trade_checklist:
    - id: one
      label: 'one'
  changelog: []
  affiliate:
    url: null
    utm: 'openprop'
---

# Body
Prose body intact.
`

describe('applyChangelogToFileContent', () => {
  it('prepends new entries onto an empty changelog', () => {
    const incoming: NewChangelogEntry[] = [
      {
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://x/a',
      },
    ]

    const out = applyChangelogToFileContent(FILE_WITH_EMPTY_CHANGELOG, incoming, MERGE_DATE)

    expect(out).toMatch(/field:\s*['"]?snapshot\.news_trading_allowed['"]?/)
    expect(out).toMatch(/date:\s*['"]?2026-04-23['"]?/)
    expect(out).toMatch(/from:\s*true/)
    expect(out).toMatch(/to:\s*false/)
    expect(out).toContain('# Body')
    expect(out).toContain('Prose body intact.')
  })

  it('returns file unchanged when incoming is empty', () => {
    const out = applyChangelogToFileContent(FILE_WITH_EMPTY_CHANGELOG, [], MERGE_DATE)
    expect(out).toBe(FILE_WITH_EMPTY_CHANGELOG)
  })

  it('throws if the file has no decision block', () => {
    const file = `---\ntitle: X\n---\n\nBody\n`
    const incoming: NewChangelogEntry[] = [
      {
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://x/a',
      },
    ]
    expect(() => applyChangelogToFileContent(file, incoming, MERGE_DATE)).toThrow(/decision block/i)
  })

  it('skips duplicate entries and does not grow the changelog', () => {
    const withExisting = FILE_WITH_EMPTY_CHANGELOG.replace(
      'changelog: []',
      `changelog:
    - date: '2026-04-23'
      field: snapshot.news_trading_allowed
      from: true
      to: false
      source_url: 'https://x/a'`,
    )
    const incoming: NewChangelogEntry[] = [
      {
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://x/a',
      },
    ]

    const out = applyChangelogToFileContent(withExisting, incoming, MERGE_DATE)

    expect((out.match(/field:\s*['"]?snapshot\.news_trading_allowed['"]?/g) || []).length).toBe(1)
  })
})
