/**
 * Shared wikilink regex and utilities.
 * Used by both the content pipeline (getPageContent.ts) and build scripts
 * (generate-graph-data.ts, validate-content.ts).
 *
 * Captures both target and optional alias: [[target|alias]] or [[target]]
 */
export const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g

/** Returns all wikilink target slugs found in content (deduplicated). */
export function parseWikilinkTargets(content: string): string[] {
  const targets: string[] = []
  const re = new RegExp(WIKILINK_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    targets.push(match[1].trim())
  }
  return targets
}
