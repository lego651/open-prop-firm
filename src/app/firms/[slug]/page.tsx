import { notFound } from 'next/navigation'
import { getPageContent } from '@/lib/content/getPageContent'
import { loadFirm, listFirms } from '@/lib/firms/repository'

// v1-f7 components
import { SnapshotBar } from '@/components/firm/SnapshotBar'
import { KillYouFirstList } from '@/components/firm/KillYouFirstList'
import { FitScoreTable } from '@/components/firm/FitScoreTable'

// v1-f8 components
import { VerificationBadge } from '@/components/firm/VerificationBadge'
import { Changelog } from '@/components/firm/Changelog'
import { RuleBreakdown } from '@/components/firm/RuleBreakdown'
import { PreTradeChecklist } from '@/components/firm/PreTradeChecklist'
import { AffiliateCTA } from '@/components/firm/AffiliateCTA'

import { MissingDecisionPlaceholder } from '@/components/firm/MissingDecisionPlaceholder'

export const dynamic = 'force-static'

export async function generateStaticParams() {
  const firms = await listFirms()
  return firms.map((f) => ({ slug: f.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const firm = await loadFirm(slug)
  if (!firm) return { title: 'Firm not found — OpenPropFirm' }
  return {
    title: `${firm.name} — OpenPropFirm`,
    description: `Pre-trade decision page for ${firm.name}. Snapshot, kill-you-first warnings, fit score, and rule breakdown.`,
  }
}

async function loadRulesHtml(category: 'cfd' | 'futures', slug: string): Promise<{
  html: string
  firstSourceUrl: string | null
}> {
  try {
    const { htmlContent, frontmatter } = await getPageContent(`firms/${category}/${slug}/rules`)
    const firstSourceUrl = frontmatter.sources[0]?.url ?? null
    return { html: htmlContent, firstSourceUrl }
  } catch {
    return { html: '', firstSourceUrl: null }
  }
}

export default async function FirmDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const firm = await loadFirm(slug)
  if (!firm) notFound()

  const rules = await loadRulesHtml(firm.category, slug)
  const rulesSourcesUrl = rules.firstSourceUrl

  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      {/* DATA ZONE — neutral */}
      <div className="space-y-4">
        <VerificationBadge
          lastVerified={firm.lastVerified}
          verifiedBy={firm.verifiedBy}
          sourcesUrl={rulesSourcesUrl}
        />

        {firm.decision ? (
          <SnapshotBar snapshot={firm.decision.snapshot} />
        ) : (
          <MissingDecisionPlaceholder firmName={firm.name} />
        )}

        {rules.html && <RuleBreakdown rulesHtml={rules.html} />}

        {firm.decision && <Changelog entries={firm.decision.changelog} />}
      </div>

      {/* OPINION ZONE — amber (only if decision block exists) */}
      {firm.decision && (
        <div className="mt-6 space-y-4">
          <KillYouFirstList warnings={firm.decision.kill_you_first} />
          <FitScoreTable fitScore={firm.decision.fit_score} />
        </div>
      )}

      {/* ACTION ZONE — green (only if decision block exists) */}
      {firm.decision && (
        <div className="mt-6 space-y-4">
          <PreTradeChecklist
            key={firm.slug}
            items={firm.decision.pre_trade_checklist}
            firmSlug={firm.slug}
          />
          <AffiliateCTA
            firmSlug={firm.slug}
            url={firm.decision.affiliate.url}
            utm={firm.decision.affiliate.utm}
          />
        </div>
      )}
    </article>
  )
}
