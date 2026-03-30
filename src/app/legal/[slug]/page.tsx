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
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

const LEGAL_DIR = path.join(process.cwd(), 'data', 'legal')
const VALID_SLUGS = ['terms-of-service', 'disclaimer']

export function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }))
}

export const dynamic = 'force-static'

async function getLegalPage(slug: string) {
  const filePath = path.join(LEGAL_DIR, `${slug}.md`)
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
  const { data, content } = matter(raw)
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] })
    .use(rehypeStringify)
    .process(content)
  return { title: String(data.title ?? slug), htmlContent: String(file) }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = await getLegalPage(slug)
  if (!page) return { title: 'Not Found' }
  return {
    title: page.title,
    robots: { index: false },
  }
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!VALID_SLUGS.includes(slug)) notFound()

  const page = await getLegalPage(slug)
  if (!page) notFound()

  return (
    <article className="prose prose-sm prose-invert mx-auto max-w-3xl px-6 py-10">
      <div dangerouslySetInnerHTML={{ __html: page.htmlContent }} />
    </article>
  )
}
