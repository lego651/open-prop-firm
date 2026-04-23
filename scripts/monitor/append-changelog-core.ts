import type { ChangelogEntry } from './schema'
import type { NewChangelogEntry } from './parse-pr-body'

function dedupeKey(e: { date: string; field: string; from: unknown; to: unknown }): string {
  return `${e.date}::${e.field}::${JSON.stringify(e.from)}::${JSON.stringify(e.to)}`
}

/**
 * Merge incoming bot-detected entries onto an existing changelog. New entries
 * are prepended (descending date order) and deduped by {date, field, from, to}.
 * source_url is intentionally excluded from the key — re-running the bot with
 * a corrected source must not create a duplicate.
 *
 * Pure: never mutates `existing` or `incoming`.
 */
export function mergeEntries(
  existing: ChangelogEntry[],
  incoming: NewChangelogEntry[],
  mergeDate: string,
): ChangelogEntry[] {
  const seen = new Set(existing.map(dedupeKey))
  const added: ChangelogEntry[] = []
  for (const entry of incoming) {
    const candidate: ChangelogEntry = {
      date: mergeDate,
      field: entry.field,
      from: entry.from,
      to: entry.to,
      source_url: entry.source_url,
    }
    const key = dedupeKey(candidate)
    if (seen.has(key)) continue
    seen.add(key)
    added.push(candidate)
  }
  return [...added, ...existing]
}
