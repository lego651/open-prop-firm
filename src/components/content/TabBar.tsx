'use client'

import { X, Plus, PanelRight } from 'lucide-react'
import type { TabEntry } from '@/types/content'

type TabBarProps = {
  openTabs: TabEntry[]
  activeSlug: string
  onTabClick: (slug: string) => void
  onTabClose: (slug: string) => void
  onNewTab: () => void
  onTogglePanel3: () => void // VISIBILITY toggle — shows/hides Panel 3
}

export default function TabBar({
  openTabs,
  activeSlug,
  onTabClick,
  onTabClose,
  onNewTab,
  onTogglePanel3,
}: TabBarProps) {
  return (
    <div className="flex items-center border-b border-[var(--border)] h-9 overflow-hidden bg-[var(--sidebar-bg)]">
      {/* Tabs scroll container */}
      <div className="tab-scroll flex-1 flex overflow-x-auto">
        {openTabs.map((tab) => {
          const isActive = tab.slug === activeSlug
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => onTabClick(tab.slug)}
              className={[
                'group min-w-[120px] max-w-[200px] h-9 px-3 shrink-0 flex items-center gap-1.5 border-r border-[var(--border)] relative',
                isActive
                  ? 'bg-[var(--background)] border-b-2 border-b-[var(--accent)]'
                  : 'bg-[var(--sidebar-bg)] hover:bg-[var(--muted)]',
              ].join(' ')}
            >
              <span className="text-[13px] truncate flex-1 text-[var(--foreground)]">
                {tab.title}
              </span>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-sm hover:bg-[var(--muted)] p-0.5"
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(tab.slug)
                }}
              >
                <X size={11} />
              </button>
            </button>
          )
        })}
      </div>

      {/* New tab button */}
      <button
        type="button"
        onClick={onNewTab} // TODO: wire to SearchModal in Sprint 3
        className="h-9 w-9 shrink-0 flex items-center justify-center hover:bg-[var(--muted)]"
      >
        <Plus size={16} />
      </button>

      {/* Panel 3 visibility toggle */}
      <button
        type="button"
        onClick={onTogglePanel3}
        title="Toggle sidebar"
        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md hover:bg-[var(--muted)] mr-1"
      >
        <PanelRight size={16} />
      </button>
    </div>
  )
}
