import { CheckCircle, AlertTriangle } from 'lucide-react'
import { buildVerificationDisplay } from './verification-helpers'

interface VerificationBadgeProps {
  lastVerified: string
  verifiedBy: 'bot' | 'manual'
  sourcesUrl?: string | null
}

/**
 * DATA layer. Fresh (<=7 days) renders green "Last verified" pill.
 * Stale (>7 days) renders amber warning pill. Optional sourcesUrl
 * wraps the pill in a link.
 */
export function VerificationBadge({ lastVerified, verifiedBy, sourcesUrl }: VerificationBadgeProps) {
  const d = buildVerificationDisplay(lastVerified, verifiedBy)

  const pill = d.isStale ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--opinion-tint-border)] bg-[var(--opinion-tint-bg)] px-3 py-1 text-xs font-medium">
      <AlertTriangle size={12} aria-hidden="true" />
      <span>
        Stale — last verified{' '}
        <time dateTime={d.isoDate}>{d.daysSince} days ago</time>
        {' '}
        ({verifiedBy})
      </span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--verified-badge-border)] bg-[var(--verified-badge-bg)] px-3 py-1 text-xs font-medium text-[var(--verified-badge-fg)]">
      <CheckCircle size={12} aria-hidden="true" />
      <span>
        Last verified: <time dateTime={d.isoDate}>{d.humanDate}</time> ({verifiedBy})
      </span>
    </span>
  )

  if (sourcesUrl) {
    return (
      <a href={sourcesUrl} target="_blank" rel="noopener noreferrer" title="View sources" className="inline-block">
        {pill}
      </a>
    )
  }
  return pill
}
