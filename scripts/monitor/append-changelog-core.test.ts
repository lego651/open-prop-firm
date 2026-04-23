import { describe, it, expect } from 'vitest'
import { mergeEntries } from './append-changelog-core'
import type { ChangelogEntry } from './schema'
import type { NewChangelogEntry } from './parse-pr-body'

const MERGE_DATE = '2026-04-23'

describe('mergeEntries', () => {
  it('prepends new entries with the merge date onto empty changelog', () => {
    const existing: ChangelogEntry[] = []
    const incoming: NewChangelogEntry[] = [
      {
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://example.com/rules',
      },
      {
        field: 'snapshot.payout_split_pct',
        from: 90,
        to: 95,
        source_url: 'https://example.com/payout',
      },
    ]

    const merged = mergeEntries(existing, incoming, MERGE_DATE)

    expect(merged).toHaveLength(2)
    expect(merged[0]).toEqual({
      date: MERGE_DATE,
      field: 'snapshot.news_trading_allowed',
      from: true,
      to: false,
      source_url: 'https://example.com/rules',
    })
    expect(merged[1]).toEqual({
      date: MERGE_DATE,
      field: 'snapshot.payout_split_pct',
      from: 90,
      to: 95,
      source_url: 'https://example.com/payout',
    })
  })

  it('preserves existing entries and puts new ones on top (descending date order)', () => {
    const existing: ChangelogEntry[] = [
      {
        date: '2026-01-15',
        field: 'snapshot.payout_split_pct',
        from: 80,
        to: 90,
        source_url: 'https://example.com/old',
      },
    ]
    const incoming: NewChangelogEntry[] = [
      {
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://example.com/rules',
      },
    ]

    const merged = mergeEntries(existing, incoming, MERGE_DATE)

    expect(merged).toHaveLength(2)
    expect(merged[0]).toEqual({
      date: MERGE_DATE,
      field: 'snapshot.news_trading_allowed',
      from: true,
      to: false,
      source_url: 'https://example.com/rules',
    })
    expect(merged[1]).toEqual({
      date: '2026-01-15',
      field: 'snapshot.payout_split_pct',
      from: 80,
      to: 90,
      source_url: 'https://example.com/old',
    })
  })

  it('dedupes by {date, field, from, to} — source_url differences do not cause duplicates', () => {
    const existing: ChangelogEntry[] = [
      {
        date: MERGE_DATE,
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://example.com/source-A',
      },
    ]
    const incoming: NewChangelogEntry[] = [
      {
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://example.com/source-B',
      },
    ]

    const merged = mergeEntries(existing, incoming, MERGE_DATE)

    expect(merged).toHaveLength(1)
    expect(merged[0]).toEqual({
      date: MERGE_DATE,
      field: 'snapshot.news_trading_allowed',
      from: true,
      to: false,
      source_url: 'https://example.com/source-A',
    })
  })

  it('does NOT dedupe when field differs', () => {
    const existing: ChangelogEntry[] = [
      {
        date: MERGE_DATE,
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://example.com/a',
      },
    ]
    const incoming: NewChangelogEntry[] = [
      {
        field: 'snapshot.overnight_holding_allowed',
        from: true,
        to: false,
        source_url: 'https://example.com/b',
      },
    ]

    const merged = mergeEntries(existing, incoming, MERGE_DATE)

    expect(merged).toHaveLength(2)
    expect(merged[0].field).toBe('snapshot.overnight_holding_allowed')
    expect(merged[1].field).toBe('snapshot.news_trading_allowed')
  })

  it('handles mixed new + duplicate incoming entries in one call', () => {
    const existing: ChangelogEntry[] = [
      {
        date: MERGE_DATE,
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://example.com/existing',
      },
    ]
    const incoming: NewChangelogEntry[] = [
      {
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://example.com/dup',
      },
      {
        field: 'snapshot.payout_split_pct',
        from: 90,
        to: 95,
        source_url: 'https://example.com/new',
      },
    ]

    const merged = mergeEntries(existing, incoming, MERGE_DATE)

    expect(merged).toHaveLength(2)
    expect(merged[0]).toEqual({
      date: MERGE_DATE,
      field: 'snapshot.payout_split_pct',
      from: 90,
      to: 95,
      source_url: 'https://example.com/new',
    })
    expect(merged[1]).toEqual({
      date: MERGE_DATE,
      field: 'snapshot.news_trading_allowed',
      from: true,
      to: false,
      source_url: 'https://example.com/existing',
    })
  })

  it('returns a new array (does not mutate inputs)', () => {
    const existing: ChangelogEntry[] = [
      {
        date: '2026-01-15',
        field: 'snapshot.payout_split_pct',
        from: 80,
        to: 90,
        source_url: 'https://example.com/old',
      },
    ]
    const incoming: NewChangelogEntry[] = [
      {
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://example.com/rules',
      },
    ]

    const existingBefore = JSON.stringify(existing)
    const incomingBefore = JSON.stringify(incoming)

    const merged = mergeEntries(existing, incoming, MERGE_DATE)

    expect(JSON.stringify(existing)).toBe(existingBefore)
    expect(JSON.stringify(incoming)).toBe(incomingBefore)
    expect(merged).not.toBe(existing)
  })

  it('dedupes within the incoming batch when the same key appears twice', () => {
    const incoming: NewChangelogEntry[] = [
      { field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://example.com/first' },
      { field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://example.com/second' },
    ]
    const out = mergeEntries([], incoming, MERGE_DATE)
    expect(out).toHaveLength(1)
    expect(out[0].source_url).toBe('https://example.com/first')
  })
})
