import { describe, it, expect } from 'vitest'
import { daysSince, buildVerificationDisplay } from './verification-helpers'

const NOW = new Date('2026-04-24T00:00:00Z')

describe('daysSince', () => {
  it('returns 0 when last_verified is the same moment as now', () => {
    expect(daysSince('2026-04-24T00:00:00Z', NOW)).toBe(0)
  })

  it('returns whole days elapsed, floored', () => {
    expect(daysSince('2026-04-23T00:00:00Z', NOW)).toBe(1)
    expect(daysSince('2026-04-17T00:00:00Z', NOW)).toBe(7)
    expect(daysSince('2026-04-10T12:00:00Z', NOW)).toBe(13) // 13.5d floored
  })

  it('clamps negative diffs (future last_verified) to 0', () => {
    expect(daysSince('2026-05-01T00:00:00Z', NOW)).toBe(0)
  })
})

describe('buildVerificationDisplay', () => {
  it('is not stale when exactly 7 days old', () => {
    const d = buildVerificationDisplay('2026-04-17T00:00:00Z', 'bot', NOW)
    expect(d.daysSince).toBe(7)
    expect(d.isStale).toBe(false)
  })

  it('is stale at 8 days', () => {
    const d = buildVerificationDisplay('2026-04-16T00:00:00Z', 'bot', NOW)
    expect(d.daysSince).toBe(8)
    expect(d.isStale).toBe(true)
  })

  it('respects a custom threshold', () => {
    const d = buildVerificationDisplay('2026-04-22T00:00:00Z', 'bot', NOW, 1)
    expect(d.daysSince).toBe(2)
    expect(d.isStale).toBe(true)
  })

  it('formats a human-readable date', () => {
    const d = buildVerificationDisplay('2026-04-17T14:30:00Z', 'manual', NOW)
    expect(d.humanDate).toBe('Apr 17, 2026')
    expect(d.verifiedBy).toBe('manual')
    expect(d.isoDate).toBe('2026-04-17T14:30:00Z')
  })
})
