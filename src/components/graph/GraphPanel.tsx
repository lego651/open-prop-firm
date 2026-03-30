'use client'

import { useState, useEffect, Suspense } from 'react'
import { Network, Columns2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppShell } from '@/contexts/AppShellContext'
import CompareAuthGate from '@/components/auth/CompareAuthGate'
import GraphViewLoader from '@/components/graph/GraphViewLoader'
import ContentPanelRight from '@/components/content/ContentPanelRight'

export default function GraphPanel() {
  const {
    panel3Mode,
    setPanel3Mode,
    setPanel3Visible,
    user,
    activeSlug,
    navigateTo,
    compareSlug,
  } = useAppShell()

  const [pendingCompare, setPendingCompare] = useState(false)

  const handleModeToggleClick = () => {
    if (panel3Mode === 'compare') {
      setPanel3Mode('graph')
    } else {
      if (user) {
        setPanel3Mode('compare')
      } else {
        setPendingCompare(true)
      }
    }
  }

  useEffect(() => {
    if (user && pendingCompare) {
      // Responding to auth state change from external system — setState in effect is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingCompare(false)
      setPanel3Mode('compare')
    }
  }, [user, pendingCompare, setPanel3Mode])

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border)] px-3">
        <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
          {panel3Mode === 'graph' ? 'Graph' : 'Compare'}
        </span>
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={handleModeToggleClick}
            className="flex size-7 items-center justify-center rounded-md hover:bg-[var(--muted)]"
          >
            {panel3Mode === 'graph' ? <Columns2 size={16} /> : <Network size={16} />}
          </TooltipTrigger>
          <TooltipContent>
            {panel3Mode === 'graph'
              ? 'Switch to compare mode'
              : 'Switch to graph view'}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-hidden">
        {pendingCompare || (panel3Mode === 'compare' && !user) ? (
          <CompareAuthGate
            onDismiss={() => {
              setPendingCompare(false)
              setPanel3Mode('graph')
              setPanel3Visible(false)
            }}
          />
        ) : panel3Mode === 'compare' ? (
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <ContentPanelRight externalSlug={compareSlug} />
          </Suspense>
        ) : (
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <GraphViewLoader activeSlug={activeSlug} onNodeClick={navigateTo} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
