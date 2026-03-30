import { CheckCircle, AlertCircle, PauseCircle } from 'lucide-react'

type VerifiedBadgeProps = {
  lastVerified: string // ISO 8601 date string
  status: 'active' | 'inactive' | 'shutdown'
}

export default function VerifiedBadge({ lastVerified, status }: VerifiedBadgeProps) {
  const date = new Date(lastVerified).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (status === 'active') {
    return (
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--file-type-promo)]/10 px-3 py-1 text-xs font-medium text-[var(--file-type-promo)]">
          <CheckCircle size={12} />
          Last verified: {date}
        </span>
      </div>
    )
  }

  if (status === 'inactive') {
    return (
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
          <PauseCircle size={12} />
          This firm is currently inactive
        </span>
      </div>
    )
  }

  // shutdown
  return (
    <div className="mb-4">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500">
        <AlertCircle size={12} />
        This firm has permanently shut down
      </span>
    </div>
  )
}
