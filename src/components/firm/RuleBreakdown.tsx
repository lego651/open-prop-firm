import { splitRulesIntoSections } from './rule-breakdown-helpers'

interface RuleBreakdownProps {
  rulesHtml: string
}

/**
 * DATA layer. Renders rules.md body as default-closed <details> sections,
 * one per top-level H2. Native HTML — no client JS.
 *
 * Safety: `dangerouslySetInnerHTML` input is pre-sanitized by the unified
 * pipeline in `getPageContent` (rehypeSanitize with the default schema).
 * Do not pass untrusted HTML from any other source.
 */
export function RuleBreakdown({ rulesHtml }: RuleBreakdownProps) {
  const sections = splitRulesIntoSections(rulesHtml)
  if (sections.length === 0) return null

  return (
    <section aria-label="Rule breakdown" className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Rule breakdown</h3>
      <div className="space-y-2">
        {sections.map((s) => (
          <details key={s.slug} className="rounded-md border border-[var(--border)] px-4 py-2">
            <summary className="cursor-pointer select-none py-1 font-medium">{s.title}</summary>
            <div
              className="prose prose-sm mt-2 max-w-none text-[var(--foreground)]"
              dangerouslySetInnerHTML={{ __html: s.html }}
            />
          </details>
        ))}
      </div>
    </section>
  )
}
