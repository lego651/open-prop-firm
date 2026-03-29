'use client'

import type { User } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import { Network, Columns2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import CompareAuthGate from '@/components/auth/CompareAuthGate'

type GraphPanelProps = {
  mode: 'graph' | 'compare'
  user: User | null
  onModeToggle: () => void
  onDismissGate: () => void
}

export default function GraphPanel({
  mode,
  user,
  onModeToggle,
  onDismissGate,
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
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
            Compare panel — coming in Sprint 5
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
            Graph view — coming in Sprint 5
          </div>
        )}
      </div>
    </div>
  )
}
