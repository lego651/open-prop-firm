import 'server-only'
import { cache } from 'react'
import { readFile, access } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { remarkWikiLink } from '@portaljs/remark-wiki-link'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeStringify from 'rehype-stringify'
import { getContentTree } from './getContentTree'
import type { Frontmatter, PageContent } from '@/types/content'

const DATA_ROOT = path.join(process.cwd(), 'data')

// Allow data-wikilink and data-wikilink-missing attributes on <a> tags
// so the client-side MarkdownRenderer can intercept wikilink clicks via event delegation.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...((defaultSchema.attributes?.a as string[]) ?? []),
      'dataWikilink',
      'dataWikilinkMissing',
    ],
  },
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
  const frontmatter = data as Frontmatter

  // Resolve wikilinks: use slugToPathMap from content tree so firm-relative
  // wikilink targets (e.g. "funded-next/rules") map to full URL slugs.
  const { validSlugs, slugToPathMap } = await getContentTree()

  const vfile = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkWikiLink, {
      permalinks: validSlugs,
      wikiLinkResolver: (name: string) => {
        // Resolve firm-relative path to full URL slug via the map.
        // Fall back to treating the name as a full slug if not in map.
        const resolved = slugToPathMap[name] ?? name
        return [resolved]
      },
      hrefTemplate: (permalink: string) => `/${permalink}`,
      wikiLinkClassName: 'wikilink',
      newClassName: 'wikilink-missing',
    })
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['noopener', 'noreferrer'],
    })
    .use(rehypeStringify)
    .process(content)

  return {
    frontmatter,
    htmlContent: String(vfile),
    slug,
  }
})
