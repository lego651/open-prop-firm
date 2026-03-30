'use client'

import { PanelLeft, Search, Settings } from 'lucide-react'
import Link from 'next/link'
import { useAppShell } from '@/contexts/AppShellContext'
import NavFileTree from '@/components/nav/NavFileTree'
import { ThemeToggle } from '@/components/nav/ThemeToggle'
import { useSearch } from '@/contexts/SearchContext'
import { AuthButton } from '@/components/auth/AuthButton'

type NavPanelProps = {
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function NavPanel({ collapsed, onToggleCollapse }: NavPanelProps) {
  const { activeSlug, treeData } = useAppShell()
  const { open: openSearch } = useSearch()

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
          <span className="ml-2 flex-1 text-[14px] font-medium text-[var(--foreground)]">
            OpenPropFirm
          </span>
        )}
        <AuthButton collapsed={collapsed} />
      </div>

      {/* Search trigger */}
      {!collapsed && (
        <div className="mx-2 mt-2 mb-1 shrink-0">
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 text-[13px] text-[var(--muted-foreground)]"
            onClick={openSearch}
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px]">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* File tree */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          <NavFileTree treeData={treeData} activeSlug={activeSlug} />
        </div>
      )}

      {/* Legal links */}
      {!collapsed && (
        <div className="flex shrink-0 items-center gap-3 border-t border-[var(--border)] px-3 py-1.5">
          <Link
            href="/legal/terms-of-service"
            className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Terms
          </Link>
          <Link
            href="/legal/disclaimer"
            className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Disclaimer
          </Link>
        </div>
      )}

      {/* Bottom bar */}
      {!collapsed && (
        <div className="flex h-10 shrink-0 items-center justify-between border-t border-[var(--border)] px-3">
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md hover:bg-[var(--muted)] opacity-40 cursor-not-allowed"
            onClick={() => {}}
            aria-label="Settings"
            aria-disabled="true"
          >
            <Settings size={16} />
          </button>
          <ThemeToggle />
        </div>
      )}
    </div>
  )
}
