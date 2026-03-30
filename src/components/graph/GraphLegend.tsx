'use client'

import { FILE_TYPE_COLORS } from '@/lib/graph-colors'
import { useTheme } from '@/hooks/useTheme'

export default function GraphLegend() {
  const theme = useTheme()

  return (
    <div className="absolute bottom-3 left-3 rounded-md border border-[var(--border)] bg-[var(--sidebar-bg)]/80 px-2.5 py-1.5">
      {Object.entries(FILE_TYPE_COLORS).map(([type, colors]) => (
        <div key={type} className="flex items-center gap-1.5 py-0.5">
          <span
            className="inline-block size-2 shrink-0 rounded-full"
            style={{ backgroundColor: colors[theme] }}
          />
          <span className="text-[10px] text-[var(--muted-foreground)]">
            {type}
          </span>
        </div>
      ))}
    </div>
  )
}
