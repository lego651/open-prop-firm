'use client'

import { useRef, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

type GraphNode = {
  id: string
  label: string
  type: string
  firm: string
  category: string
}

type GraphEdge = {
  source: string
  target: string
}

type GraphViewProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  activeSlug: string
  onNodeClick: (slug: string) => void
}

export default function GraphView({ nodes, edges, activeSlug, onNodeClick }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({ width, height })
      }
    })
    observer.observe(el)
    // Set initial size
    setDimensions({ width: el.clientWidth, height: el.clientHeight })
    return () => observer.disconnect()
  }, [])

  // Resolve CSS variables at render time so theme changes are reflected
  const styles = typeof document !== 'undefined'
    ? getComputedStyle(document.documentElement)
    : null
  const accentColor = styles?.getPropertyValue('--accent').trim() || '#3b82f6'
  const mutedColor = styles?.getPropertyValue('--muted-foreground').trim() || '#6b7280'
  const borderColor = styles?.getPropertyValue('--border').trim() || '#e5e7eb'
  const bgColor = styles?.getPropertyValue('--sidebar-bg').trim() || '#1a1a1a'

  // ForceGraph2D uses 'links' not 'edges'
  const graphData = {
    nodes: nodes.map((n) => ({ ...n })),
    links: edges.map((e) => ({ source: e.source, target: e.target })),
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <ForceGraph2D
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={bgColor}
        nodeLabel={(node) => (node as GraphNode).label}
        nodeColor={(node) =>
          (node as GraphNode).id === activeSlug ? accentColor : mutedColor
        }
        nodeRelSize={5}
        linkColor={() => borderColor}
        onNodeClick={(node) => onNodeClick((node as GraphNode).id)}
      />
    </div>
  )
}
