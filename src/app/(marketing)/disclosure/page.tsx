import type { Metadata } from 'next'
import { loadStaticPage } from '@/lib/content/static'

export const dynamic = 'force-static'

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('disclosure')
  return { title: page.title }
}

export default async function DisclosurePage() {
  const page = await loadStaticPage('disclosure')
  return (
    <article className="prose prose-sm prose-invert mx-auto max-w-3xl px-6 py-10">
      <div dangerouslySetInnerHTML={{ __html: page.htmlContent }} />
    </article>
  )
}
