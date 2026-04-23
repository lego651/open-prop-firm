export interface NewChangelogEntry {
  field: string
  from: unknown
  to: unknown
  source_url: string
}

export interface ParsedPRBody {
  firmSlug: string
  lastVerified: string
  entries: NewChangelogEntry[]
}

const FIRM_RE = /^-\s*\*\*Firm:\*\*\s*`([^`]+)`/m
const LAST_VERIFIED_RE = /^-\s*\*\*Last verified \(new\):\*\*\s*(\d{4}-\d{2}-\d{2})/m
const TABLE_ROW_RE =
  /^\|\s*`([^`]+)`\s*\|\s*`([^`]*)`\s*\|\s*`([^`]*)`\s*\|\s*\[link\]\(([^)]+)\)\s*\|$/
const NO_DRIFT_RE = /##\s+No field-level drift detected/

/**
 * Parse a PR body emitted by `diff.ts:renderPRBody` back into structured form.
 * Pure function — no I/O, no git, no env reads.
 */
export function parsePRBody(body: string): ParsedPRBody {
  const firmMatch = body.match(FIRM_RE)
  if (!firmMatch) {
    throw new Error('parsePRBody: could not extract firm slug from PR body')
  }
  const firmSlug = firmMatch[1]

  const verifiedMatch = body.match(LAST_VERIFIED_RE)
  if (!verifiedMatch) {
    throw new Error('parsePRBody: could not extract last verified date from PR body')
  }
  const lastVerified = verifiedMatch[1]

  if (NO_DRIFT_RE.test(body)) {
    return { firmSlug, lastVerified, entries: [] }
  }

  const entries: NewChangelogEntry[] = []
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trimEnd()
    const rowMatch = line.match(TABLE_ROW_RE)
    if (!rowMatch) continue
    const [, field, fromCell, toCell, sourceUrl] = rowMatch
    entries.push({
      field,
      from: parseCell(fromCell),
      to: parseCell(toCell),
      source_url: sourceUrl,
    })
  }

  return { firmSlug, lastVerified, entries }
}

function parseCell(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}
