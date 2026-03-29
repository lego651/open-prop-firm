import 'server-only'
import { readFile } from 'fs/promises'
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

const FIRMS_DIR = path.join(process.cwd(), 'data', 'firms')

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

export async function getPageContent(slug: string): Promise<PageContent> {
  const filePath = path.join(FIRMS_DIR, '..', slug + '.md')

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
}
