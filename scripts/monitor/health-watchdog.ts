/**
 * Silent-failure watchdog for the monitoring bot.
 *
 * Reads the pinned GitHub issue's recent comments, decides whether the latest
 * health-check comment is stale, and posts an alert comment when it is (gated
 * by a cooldown so stale issues don't flood the inbox).
 *
 * Invoked from .github/workflows/health-watchdog.yml on a daily cron.
 *
 * Exit code is 0 for both "quiet" and "alert posted successfully" — we never
 * want this job to turn red just because the bot has been silent. The GitHub
 * issue-subscriber email (triggered by the alert comment) is the signal.
 */

import { execFileSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { checkHealthStale, type IssueComment } from './watchdog-core'

interface Args {
  dryRun: boolean
  maxSilenceHours: number
  alertCooldownHours: number
}

function parsePositive(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive number, got ${JSON.stringify(raw)}`)
  }
  return n
}

function parseArgs(argv: string[]): Args {
  // Seed from env first, then allow CLI flags to override.
  let dryRun = false
  let maxSilenceHours = parsePositive('MAX_SILENCE_HOURS', process.env.MAX_SILENCE_HOURS, 192)
  let alertCooldownHours = parsePositive(
    'ALERT_COOLDOWN_HOURS',
    process.env.ALERT_COOLDOWN_HOURS,
    24,
  )

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') {
      dryRun = true
    } else if (a === '--max-silence-hours') {
      maxSilenceHours = parsePositive('--max-silence-hours', argv[++i], maxSilenceHours)
    } else if (a === '--alert-cooldown-hours') {
      alertCooldownHours = parsePositive(
        '--alert-cooldown-hours',
        argv[++i],
        alertCooldownHours,
      )
    }
  }

  return { dryRun, maxSilenceHours, alertCooldownHours }
}

function fetchComments(issueNumber: string): IssueComment[] {
  const raw = execFileSync(
    'gh',
    ['issue', 'view', issueNumber, '--json', 'comments', '-q', '.comments'],
    { encoding: 'utf-8' },
  )
  const parsed = JSON.parse(raw) as Array<{ body: string; createdAt: string }>
  return parsed.map((c) => ({ body: c.body, createdAt: c.createdAt }))
}

function postAlert(issueNumber: string, body: string): void {
  const bodyFile = path.join(tmpdir(), `opf-watchdog-alert-${Date.now()}.md`)
  try {
    writeFileSync(bodyFile, body, 'utf-8')
    execFileSync('gh', ['issue', 'comment', issueNumber, '--body-file', bodyFile], {
      stdio: 'inherit',
    })
  } finally {
    try { unlinkSync(bodyFile) } catch { /* ignore */ }
  }
}

function main(): void {
  const { dryRun, maxSilenceHours, alertCooldownHours } = parseArgs(process.argv.slice(2))

  const issueNumber = process.env.HEALTH_CHECK_ISSUE_NUMBER
  if (!issueNumber) {
    throw new Error('HEALTH_CHECK_ISSUE_NUMBER env var is required')
  }
  if (!/^\d+$/.test(issueNumber)) {
    throw new Error(
      `HEALTH_CHECK_ISSUE_NUMBER must be a positive integer, got ${JSON.stringify(issueNumber)}`,
    )
  }

  console.log(
    `[watchdog] issue=#${issueNumber}, maxSilence=${maxSilenceHours}h, cooldown=${alertCooldownHours}h${
      dryRun ? ', dry-run' : ''
    }`,
  )

  const comments = fetchComments(issueNumber)
  const decision = checkHealthStale({
    comments,
    now: new Date(),
    maxSilenceHours,
    alertCooldownHours,
  })

  console.log(
    `[watchdog] decision=${decision.action} latestHealth=${
      decision.latestHealthAt ?? 'never'
    } latestAlert=${decision.latestAlertAt ?? 'never'}`,
  )

  if (decision.action !== 'alert') {
    console.log('[watchdog] no alert posted.')
    return
  }

  if (dryRun) {
    console.log('[watchdog] dry-run — alert body would be:')
    console.log(decision.alertBody)
    return
  }

  try {
    postAlert(issueNumber, decision.alertBody!)
    console.log(`[watchdog] alert posted to issue #${issueNumber}.`)
  } catch (err) {
    console.error(
      `[watchdog] failed to post alert to issue #${issueNumber}:`,
      err instanceof Error ? err.message : err,
    )
    // Do not exit non-zero — see top-of-file docstring.
  }
}

try {
  main()
} catch (err) {
  console.error('[watchdog] fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
}
