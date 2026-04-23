import matter from 'gray-matter'
import type { ChangelogEntry } from './schema'
import type { NewChangelogEntry } from './parse-pr-body'
import { mergeEntries } from './append-changelog-core'

/**
 * Apply changelog additions to a markdown file's full string content.
 * Round-trips the frontmatter via gray-matter; prepends new entries and
 * dedupes by {date, field, from, to} via mergeEntries. Returns the input
 * UNCHANGED when there are no incoming entries.
 *
 * Throws if the file has no `decision` block in its frontmatter.
 */
export function applyChangelogToFileContent(
  fileContent: string,
  incoming: NewChangelogEntry[],
  mergeDate: string,
): string {
  if (incoming.length === 0) return fileContent

  const parsed = matter(fileContent)
  const data = parsed.data as Record<string, unknown>
  const decision = data.decision as { changelog?: ChangelogEntry[] } | undefined
  if (!decision) {
    throw new Error('applyChangelogToFileContent: file has no decision block')
  }

  const existing: ChangelogEntry[] = Array.isArray(decision.changelog) ? decision.changelog : []
  decision.changelog = mergeEntries(existing, incoming, mergeDate)

  return matter.stringify(parsed.content, data)
}
