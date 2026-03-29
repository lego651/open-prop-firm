'use client'

import { PanelLeft, Search, Settings } from 'lucide-react'
import type { TreeNode } from '@/types/content'
import NavFileTree from '@/components/nav/NavFileTree'
import { ThemeToggle } from '@/components/nav/ThemeToggle'

type NavPanelProps = {
  treeData: TreeNode[]
  activeSlug: string
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function NavPanel({
  treeData,
  activeSlug,
  collapsed,
  onToggleCollapse,
}: NavPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center border-b border-[var(--border)] px-3">
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-md hover:bg-[var(--muted)]"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft size={16} />
        </button>
        {!collapsed && (
          <span className="ml-2 text-[14px] font-medium text-[var(--foreground)]">
            OpenPropFirm
          </span>
        )}
      </div>

      {/* Search trigger */}
      {!collapsed && (
        <div className="mx-2 mt-2 mb-1 shrink-0">
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 text-[13px] text-[var(--muted-foreground)]"
            onClick={() => {}}
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px]">
              ⌘K
            </kbd>
          </button>
          {/* TODO: wire to SearchModal in Sprint 3 */}
        </div>
      )}

      {/* File tree */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          <NavFileTree treeData={treeData} activeSlug={activeSlug} />
        </div>
      )}

      {/* Bottom bar */}
      {!collapsed && (
        <div className="flex h-10 shrink-0 items-center justify-between border-t border-[var(--border)] px-3">
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md hover:bg-[var(--muted)]"
            onClick={() => console.log('settings — v2')}
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>
          <ThemeToggle />
        </div>
      )}
    </div>
  )
}
