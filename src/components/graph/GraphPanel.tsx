'use client'

import type { User } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import { Network, Columns2 } from 'lucide-react'
import CompareAuthGate from '@/components/auth/CompareAuthGate'

type GraphPanelProps = {
  mode: 'graph' | 'compare'
  user: User | null
  onModeToggle: () => void
  onDismissGate: () => void
}

export default function GraphPanel({ mode, user, onModeToggle, onDismissGate }: GraphPanelProps) {
  const [pendingCompare, setPendingCompare] = useState(false)

  const handleModeToggleClick = () => {
    if (mode === 'compare') {
      onModeToggle() // back to graph — always allowed
    } else {
      if (user) {
        onModeToggle() // authenticated — switch immediately
      } else {
        setPendingCompare(true) // show gate, don't switch mode
      }
    }
  }

  useEffect(() => {
    if (user && pendingCompare) {
      setPendingCompare(false)
      onModeToggle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-10 border-b border-[var(--border)] shrink-0">
        <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
          {mode === 'graph' ? 'Graph' : 'Compare'}
        </span>
        <button
          onClick={handleModeToggleClick}
          className="size-7 flex items-center justify-center rounded-md hover:bg-[var(--muted)]"
          title={mode === 'graph' ? 'Switch to compare mode' : 'Switch to graph view'}
        >
          {mode === 'graph' ? <Columns2 size={16} /> : <Network size={16} />}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {(pendingCompare || (mode === 'compare' && !user)) ? (
          <CompareAuthGate onDismiss={() => { setPendingCompare(false); onDismissGate() }} />
        ) : mode === 'compare' ? (
          <div className="flex items-center justify-center h-full text-sm text-[var(--muted-foreground)]">Compare panel — coming in Sprint 5</div>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-[var(--muted-foreground)]">Graph view — coming in Sprint 5</div>
        )}
      </div>
    </div>
  )
}
