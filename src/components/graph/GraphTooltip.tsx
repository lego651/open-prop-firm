'use client'

import type { GraphNode } from '@/types/content'
import { FILE_TYPE_COLORS } from '@/lib/graph-colors'
import { useTheme } from '@/hooks/useTheme'

type GraphTooltipProps = {
  node: GraphNode
  /** Position relative to the containing element (already clamped by parent) */
  x: number
  y: number
}

export default function GraphTooltip({ node, x, y }: GraphTooltipProps) {
  const theme = useTheme()
  const typeColors = FILE_TYPE_COLORS[node.type as keyof typeof FILE_TYPE_COLORS]
  const dotColor = typeColors
    ? theme === 'light' ? typeColors.light : theme === 'blue' ? typeColors.blue : typeColors.dark
    : '#6b7280'

  return (
    <div
      style={{ left: x, top: y }}
      className="pointer-events-none absolute z-50 rounded-md border border-[var(--border)] bg-[var(--sidebar-bg)] px-3 py-2 shadow-md"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="max-w-[140px] truncate text-[12px] font-medium text-[var(--foreground)]">
          {node.label}
        </span>
      </div>
      <div className="mt-0.5 pl-4 text-[11px] text-[var(--muted-foreground)]">
        {node.linkCount ?? 0} inbound links · {node.type}
      </div>
    </div>
  )
}
