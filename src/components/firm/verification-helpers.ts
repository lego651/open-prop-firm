const DAY_MS = 86_400_000

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export interface VerificationDisplay {
  isoDate: string
  humanDate: string
  daysSince: number
  isStale: boolean
  verifiedBy: 'bot' | 'manual'
}

export function daysSince(lastVerified: string, now: Date = new Date()): number {
  const last = new Date(lastVerified).getTime()
  const diffMs = now.getTime() - last
  if (diffMs <= 0) return 0
  return Math.floor(diffMs / DAY_MS)
}

export function buildVerificationDisplay(
  lastVerified: string,
  verifiedBy: 'bot' | 'manual',
  now: Date = new Date(),
  thresholdDays: number = 7,
): VerificationDisplay {
  const d = daysSince(lastVerified, now)
  return {
    isoDate: lastVerified,
    humanDate: DATE_FORMAT.format(new Date(lastVerified)),
    daysSince: d,
    isStale: d > thresholdDays,
    verifiedBy,
  }
}
