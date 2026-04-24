import { AlertTriangle } from 'lucide-react'
import type { KillYouFirstEntry } from '../../../scripts/monitor/schema'

interface KillYouFirstListProps {
  warnings: KillYouFirstEntry[]
}

/**
 * OPINION layer — amber-tinted. Renders 2-3 "account killer" warnings
 * authored by the founder, each with a linked source.
 */
export function KillYouFirstList({ warnings }: KillYouFirstListProps) {
  if (!warnings || warnings.length === 0) return null

  return (
    <section
      aria-label="Account killers"
      className="rounded-lg p-4 mt-4 bg-[var(--opinion-tint-bg)] border border-[var(--opinion-tint-border)]"
    >
      <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-1">
        Founder&rsquo;s opinion
      </div>
      <h3 className="text-lg font-semibold mb-3">Will kill your account first</h3>
      <ul className="space-y-3">
        {warnings.map((w) => (
          <li key={w.title} className="flex gap-3">
            <AlertTriangle
              className="h-4 w-4 shrink-0 mt-1 text-[var(--wikilink-missing-fg)]"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-medium">{w.title}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{w.detail}</p>
              <a
                href={w.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--link-fg)] hover:underline"
              >
                Source
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
