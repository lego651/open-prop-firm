/**
 * Append changelog entries to a firm's frontmatter after a bot-labeled PR merges.
 *
 * Invoked from .github/workflows/append-changelog.yml with:
 *   tsx --project tsconfig.scripts.json scripts/monitor/append-changelog.ts \
 *     --pr-number ${{ github.event.pull_request.number }}
 *
 * Side effects (skipped on --dry-run):
 *   - Rewrites matching data/firms/<category>/<slug>/**\/*.md files
 *   - git add + commit + pull --rebase + push to main
 */

import { readFile, writeFile } from 'fs/promises'
import { execFileSync } from 'child_process'
import path from 'path'
import { parsePRBody } from './parse-pr-body'
import { applyChangelogToFileContent } from './write-changelog'

interface Args {
  prNumber: string
  dryRun: boolean
  mergeDate: string
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> & { dryRun: boolean } = { dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--pr-number') out.prNumber = argv[++i]
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--merge-date') out.mergeDate = argv[++i]
  }
  if (!out.prNumber) throw new Error('append-changelog.ts: --pr-number is required')
  if (!out.mergeDate) {
    out.mergeDate = new Date().toISOString().slice(0, 10)
  }
  return out as Args
}

function firmDir(slug: string): string {
  const cfdSlugs = ['funded-next', 'funding-pips']
  const category = cfdSlugs.includes(slug) ? 'cfd' : 'futures'
  return path.join(process.cwd(), 'data', 'firms', category, slug)
}

async function main() {
  const { prNumber, dryRun, mergeDate } = parseArgs(process.argv.slice(2))

  console.log(
    `[append-changelog] PR #${prNumber}, merge date ${mergeDate}${dryRun ? ', dry-run' : ''}`,
  )

  const body = execFileSync('gh', ['pr', 'view', prNumber, '--json', 'body', '-q', '.body'], {
    encoding: 'utf-8',
  })
  const parsed = parsePRBody(body)

  if (parsed.entries.length === 0) {
    console.log(
      `[append-changelog] PR body reported no drift for ${parsed.firmSlug} — nothing to append.`,
    )
    return
  }

  const dir = firmDir(parsed.firmSlug)
  const fg = (await import('fast-glob')).default
  const files = await fg('**/*.md', { cwd: dir, absolute: true })

  const updated: string[] = []
  for (const file of files) {
    const before = await readFile(file, 'utf-8')
    if (!/^\s*changelog:/m.test(before)) continue
    let after: string
    try {
      after = applyChangelogToFileContent(before, parsed.entries, mergeDate)
    } catch (err) {
      const rel = path.relative(process.cwd(), file)
      throw new Error(`${rel}: ${err instanceof Error ? err.message : String(err)}`)
    }
    if (after === before) continue
    if (!dryRun) await writeFile(file, after, 'utf-8')
    updated.push(file)
    console.log(
      `[append-changelog] ${dryRun ? 'would update' : 'updated'} ${path.relative(process.cwd(), file)}`,
    )
  }

  if (updated.length === 0) {
    console.log('[append-changelog] no files matched — nothing to commit.')
    return
  }

  if (dryRun) {
    console.log(
      `[append-changelog] dry-run: ${updated.length} file(s) would be changed. Skipping git push.`,
    )
    return
  }

  const msg = `[bot] append changelog for ${parsed.firmSlug} (PR #${prNumber})`
  execFileSync('git', ['add', 'data/firms'], { stdio: 'inherit' })
  execFileSync('git', ['commit', '-m', msg], { stdio: 'inherit' })

  try {
    execFileSync('git', ['pull', '--rebase', 'origin', 'main'], { stdio: 'inherit' })
  } catch (err) {
    console.error('[append-changelog] rebase failed; aborting push.')
    throw err
  }
  execFileSync('git', ['push', 'origin', 'main'], { stdio: 'inherit' })
  console.log('[append-changelog] committed and pushed to main.')
}

main().catch((err) => {
  console.error('[append-changelog] failed:', err)
  process.exit(1)
})
