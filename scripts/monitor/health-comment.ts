export const HEALTH_SENTINEL = '<!-- openprop-health-check -->'
export const ALERT_SENTINEL = '<!-- openprop-health-alert -->'

export interface PerFirmStatus {
  slug: string
  ok: boolean
  error: string | null
}

export interface HealthStatus {
  runAt: string
  perFirm: PerFirmStatus[]
}

/** Format an ISO timestamp as "YYYY-MM-DD HH:MM UTC" (no seconds). */
function formatRunAt(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const mm = pad(d.getUTCMonth() + 1)
  const dd = pad(d.getUTCDate())
  const hh = pad(d.getUTCHours())
  const mi = pad(d.getUTCMinutes())
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`
}

function firstLine(s: string | null): string {
  if (!s) return ''
  return s.split('\n')[0]
}

/**
 * Build the markdown body for a health-check issue comment. Leads with
 * HEALTH_SENTINEL so the watchdog can reliably filter health posts from
 * other issue chatter.
 */
export function buildHealthCommentBody(status: HealthStatus): string {
  const total = status.perFirm.length
  const okCount = status.perFirm.filter((f) => f.ok).length
  const errorCount = total - okCount

  let emoji: string
  if (errorCount === 0) emoji = '✅'
  else if (okCount === 0) emoji = '❌'
  else emoji = '⚠️'

  const summary =
    errorCount === 0
      ? `${okCount}/${total} scrapers OK`
      : `${okCount}/${total} scrapers OK, ${errorCount} error${errorCount > 1 ? 's' : ''}`

  const header = `${emoji} ${formatRunAt(status.runAt)} — ${summary}`

  const rows = status.perFirm.map((f) => {
    const statusCell = f.ok ? '✅' : '❌'
    const errCell = f.ok ? '' : firstLine(f.error)
    return `| ${f.slug} | ${statusCell} | ${errCell} |`
  })

  return [
    HEALTH_SENTINEL,
    header,
    '',
    '| Firm | Status | Error |',
    '|---|---|---|',
    ...rows,
  ].join('\n')
}
