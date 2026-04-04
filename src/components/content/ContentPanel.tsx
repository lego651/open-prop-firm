'use client'

import { BREAKPOINTS } from '@/lib/constants'
import { useAppShell } from '@/contexts/AppShellContext'
import TabBar from '@/components/content/TabBar'
import SplitPaneLayout from '@/components/content/SplitPaneLayout'
import ContentFooter from '@/components/content/ContentFooter'

export default function ContentPanel({ children }: { children: React.ReactNode }) {
  const {
    openPane,
    panel3Visible,
    setPanel3Visible,
    viewportWidth,
    setPanel1OverlayOpen,
  } = useAppShell()

  return (
    <div className="flex h-full flex-col">
      <TabBar
        onNewPane={() => openPane(null)}
        onTogglePanel3={() => setPanel3Visible(!panel3Visible)}
        onHamburger={
          viewportWidth < BREAKPOINTS.MOBILE
            ? () => setPanel1OverlayOpen(true)
            : undefined
        }
      />
      <SplitPaneLayout>
        {children}
        <ContentFooter />
      </SplitPaneLayout>
    </div>
  )
}
