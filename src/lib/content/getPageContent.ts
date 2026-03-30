import 'server-only'
import { cache } from 'react'
import { readFile, access } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeStringify from 'rehype-stringify'
import { getContentTree } from './getContentTree'
import type { Frontmatter, PageContent } from '@/types/content'
import { WIKILINK_RE } from './wikilinks'

const DATA_ROOT = path.join(process.cwd(), 'data')

function parseFrontmatter(data: Record<string, unknown>, slug: string): Frontmatter {
  const required = ['title', 'firm', 'category', 'type', 'status'] as const
  for (const field of required) {
    if (typeof data[field] !== 'string' || !data[field]) {
      throw new Error(`Content file ${slug}: missing or invalid frontmatter field "${field}"`)
    }
  }
  if (!Array.isArray(data.sources)) {
    throw new Error(`Content file ${slug}: frontmatter field "sources" must be an array`)
  }
  return data as unknown as Frontmatter
}

/**
 * Convert [[target|alias]] wikilinks to standard markdown links before
 * the unified pipeline runs. This replaces @portaljs/remark-wiki-link
 * which has a micromark v1/v4 compatibility bug that crashes Turbopack SSR builds.
 */
function resolveWikilinks(
  markdown: string,
  slugToPathMap: Record<string, string>,
) {
  return markdown.replace(WIKILINK_RE, (_, target: string, alias?: string) => {
    const resolved = slugToPathMap[target] ?? target
    const displayName = alias || target
    return `[${displayName}](/${resolved})`
  })
}

// cache() deduplicates calls within a single render pass (e.g. generateMetadata + page component
// both call getPageContent for the same slug — only one filesystem read occurs).
export const getPageContent = cache(async (slug: string): Promise<PageContent> => {
  // Explicit path construction — no .. traversal
  let filePath = path.join(DATA_ROOT, slug + '.md')

  // index.md fallback: slug 'firms/cfd/funded-next' → data/firms/cfd/funded-next/index.md
  try {
    await access(filePath)
  } catch {
    filePath = path.join(DATA_ROOT, slug, 'index.md')
  }

  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    throw new Error(`Content file not found: ${slug}`)
  }

  const { data, content } = matter(raw)
  const frontmatter = parseFrontmatter(data, slug)

  const { slugToPathMap } = await getContentTree()
  const resolved = resolveWikilinks(content, slugToPathMap)

  const vfile = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, defaultSchema)
    .use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['noopener', 'noreferrer'],
    })
    .use(rehypeStringify)
    .process(resolved)

  return {
    frontmatter,
    htmlContent: String(vfile),
    slug,
  }
})
