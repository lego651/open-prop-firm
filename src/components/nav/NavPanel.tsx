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

export default function NavPanel({ treeData, activeSlug, collapsed, onToggleCollapse }: NavPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center h-12 px-3 border-b border-[var(--border)] shrink-0">
        <button
          type="button"
          className="size-7 rounded-md hover:bg-[var(--muted)] flex items-center justify-center"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft size={16} />
        </button>
        {!collapsed && (
          <span className="text-[14px] font-medium text-[var(--foreground)] ml-2">OpenPropFirm</span>
        )}
      </div>

      {/* Search trigger */}
      {!collapsed && (
        <div className="mx-2 mb-1 shrink-0 mt-2">
          <button
            type="button"
            className="w-full flex items-center gap-2 h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] text-[13px]"
            onClick={() => {}}
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)]">⌘K</kbd>
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
        <div className="flex items-center justify-between px-3 border-t border-[var(--border)] shrink-0 h-10">
          <button
            type="button"
            className="size-7 rounded-md hover:bg-[var(--muted)] flex items-center justify-center"
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
