import { CheckCircle, AlertCircle } from 'lucide-react'

type VerifiedBadgeProps = {
  lastVerified: string // ISO 8601 date string
  status: 'active' | 'inactive' | 'shutdown'
}

export default function VerifiedBadge({ lastVerified, status }: VerifiedBadgeProps) {
  const isActive = status === 'active'

  const date = new Date(lastVerified).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="mb-4">
      {isActive ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--file-type-promo)]/10 px-3 py-1 text-xs font-medium text-[var(--file-type-promo)]">
          <CheckCircle size={12} />
          Last verified: {date}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500">
          <AlertCircle size={12} />
          This firm is no longer active
        </span>
      )}
    </div>
  )
}
