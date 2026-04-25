import type { Metadata } from 'next'
import Link from 'next/link'
import { listFirms } from '@/lib/firms/repository'
import { FirmCardGrid } from '@/components/firm/FirmCardGrid'
import { Hero } from '@/components/marketing/Hero'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'OpenPropFirm — the pre-trade decision page for prop firm traders',
  description:
    'Sourced rules, monitored daily. Labeled opinion from a founder who trades all four firms. One page, five seconds — should you trade this firm today?',
}

export default async function LandingPage() {
  const firms = await listFirms()

  return (
    <>
      <Hero />

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <header className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Firms we cover</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Each firm has a sourced snapshot, a "Kill You First" warning list, a fit score,
            and an interactive pre-trade checklist.
          </p>
        </header>
        <FirmCardGrid firms={firms} />

        <p className="mt-10 text-sm text-[var(--muted-foreground)]">
          Affiliate links are disclosed on each firm page and in the{' '}
          <Link href="/disclosure" className="underline hover:text-[var(--foreground)]">
            disclosure policy
          </Link>
          . The site is open source —{' '}
          <a
            href="https://github.com/lego651/open-prop-firm"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--foreground)]"
          >
            clone it to Obsidian
          </a>
          .
        </p>
      </section>
    </>
  )
}
