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
