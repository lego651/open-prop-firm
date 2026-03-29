'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useViewport } from '@/hooks/useViewport'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { useTabManager } from '@/hooks/useTabManager'
import type { TreeNode } from '@/types/content'
import { LAYOUT, BREAKPOINTS } from '@/lib/constants'
import ResizeHandle from '@/components/layout/ResizeHandle'
import ContentPanel from '@/components/content/ContentPanel'
import NavPanel from '@/components/nav/NavPanel'
import GraphPanel from '@/components/graph/GraphPanel'
import SearchModal from '@/components/search/SearchModal'

type AppShellProps = {
  treeData: TreeNode[]
  children: React.ReactNode
}

export default function AppShell({ treeData, children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  const viewportWidth = useViewport()
  const user = useSupabaseUser()
  const { openTabs, activeSlug, closeTab } = useTabManager(treeData, pathname)

  const [panel1Collapsed, setPanel1Collapsed] = useLocalStorage(
    'panel1Collapsed',
    false,
  )
  const [panel3Width, setPanel3Width] = useLocalStorage<number>(
    'panel3Width',
    LAYOUT.PANEL3_DEFAULT_WIDTH,
  )
  const [panel3Mode, setPanel3Mode] = useLocalStorage<'graph' | 'compare'>(
    'panel3Mode',
    'graph',
  )

  const [panel3Visible, setPanel3Visible] = useState(false)
  const [panel1OverlayOpen, setPanel1OverlayOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const panel3IsOverlay =
    panel3Visible && viewportWidth < BREAKPOINTS.PANEL3_OVERLAY

  // Stable reference for GraphPanel — prevents stale closure in its auth effect
  const handleModeToggle = useCallback(() => {
    setPanel3Mode((m) => (m === 'graph' ? 'compare' : 'graph'))
  }, [setPanel3Mode])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Panel 1 — hidden at < 768px, visible at >= 768px */}
      {viewportWidth >= BREAKPOINTS.MOBILE ? (
        <div
          style={{
            width: panel1Collapsed
              ? LAYOUT.PANEL1_COLLAPSED
              : LAYOUT.PANEL1_WIDTH,
            transition: 'width 200ms ease',
          }}
          className="shrink-0 overflow-hidden border-r border-[var(--border)] bg-[var(--sidebar-bg)]"
        >
          <NavPanel
            treeData={treeData}
            activeSlug={activeSlug}
            collapsed={panel1Collapsed}
            onToggleCollapse={() => setPanel1Collapsed((v) => !v)}
          />
        </div>
      ) : null}

      {/* Panel 1 overlay — mobile (< 768px), opened via hamburger */}
      {panel1OverlayOpen && viewportWidth < BREAKPOINTS.MOBILE && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setPanel1OverlayOpen(false)}
          />
          <div
            style={{ width: LAYOUT.PANEL1_WIDTH }}
            className="fixed top-0 left-0 z-50 h-full overflow-hidden border-r border-[var(--border)] bg-[var(--sidebar-bg)]"
          >
            <NavPanel
              treeData={treeData}
              activeSlug={activeSlug}
              collapsed={false}
              onToggleCollapse={() => setPanel1OverlayOpen(false)}
            />
          </div>
        </>
      )}

      {/* Panel 2 */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:min-w-[400px]">
        <ContentPanel
          openTabs={openTabs}
          activeSlug={activeSlug}
          onTabClick={(slug) => router.push('/' + slug)}
          onTabClose={closeTab}
          onTogglePanel3={() => setPanel3Visible((v) => !v)}
          onHamburger={
            viewportWidth < BREAKPOINTS.MOBILE
              ? () => setPanel1OverlayOpen(true)
              : undefined
          }
          onSearchOpen={() => setIsSearchOpen(true)}
        >
          {children}
        </ContentPanel>
      </div>

      {/* ResizeHandle — only when Panel 3 is a flex sibling (not overlay) */}
      {panel3Visible && !panel3IsOverlay && (
        <ResizeHandle onResize={setPanel3Width} />
      )}

      {/* Panel 3 backdrop — overlay mode only */}
      {panel3Visible && panel3IsOverlay && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setPanel3Visible(false)}
        />
      )}

      {/* Panel 3 */}
      {panel3Visible && (
        <div
          style={{ width: panel3Width }}
          className={
            panel3IsOverlay
              ? 'fixed top-0 right-0 z-50 flex h-full flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--sidebar-bg)]'
              : 'flex shrink-0 flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--sidebar-bg)]'
          }
        >
          <GraphPanel
            mode={panel3Mode}
            user={user}
            activeSlug={activeSlug}
            treeData={treeData}
            onModeToggle={handleModeToggle}
            onDismissGate={() => setPanel3Mode('graph')}
            onNodeClick={(slug) => router.push('/' + slug)}
          />
        </div>
      )}

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  )
}

export type { AppShellProps }
