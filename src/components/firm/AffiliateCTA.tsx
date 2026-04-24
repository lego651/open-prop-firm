import { buttonVariants } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface AffiliateCTAProps {
  firmSlug: string
  url: string | null
  utm: string
}

function buildHref(url: string, utm: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source', utm)
    return u.toString()
  } catch {
    return url
  }
}

/**
 * ACTION layer. Renders nothing when url is null/undefined/empty — critical invariant:
 * no dead buttons ever (spec §6). Appends utm_source without clobbering
 * existing query params.
 */
export function AffiliateCTA({ firmSlug, url, utm }: AffiliateCTAProps) {
  if (!url) return null

  const href = buildHref(url, utm)

  return (
    <section
      aria-label="Open account with firm"
      className="rounded-lg mt-4 p-4 bg-[var(--action-tint-bg)] border border-[var(--action-tint-border)]"
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className={buttonVariants({ variant: 'default' })}
      >
        <ExternalLink size={14} aria-hidden="true" />
        <span>Open an account with {firmSlug}</span>
      </a>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        Affiliate link — we may earn a commission at no extra cost to you.
      </p>
    </section>
  )
}
