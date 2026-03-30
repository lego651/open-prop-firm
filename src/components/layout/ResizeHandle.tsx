'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { LAYOUT } from '@/lib/constants'

type ResizeHandleProps = {
  panel3Ref: React.RefObject<HTMLDivElement | null>
  onResize: (newWidth: number) => void
}

export default function ResizeHandle({ panel3Ref, onResize }: ResizeHandleProps) {
  // Track the current drag width so pointerUp can commit the final value
  const dragWidth = useRef(0)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragWidth.current = panel3Ref.current?.offsetWidth ?? 0
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const newWidth = window.innerWidth - e.clientX
    const clamped = Math.min(
      LAYOUT.PANEL3_MAX_WIDTH,
      Math.max(LAYOUT.PANEL3_MIN_WIDTH, newWidth),
    )
    dragWidth.current = clamped
    // Mutate DOM directly — no React re-render during drag
    if (panel3Ref.current) {
      panel3Ref.current.style.width = clamped + 'px'
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    // Single state update on release — writes to localStorage via useLocalStorage
    onResize(dragWidth.current)
  }

  return (
    <div
      className={cn(
        'w-1 shrink-0 cursor-col-resize transition-colors duration-200',
        'bg-transparent hover:bg-[var(--accent)]/40',
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  )
}
