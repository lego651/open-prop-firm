'use client'

import type { User } from '@supabase/supabase-js'
import { useState, useEffect, Suspense } from 'react'
import { Network, Columns2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import CompareAuthGate from '@/components/auth/CompareAuthGate'
import GraphViewLoader from '@/components/graph/GraphViewLoader'
import ContentPanelRight from '@/components/content/ContentPanelRight'
import type { TreeNode } from '@/types/content'

type GraphPanelProps = {
  mode: 'graph' | 'compare'
  user: User | null
  activeSlug: string
  treeData: TreeNode[]
  onModeToggle: () => void
  onDismissGate: () => void
  onNodeClick: (slug: string) => void
}

export default function GraphPanel({
  mode,
  user,
  activeSlug,
  treeData,
  onModeToggle,
  onDismissGate,
  onNodeClick,
}: GraphPanelProps) {
  const [pendingCompare, setPendingCompare] = useState(false)

  const handleModeToggleClick = () => {
    if (mode === 'compare') {
      onModeToggle()
    } else {
      if (user) {
        onModeToggle()
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
      onModeToggle()
    }
  }, [user, pendingCompare, onModeToggle])

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border)] px-3">
        <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
          {mode === 'graph' ? 'Graph' : 'Compare'}
        </span>
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={handleModeToggleClick}
            className="flex size-7 items-center justify-center rounded-md hover:bg-[var(--muted)]"
          >
            {mode === 'graph' ? <Columns2 size={16} /> : <Network size={16} />}
          </TooltipTrigger>
          <TooltipContent>
            {mode === 'graph'
              ? 'Switch to compare mode'
              : 'Switch to graph view'}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-hidden">
        {pendingCompare || (mode === 'compare' && !user) ? (
          <CompareAuthGate
            onDismiss={() => {
              setPendingCompare(false)
              onDismissGate()
            }}
          />
        ) : mode === 'compare' ? (
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <ContentPanelRight treeData={treeData} />
          </Suspense>
        ) : (
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <GraphViewLoader activeSlug={activeSlug} onNodeClick={onNodeClick} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
