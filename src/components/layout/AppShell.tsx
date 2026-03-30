'use client'

import { useRef } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { AppShellProvider, useAppShell } from '@/contexts/AppShellContext'
import { LAYOUT, BREAKPOINTS } from '@/lib/constants'
import ResizeHandle from '@/components/layout/ResizeHandle'
import ContentPanel from '@/components/content/ContentPanel'
import NavPanel from '@/components/nav/NavPanel'
import GraphPanel from '@/components/graph/GraphPanel'
import type { TreeNode } from '@/types/content'

type AppShellProps = {
  treeData: TreeNode[]
  children: React.ReactNode
}

function AppShellLayout({ treeData, children }: AppShellProps) {
  const { panel3Visible, setPanel3Visible, viewportWidth, panel1OverlayOpen, setPanel1OverlayOpen } = useAppShell()
  const [panel1Collapsed, setPanel1Collapsed] = useLocalStorage('panel1Collapsed', false)
  const [panel3Width, setPanel3Width] = useLocalStorage<number>('panel3Width', LAYOUT.PANEL3_DEFAULT_WIDTH)
  const panel3Ref = useRef<HTMLDivElement>(null)
  const panel3IsOverlay = panel3Visible && viewportWidth < BREAKPOINTS.PANEL3_OVERLAY

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Panel 1 — desktop */}
      {viewportWidth >= BREAKPOINTS.MOBILE ? (
        <div
          style={{ width: panel1Collapsed ? LAYOUT.PANEL1_COLLAPSED : LAYOUT.PANEL1_WIDTH, transition: 'width 200ms ease' }}
          className="shrink-0 overflow-hidden border-r border-[var(--border)] bg-[var(--sidebar-bg)]"
        >
          <NavPanel treeData={treeData} collapsed={panel1Collapsed} onToggleCollapse={() => setPanel1Collapsed((v) => !v)} />
        </div>
      ) : null}

      {/* Panel 1 overlay — mobile */}
      {panel1OverlayOpen && viewportWidth < BREAKPOINTS.MOBILE && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setPanel1OverlayOpen(false)} />
          <div style={{ width: LAYOUT.PANEL1_WIDTH }} className="fixed top-0 left-0 z-50 h-full overflow-hidden border-r border-[var(--border)] bg-[var(--sidebar-bg)]">
            <NavPanel treeData={treeData} collapsed={false} onToggleCollapse={() => setPanel1OverlayOpen(false)} />
          </div>
        </>
      )}

      {/* Panel 2 */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:min-w-[400px]">
        <ContentPanel>{children}</ContentPanel>
      </div>

      {/* ResizeHandle — flex sibling only */}
      {panel3Visible && !panel3IsOverlay && (
        <ResizeHandle panel3Ref={panel3Ref} onResize={setPanel3Width} />
      )}

      {/* Panel 3 backdrop — overlay mode */}
      {panel3Visible && panel3IsOverlay && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setPanel3Visible(false)} />
      )}

      {/* Panel 3 */}
      {panel3Visible && (
        <div
          ref={panel3Ref}
          style={{ width: panel3Width }}
          className={panel3IsOverlay
            ? 'fixed top-0 right-0 z-50 flex h-full flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--sidebar-bg)]'
            : 'flex shrink-0 flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--sidebar-bg)]'}
        >
          <GraphPanel />
        </div>
      )}
    </div>
  )
}

export default function AppShell({ treeData, children }: AppShellProps) {
  return (
    <AppShellProvider treeData={treeData}>
      <AppShellLayout treeData={treeData}>{children}</AppShellLayout>
    </AppShellProvider>
  )
}

export type { AppShellProps }
