import 'server-only'
import { readFile } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeStringify from 'rehype-stringify'

export const STATIC_PAGE_SLUGS = ['about', 'disclosure', 'terms'] as const
export type StaticPageSlug = (typeof STATIC_PAGE_SLUGS)[number]

export interface StaticPage {
  slug: StaticPageSlug
  title: string
  htmlContent: string
}

export interface LoadStaticPageOptions {
  rootDir?: string
}

function defaultRoot(): string {
  return path.join(process.cwd(), 'data', 'static')
}

export async function loadStaticPage(
  slug: StaticPageSlug,
  opts: LoadStaticPageOptions = {},
): Promise<StaticPage> {
  const root = opts.rootDir ?? defaultRoot()
  const filePath = path.join(root, `${slug}.md`)
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch (err) {
    throw new Error(
      `[static] static page not found: ${slug} at ${filePath} (${(err as Error).message})`,
    )
  }
  const { data, content } = matter(raw)
  const title =
    typeof data.title === 'string' && data.title.length > 0
      ? data.title
      : slug.charAt(0).toUpperCase() + slug.slice(1)
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] })
    .use(rehypeStringify)
    .process(content)
  return { slug, title, htmlContent: String(file) }
}
