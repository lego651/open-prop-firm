import 'server-only'
import { readFile, readdir, access } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { DecisionSchema, type Decision, type DecisionSnapshot, type FitScore } from '../../../scripts/monitor/schema'
import type { SourceEntry } from '@/types/content'

const CATEGORIES = ['cfd', 'futures'] as const
type Category = (typeof CATEGORIES)[number]

export interface FirmMeta {
  slug: string
  name: string
  category: Category
  href: string
  snapshot: DecisionSnapshot
  fitScore: FitScore
}

export interface LoadedFirm {
  slug: string
  category: Category
  name: string
  title: string
  lastVerified: string
  verifiedBy: 'bot' | 'manual'
  sources: SourceEntry[]
  decision: Decision | null
}

export interface RepositoryOptions {
  rootDir?: string
}

function defaultRoot(): string {
  return path.join(process.cwd(), 'data', 'firms')
}

function kebabToTitle(s: string): string {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

async function readIndexFrontmatter(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    await access(filePath)
  } catch {
    return null
  }
  const raw = await readFile(filePath, 'utf-8')
  return matter(raw).data as Record<string, unknown>
}

function toLoadedFirm(slug: string, category: Category, data: Record<string, unknown>): LoadedFirm {
  const title = typeof data.title === 'string' ? data.title : kebabToTitle(slug)
  const firmField = typeof data.firm === 'string' ? data.firm : kebabToTitle(slug)
  const lastVerified = typeof data.last_verified === 'string' ? data.last_verified : ''
  const verifiedBy: 'bot' | 'manual' =
    data.verified_by === 'bot' || data.verified_by === 'manual' ? data.verified_by : 'manual'
  const sources: SourceEntry[] = Array.isArray(data.sources) ? (data.sources as SourceEntry[]) : []

  let decision: Decision | null = null
  if (data.decision !== undefined && data.decision !== null) {
    const parsed = DecisionSchema.safeParse(data.decision)
    if (!parsed.success) {
      throw new Error(
        `[repository] decision block invalid for ${category}/${slug}: ${parsed.error.message}`,
      )
    }
    decision = parsed.data
  }

  return {
    slug,
    category,
    name: firmField,
    title,
    lastVerified,
    verifiedBy,
    sources,
    decision,
  }
}

export async function loadFirm(
  slug: string,
  opts: RepositoryOptions = {},
): Promise<LoadedFirm | null> {
  const root = opts.rootDir ?? defaultRoot()
  for (const category of CATEGORIES) {
    const indexPath = path.join(root, category, slug, 'index.md')
    const data = await readIndexFrontmatter(indexPath)
    if (!data) continue
    return toLoadedFirm(slug, category, data)
  }
  return null
}

export async function listFirms(opts: RepositoryOptions = {}): Promise<FirmMeta[]> {
  const root = opts.rootDir ?? defaultRoot()
  const metas: FirmMeta[] = []

  for (const category of CATEGORIES) {
    const catDir = path.join(root, category)
    let entries
    try {
      entries = await readdir(catDir, { withFileTypes: true })
    } catch {
      continue
    }
    const slugs = entries
      .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
      .map((d) => d.name)
      .sort()

    for (const slug of slugs) {
      const firm = await loadFirm(slug, { rootDir: root })
      if (!firm || !firm.decision) continue
      metas.push({
        slug: firm.slug,
        name: firm.name,
        category: firm.category,
        href: `/firms/${firm.slug}`,
        snapshot: firm.decision.snapshot,
        fitScore: firm.decision.fit_score,
      })
    }
  }

  return metas
}
