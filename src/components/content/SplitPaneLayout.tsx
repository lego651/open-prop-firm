'use client'

import { useCallback } from 'react'
import { useAppShell } from '@/contexts/AppShellContext'
import { PaneHeader } from '@/components/content/PaneHeader'
import PaneTitleStrip from '@/components/content/PaneTitleStrip'
import EmptyPaneState from '@/components/content/EmptyPaneState'
import { BREAKPOINTS } from '@/lib/constants'
import type { PaneEntry } from '@/types/content'

type SplitPaneLayoutProps = {
  children: React.ReactNode
}

/**
 * SplitPaneLayout renders multiple content panes side-by-side following
 * the Obsidian collapse model:
 *
 * - 1 pane  → full width, always expanded
 * - 2 panes → both side-by-side, fully expanded
 * - 3 panes → leftmost collapses to a narrow title strip; 2 rightmost expand
 * - 4+ panes → all except 2 rightmost collapse to title strips
 *
 * Clicking a collapsed strip brings that pane into the expanded set by
 * swapping it with the leftmost currently-expanded pane.
 *
 * On mobile (< BREAKPOINTS.MOBILE) only the active pane content is shown;
 * collapsed strips are hidden entirely.
 */
export default function SplitPaneLayout({ children }: SplitPaneLayoutProps) {
  const { panes, activePaneId, setActivePane, viewportWidth } = useAppShell()

  // Determine which panes are collapsed.
  // The 2 rightmost panes are always expanded; all others are collapsed.
  const expandedCount = Math.min(2, panes.length)
  const firstExpandedIndex = panes.length - expandedCount

  const handleCollapsedClick = useCallback(
    (clickedPane: PaneEntry) => {
      // Swap the clicked collapsed pane into the leftmost expanded slot.
      // We do this by making it active — the consumer (page) is responsible
      // for navigating to its slug. For the layout, mark it as the active pane.
      setActivePane(clickedPane.id)
    },
    [setActivePane],
  )

  const isMobile = viewportWidth < BREAKPOINTS.MOBILE

  // On mobile: render only the active pane, full-width.
  if (isMobile) {
    const activePane = panes.find((p) => p.id === activePaneId) ?? panes[panes.length - 1]
    return (
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <PaneHeader paneId={activePane.id} activeSlug={activePane.slug ?? ''} />
        <div className="flex-1 overflow-y-auto">
          {activePane.slug === null ? (
            <EmptyPaneState paneId={activePane.id} />
          ) : (
            children
          )}
        </div>
      </div>
    )
  }

  // Desktop: render collapsed strips + expanded panes.
  return (
    <div className="flex h-full w-full overflow-hidden">
      {panes.map((pane, index) => {
        const isCollapsed = index < firstExpandedIndex

        if (isCollapsed) {
          return (
            <PaneTitleStrip
              key={pane.id}
              title={pane.slug === null ? 'New tab' : pane.title}
              isActive={pane.id === activePaneId}
              onClick={() => handleCollapsedClick(pane)}
            />
          )
        }

        // Expanded pane — only the rightmost expanded pane renders children.
        // Additional expanded panes (the second-to-last) show a placeholder.
        const isRightmost = index === panes.length - 1

        return (
          <div
            key={pane.id}
            className="flex min-w-0 flex-1 flex-col border-r border-[var(--border)] last:border-r-0"
          >
            <PaneHeader paneId={pane.id} activeSlug={pane.slug ?? ''} />
            <div className="flex-1 overflow-y-auto">
              {pane.slug === null ? (
                <EmptyPaneState paneId={pane.id} />
              ) : isRightmost ? (
                children
              ) : (
                // Second expanded pane — shows placeholder until per-pane
                // content loading is wired up.
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {pane.title}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
