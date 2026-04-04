'use client'

import { Menu, Plus, PanelRight, Search } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSearch } from '@/contexts/SearchContext'

type TabBarProps = {
  onNewPane?: () => void
  onTogglePanel3?: () => void
  onHamburger?: () => void
}

export default function TabBar({
  onNewPane,
  onTogglePanel3,
  onHamburger,
}: TabBarProps) {
  const { open: openSearch } = useSearch()

  return (
    <div className="flex h-9 items-center overflow-hidden border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
      {/* Hamburger — mobile only, rendered when onHamburger is provided */}
      {onHamburger && (
        <button
          type="button"
          onClick={onHamburger}
          aria-label="Open navigation"
          className="flex h-9 w-9 shrink-0 items-center justify-center hover:bg-[var(--muted)]"
        >
          <Menu size={16} />
        </button>
      )}

      {/* Spacer — fills the centre so action buttons stay right-aligned */}
      <div className="flex-1" />

      {/* New pane button */}
      {onNewPane && (
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={onNewPane}
            aria-label="New pane"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-[var(--muted)]"
          >
            <Plus size={16} />
          </TooltipTrigger>
          <TooltipContent>New pane</TooltipContent>
        </Tooltip>
      )}

      {/* Search button — reads from SearchContext */}
      <button
        type="button"
        onClick={openSearch}
        className="flex size-7 items-center justify-center rounded-md hover:bg-[var(--muted)]"
        aria-label="Search (Cmd+K)"
        title="Search (⌘K)"
      >
        <Search size={14} />
      </button>

      {/* Panel 3 visibility toggle — only rendered when handler is provided */}
      {onTogglePanel3 && (
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={onTogglePanel3}
            aria-label="Toggle sidebar"
            className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-[var(--muted)]"
          >
            <PanelRight size={16} />
          </TooltipTrigger>
          <TooltipContent>Toggle sidebar</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
