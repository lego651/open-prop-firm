'use client'

import { useRef, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphNode, GraphEdge } from '@/types/content'

type GraphViewProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  activeSlug: string
  onNodeClick: (slug: string) => void
}

function resolveColors() {
  const styles = getComputedStyle(document.documentElement)
  return {
    accent: styles.getPropertyValue('--accent').trim() || '#3b82f6',
    muted: styles.getPropertyValue('--muted-foreground').trim() || '#6b7280',
    border: styles.getPropertyValue('--border').trim() || '#e5e7eb',
    bg: styles.getPropertyValue('--sidebar-bg').trim() || '#1a1a1a',
  }
}

export default function GraphView({ nodes, edges, activeSlug, onNodeClick }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 })

  // Resolve CSS vars once on mount, then on theme changes via MutationObserver
  // Fixes re-render storm (was called on every render) and adds live theme reactivity
  const [colors, setColors] = useState(resolveColors)

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(resolveColors()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

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
    setDimensions({ width: el.clientWidth, height: el.clientHeight })
    return () => observer.disconnect()
  }, [])

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
        backgroundColor={colors.bg}
        nodeLabel={(node) => (node as GraphNode).label}
        nodeColor={(node) =>
          (node as GraphNode).id === activeSlug ? colors.accent : colors.muted
        }
        nodeRelSize={5}
        linkColor={() => colors.border}
        onNodeClick={(node) => onNodeClick((node as GraphNode).id)}
      />
    </div>
  )
}
