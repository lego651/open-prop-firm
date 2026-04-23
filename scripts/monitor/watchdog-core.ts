import { ALERT_SENTINEL, HEALTH_SENTINEL } from './health-comment'

export interface IssueComment {
  body: string
  createdAt: string
}

export interface Decision {
  action: 'quiet' | 'alert' | 'suppressed-cooldown'
  latestHealthAt: string | null
  latestAlertAt: string | null
  alertBody: string | null
}

function newestMatching(
  comments: IssueComment[],
  sentinel: string,
): IssueComment | null {
  const matches = comments.filter((c) => c.body.includes(sentinel))
  if (matches.length === 0) return null
  return matches.reduce((a, b) =>
    new Date(a.createdAt).getTime() >= new Date(b.createdAt).getTime() ? a : b,
  )
}

function hoursAgo(isoThen: string, now: Date): number {
  return (now.getTime() - new Date(isoThen).getTime()) / (1000 * 60 * 60)
}

function renderAlertBody(
  latestHealthAt: string | null,
  maxSilenceHours: number,
  now: Date,
): string {
  const age = latestHealthAt
    ? `Last health check: ${hoursAgo(latestHealthAt, now).toFixed(1)} hours ago (${latestHealthAt})`
    : 'Last health check: never'
  return [
    ALERT_SENTINEL,
    `⚠️ Bot silent > ${maxSilenceHours}h — investigate`,
    '',
    age,
    '',
    `Checked at: ${now.toISOString()}`,
  ].join('\n')
}

/**
 * Decide whether the watchdog should post an alert comment to the pinned
 * health-check issue. Pure — no I/O, no clock reads (caller passes `now`).
 *
 * Returns `alert` with a rendered body when the latest health comment is
 * older than `maxSilenceHours` (or there is no health comment at all) AND
 * no alert has been posted within the last `alertCooldownHours`.
 */
export function checkHealthStale(input: {
  comments: IssueComment[]
  now: Date
  maxSilenceHours: number
  alertCooldownHours: number
}): Decision {
  const { comments, now, maxSilenceHours, alertCooldownHours } = input

  const latestHealth = newestMatching(comments, HEALTH_SENTINEL)
  const latestAlert = newestMatching(comments, ALERT_SENTINEL)

  const latestHealthAt = latestHealth?.createdAt ?? null
  const latestAlertAt = latestAlert?.createdAt ?? null

  const healthIsFresh =
    latestHealth !== null && hoursAgo(latestHealth.createdAt, now) < maxSilenceHours

  if (healthIsFresh) {
    return { action: 'quiet', latestHealthAt, latestAlertAt, alertBody: null }
  }

  const alertIsRecent =
    latestAlert !== null && hoursAgo(latestAlert.createdAt, now) < alertCooldownHours

  if (alertIsRecent) {
    return {
      action: 'suppressed-cooldown',
      latestHealthAt,
      latestAlertAt,
      alertBody: null,
    }
  }

  return {
    action: 'alert',
    latestHealthAt,
    latestAlertAt,
    alertBody: renderAlertBody(latestHealthAt, maxSilenceHours, now),
  }
}
