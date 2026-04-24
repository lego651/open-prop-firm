import Link from 'next/link'
import type { FirmMeta } from '@/lib/firms/repository'
import { buildSnapshotChips } from '@/components/firm/snapshot-helpers'
import { buildFitScoreRows } from '@/components/firm/fit-score-helpers'

interface FirmCardProps {
  firm: FirmMeta
}

const PREVIEW_CHIP_KEYS = ['payout_split', 'max_drawdown', 'consistency_rule'] as const

function pickTopFitRow(fitScore: FirmMeta['fitScore']) {
  const rows = buildFitScoreRows(fitScore)
  let top = rows[0]
  for (const r of rows) {
    if (r.rating > top.rating) top = r
  }
  return top
}

/**
 * Preview card for /firms grid and /-landing. Whole card is a link into
 * the firm detail page.
 */
export function FirmCard({ firm }: FirmCardProps) {
  const allChips = buildSnapshotChips(firm.snapshot)
  const previewChips = PREVIEW_CHIP_KEYS.map((key) => allChips.find((c) => c.key === key)).filter(
    (c): c is NonNullable<typeof c> => c !== undefined,
  )
  const topFit = pickTopFitRow(firm.fitScore)

  return (
    <Link
      href={firm.href}
      className="block rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 transition-colors hover:border-[var(--ring)]"
      aria-label={`${firm.name} — open decision page`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{firm.name}</h3>
        <span className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
          {firm.category}
        </span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2 text-xs">
        {previewChips.map((chip) => (
          <li
            key={chip.key}
            className="rounded-full border border-[var(--border)] px-2 py-0.5"
          >
            <span className="font-medium">{chip.label}:</span>{' '}
            <span>{chip.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
        Best for: <span className="text-[var(--foreground)]">{topFit.label}</span>{' '}
        <span aria-label={`${topFit.rating} out of 5`}>({topFit.rating}★)</span>
      </p>
    </Link>
  )
}
