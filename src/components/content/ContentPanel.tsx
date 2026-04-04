'use client'

import { BREAKPOINTS } from '@/lib/constants'
import { useAppShell } from '@/contexts/AppShellContext'
import TabBar from '@/components/content/TabBar'
import { BreadcrumbBar } from '@/components/content/BreadcrumbBar'
import ContentFooter from '@/components/content/ContentFooter'

export default function ContentPanel({ children }: { children: React.ReactNode }) {
  const {
    activeSlug,
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
      <BreadcrumbBar activeSlug={activeSlug} />
      <div className="flex-1 overflow-y-auto">
        {children}
        <ContentFooter />
      </div>
    </div>
  )
}
