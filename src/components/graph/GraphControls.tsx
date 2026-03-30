'use client'

import { useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2, SlidersHorizontal } from 'lucide-react'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import { FILE_TYPE_COLORS } from '@/lib/graph-colors'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type GraphControlsProps = {
  graphRef: React.RefObject<ForceGraphMethods | undefined>
  hiddenTypes: Set<string>
  onToggleType: (type: string) => void
}

const BUTTON_CLASS =
  'flex size-7 items-center justify-center rounded border border-[var(--border)] bg-[var(--sidebar-bg)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer'

export default function GraphControls({
  graphRef,
  hiddenTypes,
  onToggleType,
}: GraphControlsProps) {
  const [zoomLevel, setZoomLevel] = useState(1.0)

  function handleZoomIn() {
    const next = Math.min(zoomLevel * 1.5, 8)
    setZoomLevel(next)
    graphRef.current?.zoom(next, 300)
  }

  function handleZoomOut() {
    const next = Math.max(zoomLevel / 1.5, 0.1)
    setZoomLevel(next)
    graphRef.current?.zoom(next, 300)
  }

  function handleFit() {
    graphRef.current?.zoomToFit(400, 40)
  }

  const allHidden = hiddenTypes.size === Object.keys(FILE_TYPE_COLORS).length

  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-1">
      <button
        type="button"
        aria-label="Zoom in"
        className={BUTTON_CLASS}
        onClick={handleZoomIn}
      >
        <ZoomIn size={14} />
      </button>

      <button
        type="button"
        aria-label="Zoom out"
        className={BUTTON_CLASS}
        onClick={handleZoomOut}
      >
        <ZoomOut size={14} />
      </button>

      <button
        type="button"
        aria-label="Fit graph to view"
        className={BUTTON_CLASS}
        onClick={handleFit}
      >
        <Maximize2 size={14} />
      </button>

      <Popover>
        <PopoverTrigger
          aria-label="Filter node types"
          className={BUTTON_CLASS}
        >
          <SlidersHorizontal size={14} />
        </PopoverTrigger>
        <PopoverContent side="left" sideOffset={8} className="w-44 p-3">
          <p className="mb-2 text-[11px] text-[var(--muted-foreground)]">
            Filter by type
          </p>
          {allHidden && (
            <p className="text-[11px] italic text-[var(--muted-foreground)]">
              All nodes hidden
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {Object.keys(FILE_TYPE_COLORS).map((type) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-2 text-[12px]"
              >
                <Checkbox
                  checked={!hiddenTypes.has(type)}
                  onCheckedChange={() => onToggleType(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
