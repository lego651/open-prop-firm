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
