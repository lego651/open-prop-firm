import type { FitScore } from '../../../scripts/monitor/schema'
import { buildFitScoreRows } from './fit-score-helpers'

interface FitScoreTableProps {
  fitScore: FitScore
}

/**
 * OPINION layer — amber-tinted. Renders the 5-row fit-score table for
 * this firm. Star display uses U+2605/U+2606; 0 stars renders as
 * "❌ not suitable".
 */
export function FitScoreTable({ fitScore }: FitScoreTableProps) {
  const rows = buildFitScoreRows(fitScore)

  return (
    <section
      aria-label="Fit score"
      className="rounded-lg p-4 mt-4 bg-[var(--opinion-tint-bg)] border border-[var(--opinion-tint-border)]"
    >
      <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-1">
        Founder&rsquo;s opinion
      </div>
      <h3 className="text-lg font-semibold mb-3">Fit score</h3>
      <table className="w-full border-collapse">
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-[var(--opinion-tint-border)]">
              <td className="py-2 pr-4 text-[var(--foreground)]">{r.label}</td>
              <td className="py-2 text-right font-mono tracking-wide">{r.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
