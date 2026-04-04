import { getStaticParams } from '@/lib/content/getContentTree'
import { getPageContent } from '@/lib/content/getPageContent'
import VerifiedBadge from '@/components/content/VerifiedBadge'
import MarkdownRenderer from '@/components/content/MarkdownRenderer'
import SourceFootnotes from '@/components/content/SourceFootnotes'
import SourcesFooterConnected from '@/components/content/SourcesFooterConnected'

export const dynamic = 'force-static'

export async function generateStaticParams() {
  return getStaticParams()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  try {
    const { frontmatter } = await getPageContent('firms/' + slug.join('/'))
    return {
      title: frontmatter.title + ' — OpenPropFirm',
      description: `${frontmatter.firm} — ${frontmatter.type}`,
    }
  } catch {
    return { title: 'Page Not Found — OpenPropFirm' }
  }
}

export default async function FirmPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const slugPath = 'firms/' + slug.join('/')

  let content: Awaited<ReturnType<typeof getPageContent>> | null = null
  try {
    content = await getPageContent(slugPath)
  } catch (err) {
    console.error('[FirmPage] failed to load content for', slugPath, err)
    return (
      <div className="p-8 text-sm text-[var(--muted-foreground)]">
        Unable to load content for this page.
      </div>
    )
  }

  const { frontmatter, htmlContent } = content

  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      <VerifiedBadge
        lastVerified={frontmatter.last_verified}
        status={frontmatter.status}
      />
      <MarkdownRenderer htmlContent={htmlContent} />
      <SourceFootnotes sources={frontmatter.sources} />
      <SourcesFooterConnected sources={frontmatter.sources} />
    </article>
  )
}
