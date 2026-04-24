import type { FirmMeta } from '@/lib/firms/repository'
import { FirmCard } from './FirmCard'

interface FirmCardGridProps {
  firms: FirmMeta[]
}

export function FirmCardGrid({ firms }: FirmCardGridProps) {
  if (firms.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">No firms available yet.</p>
    )
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {firms.map((firm) => (
        <li key={firm.slug}>
          <FirmCard firm={firm} />
        </li>
      ))}
    </ul>
  )
}
