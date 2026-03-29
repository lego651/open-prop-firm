'use client'

import { useState, useEffect } from 'react'
import { BREAKPOINTS } from '@/lib/constants'

/**
 * Returns the current viewport width. SSR-safe: initializes with a constant
 * (matching server render), then reads the real width on mount. Throttles
 * resize events with requestAnimationFrame.
 */
export function useViewport(): number {
  const [width, setWidth] = useState<number>(BREAKPOINTS.PANEL3_OVERLAY)

  useEffect(() => {
    // Hydration read — correcting viewport width from browser on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWidth(window.innerWidth) // correct on mount

    let raf = 0
    const handler = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setWidth(window.innerWidth))
    }
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('resize', handler)
      cancelAnimationFrame(raf)
    }
  }, [])

  return width
}
