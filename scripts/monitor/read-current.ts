import { readFile } from 'fs/promises'
import fg from 'fast-glob'
import matter from 'gray-matter'
import path from 'path'
import type { CurrentSnapshot } from './types'
import { DecisionSchema } from './schema'

const CFD_SLUGS = ['funded-next', 'funding-pips']

async function firmDir(slug: string): Promise<string> {
  const category = CFD_SLUGS.includes(slug) ? 'cfd' : 'futures'
  const dir = path.join(process.cwd(), 'data', 'firms', category, slug)
  const indexPath = path.join(dir, 'index.md')
  try {
    await readFile(indexPath, 'utf-8')
  } catch {
    throw new Error(
      `readCurrentSnapshot: no index.md found for slug "${slug}" at ${indexPath}`,
    )
  }
  return dir
}

export async function readCurrentSnapshot(slug: string): Promise<CurrentSnapshot> {
  const dir = await firmDir(slug)

  const indexRaw = await readFile(path.join(dir, 'index.md'), 'utf-8')
  const { data: fm } = matter(indexRaw)
  if (!fm.decision) {
    throw new Error(
      `readCurrentSnapshot: firm "${slug}" has no decision block in its frontmatter. v1-f2 migration missing?`,
    )
  }
  const parsed = DecisionSchema.safeParse(fm.decision)
  if (!parsed.success) {
    throw new Error(
      `readCurrentSnapshot: firm "${slug}" decision block failed schema validation: ${parsed.error.message}`,
    )
  }

  const challengeFiles = await fg('challenges/*.md', { cwd: dir, absolute: true })
  let cheapestPrice: number | null = null
  let cheapestSource: string | null = null
  for (const file of challengeFiles) {
    const raw = await readFile(file, 'utf-8')
    const { data: fmChallenge } = matter(raw)
    const price = fmChallenge.price_usd
    if (typeof price === 'number' && (cheapestPrice === null || price < cheapestPrice)) {
      cheapestPrice = price
      const sources = Array.isArray(fmChallenge.sources) ? fmChallenge.sources : []
      const firstUrl = sources.find(
        (s): s is { url: string } =>
          typeof s?.url === 'string' && s.url.startsWith('https://'),
      )?.url
      cheapestSource = firstUrl ?? null
    }
  }

  return {
    snapshot: parsed.data.snapshot,
    cheapest_challenge_price_usd: cheapestPrice,
    cheapest_challenge_source_url: cheapestSource,
  }
}
