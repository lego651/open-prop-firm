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
