'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { LAYOUT } from '@/lib/constants'

type ResizeHandleProps = {
  onResize: (newWidth: number) => void
}

export default function ResizeHandle({ onResize }: ResizeHandleProps) {
  const raf = useRef(0)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const newWidth = window.innerWidth - e.clientX
    const clamped = Math.min(
      LAYOUT.PANEL3_MAX_WIDTH,
      Math.max(LAYOUT.PANEL3_MIN_WIDTH, newWidth),
    )
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => onResize(clamped))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
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
