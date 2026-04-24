import { Badge } from '@/components/ui/badge'
import type { DecisionSnapshot } from '../../../scripts/monitor/schema'
import { buildSnapshotChips, type ChipStatus } from './snapshot-helpers'

interface SnapshotBarProps {
  snapshot: DecisionSnapshot
}

function badgeClassForStatus(status: ChipStatus): string {
  switch (status) {
    case 'allowed':
      return 'bg-[var(--verified-badge-bg)] border-[var(--verified-badge-border)] text-[var(--verified-badge-fg)]'
    case 'forbidden':
      return 'bg-[var(--wikilink-missing-fg)]/10 border-[var(--wikilink-missing-fg)]/30 text-[var(--wikilink-missing-fg)]'
    case 'neutral':
      return ''
  }
}

/**
 * DATA layer — neutral background. Renders 6 chips built from the firm's
 * DecisionSnapshot plus a best_for subtitle.
 */
export function SnapshotBar({ snapshot }: SnapshotBarProps) {
  const chips = buildSnapshotChips(snapshot)

  return (
    <section aria-label="Firm snapshot" className="bg-[var(--background)] py-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Badge
            key={chip.key}
            variant="outline"
            className={badgeClassForStatus(chip.status)}
            title={`Source: ${chip.sourceUrl}`}
            aria-label={`${chip.label}: ${chip.value} (source: ${chip.sourceUrl})`}
          >
            <span className="font-medium">{chip.label}:</span>
            <span className="ml-1">{chip.value}</span>
          </Badge>
        ))}
      </div>
      <p className="text-sm text-[var(--muted-foreground)] mt-2">{snapshot.best_for}</p>
    </section>
  )
}
