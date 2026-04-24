import type { Metadata } from 'next'
import { listFirms } from '@/lib/firms/repository'
import { FirmCardGrid } from '@/components/firm/FirmCardGrid'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Firms — OpenPropFirm',
  description: 'Browse prop firms with sourced rule snapshots and founder fit scores.',
}

export default async function FirmsIndexPage() {
  const firms = await listFirms()
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Firms</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Pick a firm to see its pre-trade decision page — snapshot, warnings, fit score, rule breakdown, and checklist.
        </p>
      </header>
      <FirmCardGrid firms={firms} />
    </main>
  )
}
