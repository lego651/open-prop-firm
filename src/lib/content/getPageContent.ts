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
import type { Schema } from 'hast-util-sanitize'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeStringify from 'rehype-stringify'
import { getContentTree } from './getContentTree'
import type { Frontmatter, PageContent, SourceEntry } from '@/types/content'
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

/** Matches a single citation token — used inside the run-level replacer. */
const SINGLE_CITATION_TOKEN_RE = /\[\^src:(\d+)\]/g

/**
 * Extract the domain name from a URL, stripping "www." prefix.
 * Falls back to the raw URL string if parsing fails.
 */
function extractCitationDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Convert inline citation markers [^src:N] to badge HTML before the
 * unified pipeline runs. This is the same preprocessor pattern used by
 * resolveWikilinks() and avoids any remark/rehype plugin compatibility issues.
 *
 * Multiple adjacent citations in one run are collapsed into a single badge:
 * the first source's domain plus "+N" if there are more.
 *
 * The emitted <span> uses data attributes so the client-side handler can
 * identify and act on it without parsing label text:
 *   data-citation-indices="0,1"   (comma-separated source indices)
 *
 * rehypeSanitize is configured below to allow this span and its data-* attrs.
 */
export function resolveCitations(markdown: string, sources: SourceEntry[]): string {
  return markdown.replace(/(\[\^src:\d+\])+/g, (run) => {
    const indices: number[] = []
    let m: RegExpExecArray | null
    SINGLE_CITATION_TOKEN_RE.lastIndex = 0
    while ((m = SINGLE_CITATION_TOKEN_RE.exec(run)) !== null) {
      const idx = parseInt(m[1], 10)
      if (!indices.includes(idx)) indices.push(idx)
    }

    const firstSource = sources[indices[0]]
    if (!firstSource) {
      // Index out of range — strip the marker silently to avoid broken HTML
      return ''
    }

    const domain = extractCitationDomain(firstSource.url)
    const extra = indices.length - 1
    const label = extra > 0 ? `${domain} +${extra}` : domain
    const indicesAttr = indices.join(',')
    const safeLabel = label.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    return `<span class="citation-badge" data-citation-indices="${indicesAttr}" data-citation-label="${safeLabel}" role="button" tabindex="0" aria-label="View source: ${safeLabel}">${safeLabel}</span>`
  })
}

/**
 * Extended rehype-sanitize schema that permits the citation badge spans
 * emitted by resolveCitations(). We extend only what we need beyond the
 * defaults.
 *
 * rehype-sanitize supports wildcard attribute patterns via array tuples:
 *   ['data*']  allows any attribute whose name starts with "data"
 * See: https://github.com/rehypejs/rehype-sanitize#schema
 */
const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      'className',
      'role',
      'tabIndex',
      'ariaLabel',
      // Wildcard: allows data-citation-indices, data-citation-label, etc.
      ['data*'],
    ],
  },
}

// cache() deduplicates calls within a single render pass (e.g. generateMetadata + page component
// both call getPageContent for the same slug — only one filesystem read occurs).
export const getPageContent = cache(async (slug: string): Promise<PageContent> => {
  let filePath = path.join(DATA_ROOT, slug + '.md')

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
  const wikisResolved = resolveWikilinks(content, slugToPathMap)
  const fullyResolved = resolveCitations(wikisResolved, frontmatter.sources)

  const vfile = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['noopener', 'noreferrer'],
    })
    .use(rehypeStringify)
    .process(fullyResolved)

  return {
    frontmatter,
    htmlContent: String(vfile),
    slug,
  }
})
