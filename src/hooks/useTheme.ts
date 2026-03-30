'use client'

import { useState, useEffect } from 'react'
import type { ThemeVariant } from '@/lib/graph-colors'

export function useTheme(): ThemeVariant {
  const [theme, setTheme] = useState<ThemeVariant>(() => {
    if (typeof document === 'undefined') return 'dark'
    return (document.documentElement.dataset.theme as ThemeVariant | undefined) ?? 'dark'
  })

  useEffect(() => {
    const read = () =>
      setTheme(
        (document.documentElement.dataset.theme as ThemeVariant | undefined) ?? 'dark',
      )
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return theme
}
