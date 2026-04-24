'use client'

import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import type { ChecklistItem } from '../../../scripts/monitor/schema'
import {
  loadChecklistState,
  saveChecklistState,
  clearChecklistState,
  toggleItem,
  isAnyChecked,
  type ChecklistState,
  type StorageLike,
} from './checklist-storage'

interface PreTradeChecklistProps {
  items: ChecklistItem[]
  firmSlug: string
}

function getStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * ACTION layer — green-tinted. Interactive checklist persisted per-firm
 * in localStorage. Falls back to in-memory state if storage is unavailable.
 * User-initiated reset only; no auto-reset on date/session/reload.
 */
export function PreTradeChecklist({ items, firmSlug }: PreTradeChecklistProps) {
  const [state, setState] = useState<ChecklistState>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(false)
    setState(loadChecklistState(firmSlug, getStorage()))
    setHydrated(true)
  }, [firmSlug])

  useEffect(() => {
    if (!hydrated) return
    saveChecklistState(firmSlug, state, getStorage())
  }, [hydrated, firmSlug, state])

  const handleToggle = (id: string) => {
    setState((prev) => toggleItem(prev, id))
  }

  const handleReset = () => {
    setState({})
    clearChecklistState(firmSlug, getStorage())
  }

  return (
    <section
      aria-label="Pre-trade checklist"
      className="rounded-lg mt-4 p-4 bg-[var(--action-tint-bg)] border border-[var(--action-tint-border)]"
    >
      <h3 className="text-lg font-semibold mb-3">Pre-trade checklist</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <Checkbox
              id={`${firmSlug}:${item.id}`}
              checked={!!state[item.id]}
              onCheckedChange={() => handleToggle(item.id)}
            />
            <label
              htmlFor={`${firmSlug}:${item.id}`}
              className="cursor-pointer text-sm select-none"
            >
              {item.label}
            </label>
          </li>
        ))}
      </ul>
      {isAnyChecked(state) && (
        <button
          type="button"
          onClick={handleReset}
          className="mt-3 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-2"
        >
          Reset for today
        </button>
      )}
    </section>
  )
}
