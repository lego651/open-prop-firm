'use client'

import { cn } from '@/lib/utils'

type PaneTitleStripProps = {
  title: string
  isActive: boolean
  onClick: () => void
}

export default function PaneTitleStrip({
  title,
  isActive,
  onClick,
}: PaneTitleStripProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Activate pane: ${title}`}
      className={cn(
        'flex h-full w-6 shrink-0 items-start justify-center',
        'cursor-pointer border-r border-[var(--border)]',
        'transition-colors duration-150',
        isActive
          ? 'bg-[var(--background)] text-[var(--accent)]'
          : 'bg-[var(--sidebar-bg)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
      )}
    >
      <span
        className="truncate pt-2 text-[11px] font-medium leading-none"
        style={{ writingMode: 'vertical-rl' }}
      >
        {title}
      </span>
    </button>
  )
}
