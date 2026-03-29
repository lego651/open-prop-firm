'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * SSR-safe localStorage hook. Initializes with `defaultValue` (matching server
 * render), then reads from localStorage on mount and persists on every change.
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)
  const initialLoad = useRef(true)

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false
      try {
        const raw = localStorage.getItem(key)
        if (raw !== null) {
          // Hydration read — restoring persisted state from external storage.
          // setState in effect is intentional here (SSR-safe localStorage sync).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setValue(JSON.parse(raw) as T)
          return // stored value loaded — skip the write below
        }
      } catch {}
    }
    // Write to localStorage on subsequent changes (or on first load when no stored value)
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key, value])

  return [value, setValue] as const
}
