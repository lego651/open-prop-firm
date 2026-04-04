'use client'

import { useAppShell } from '@/contexts/AppShellContext'
import { useSearch } from '@/contexts/SearchContext'

type EmptyPaneStateProps = {
  paneId: string
}

export default function EmptyPaneState({ paneId }: EmptyPaneStateProps) {
  const { closePane } = useAppShell()
  const { open: openSearch } = useSearch()

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="flex w-full items-center justify-between gap-6 rounded px-3 py-1.5 text-sm text-[var(--muted-foreground)] opacity-40 cursor-not-allowed"
        >
          <span>Create new note</span>
          <kbd className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs font-mono text-[var(--muted-foreground)]">
            Cmd+N
          </kbd>
        </button>

        <button
          type="button"
          onClick={openSearch}
          className="flex w-full items-center justify-between gap-6 rounded px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition-colors duration-150 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <span>Go to file</span>
          <kbd className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs font-mono text-[var(--muted-foreground)]">
            Cmd+O
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => closePane(paneId)}
          className="flex w-full items-center justify-between gap-6 rounded px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition-colors duration-150 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <span>Close</span>
        </button>
      </div>
    </div>
  )
}
