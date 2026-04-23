import { describe, it, expect } from 'vitest'
import { checkHealthStale } from './watchdog-core'
import { HEALTH_SENTINEL, ALERT_SENTINEL } from './health-comment'

const NOW = new Date('2026-04-30T12:00:00Z')

function health(daysAgo: number) {
  const d = new Date(NOW.getTime() - daysAgo * 86400 * 1000)
  return { body: `${HEALTH_SENTINEL}\n✅ stub`, createdAt: d.toISOString() }
}
function alert(daysAgo: number) {
  const d = new Date(NOW.getTime() - daysAgo * 86400 * 1000)
  return { body: `${ALERT_SENTINEL}\n⚠️ stub`, createdAt: d.toISOString() }
}
function other(daysAgo: number) {
  const d = new Date(NOW.getTime() - daysAgo * 86400 * 1000)
  return { body: 'unrelated comment', createdAt: d.toISOString() }
}

const MAX = 192       // 8 days
const COOLDOWN = 24   // 1 day

describe('checkHealthStale', () => {
  it('alerts when there are no health comments at all', () => {
    const d = checkHealthStale({
      comments: [other(1)],
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('alert')
    expect(d.latestHealthAt).toBeNull()
    expect(d.alertBody).toContain(ALERT_SENTINEL)
  })

  it('is quiet when the latest health comment is fresh', () => {
    const d = checkHealthStale({
      comments: [health(1)],
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('quiet')
    expect(d.latestHealthAt).toBe(health(1).createdAt)
    expect(d.alertBody).toBeNull()
  })

  it('alerts when the latest health comment is older than the threshold and no prior alert', () => {
    const d = checkHealthStale({
      comments: [health(10)],   // 10 days > 8-day threshold
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('alert')
    expect(d.latestHealthAt).toBe(health(10).createdAt)
    expect(d.alertBody).toContain(ALERT_SENTINEL)
    expect(d.alertBody).toContain('Last health check:')
  })

  it('suppresses alert when a prior alert is within the cooldown window', () => {
    const d = checkHealthStale({
      comments: [health(10), alert(0.5)],   // alert 12h ago, cooldown 24h
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('suppressed-cooldown')
    expect(d.latestAlertAt).toBe(alert(0.5).createdAt)
    expect(d.alertBody).toBeNull()
  })

  it('re-alerts when the prior alert is older than the cooldown window', () => {
    const d = checkHealthStale({
      comments: [health(10), alert(2)],   // alert 2 days ago, cooldown 1 day
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('alert')
    expect(d.latestAlertAt).toBe(alert(2).createdAt)
  })

  it('ignores comments that are neither health nor alert', () => {
    const d = checkHealthStale({
      comments: [other(0.1), health(1), other(0.2)],
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('quiet')
    expect(d.latestHealthAt).toBe(health(1).createdAt)
  })

  it('picks the newest health comment when multiple exist', () => {
    const d = checkHealthStale({
      comments: [health(20), health(2), health(50)],
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('quiet')
    expect(d.latestHealthAt).toBe(health(2).createdAt)
  })
})
