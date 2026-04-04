'use client'

import { BREAKPOINTS } from '@/lib/constants'
import { useAppShell } from '@/contexts/AppShellContext'
import TabBar from '@/components/content/TabBar'
import { PaneHeader } from '@/components/content/PaneHeader'
import ContentFooter from '@/components/content/ContentFooter'

export default function ContentPanel({ children }: { children: React.ReactNode }) {
  const {
    openTabs,
    activeSlug,
    navigateTo,
    closeTab,
    panel3Visible,
    setPanel3Visible,
    viewportWidth,
    setPanel1OverlayOpen,
  } = useAppShell()

  return (
    <div className="flex h-full flex-col">
      <TabBar
        openTabs={openTabs}
        activeSlug={activeSlug}
        onTabClick={navigateTo}
        onTabClose={closeTab}
        onTogglePanel3={() => setPanel3Visible(!panel3Visible)}
        onHamburger={
          viewportWidth < BREAKPOINTS.MOBILE
            ? () => setPanel1OverlayOpen(true)
            : undefined
        }
      />
      <PaneHeader paneId="pane-default" activeSlug={activeSlug} />
      <div className="flex-1 overflow-y-auto">
        {children}
        <ContentFooter />
      </div>
    </div>
  )
}
