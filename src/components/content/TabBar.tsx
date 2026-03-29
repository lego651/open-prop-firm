'use client'

import { Menu, X, Plus, PanelRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { TabEntry } from '@/types/content'

type TabBarProps = {
  openTabs: TabEntry[]
  activeSlug: string
  onTabClick: (slug: string) => void
  onTabClose: (slug: string) => void
  onNewTab: () => void
  onTogglePanel3: () => void
  onHamburger?: () => void
}

export default function TabBar({
  openTabs,
  activeSlug,
  onTabClick,
  onTabClose,
  onNewTab,
  onTogglePanel3,
  onHamburger,
}: TabBarProps) {
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

      {/* Tabs scroll container */}
      <div className="tab-scroll flex flex-1 overflow-x-auto">
        {openTabs.map((tab) => {
          const isActive = tab.slug === activeSlug
          return (
            <div
              key={tab.slug}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              onClick={() => onTabClick(tab.slug)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onTabClick(tab.slug)
                }
              }}
              className={cn(
                'group flex h-9 max-w-[200px] min-w-[120px] shrink-0 items-center gap-1.5 px-3',
                'relative cursor-pointer border-r border-[var(--border)]',
                isActive
                  ? 'border-b-2 border-b-[var(--accent)] bg-[var(--background)]'
                  : 'bg-[var(--sidebar-bg)] hover:bg-[var(--muted)]',
              )}
            >
              <span className="flex-1 truncate text-[13px] text-[var(--foreground)]">
                {tab.title}
              </span>
              <button
                type="button"
                aria-label="Close tab"
                className="rounded-sm p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--muted)]"
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(tab.slug)
                }}
              >
                <X size={11} />
              </button>
            </div>
          )
        })}
      </div>

      {/* New tab button */}
      <button
        type="button"
        onClick={onNewTab}
        className="flex h-9 w-9 shrink-0 items-center justify-center hover:bg-[var(--muted)]"
        aria-label="New tab"
      >
        <Plus size={16} />
      </button>

      {/* Panel 3 visibility toggle */}
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
    </div>
  )
}
