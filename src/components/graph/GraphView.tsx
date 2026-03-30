'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import type { GraphNode, GraphEdge } from '@/types/content'
import { getNodeColor } from '@/lib/graph-colors'
import { useTheme } from '@/hooks/useTheme'
import GraphControls from './GraphControls'
import GraphLegend from './GraphLegend'
import { useAppShell } from '@/contexts/AppShellContext'

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
    border: styles.getPropertyValue('--border').trim() || '#e5e7eb',
    bg: styles.getPropertyValue('--sidebar-bg').trim() || '#1a1a1a',
  }
}

export default function GraphView({
  nodes,
  edges,
  activeSlug,
  onNodeClick,
}: GraphViewProps) {
  const { openInPanel3 } = useAppShell()
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined)
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 })
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const theme = useTheme()

  // Resolve CSS vars once on mount, then on theme changes via MutationObserver
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

  const handleToggleType = useCallback((type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const handleZoomIn = useCallback(() => {
    const next = Math.min(zoomLevel * 1.5, 8)
    setZoomLevel(next)
    graphRef.current?.zoom(next, 300)
  }, [zoomLevel])

  const handleZoomOut = useCallback(() => {
    const next = Math.max(zoomLevel / 1.5, 0.1)
    setZoomLevel(next)
    graphRef.current?.zoom(next, 300)
  }, [zoomLevel])

  // Memoize filtered graph data — prevents ForceGraph2D from restarting the
  // force simulation on every render. Only recomputes when nodes, edges, or
  // filter state changes. Node references are passed as-is (not spread) so
  // ForceGraph2D can mutate x/y/vx/vy simulation state stably.
  const graphData = useMemo(() => {
    const filteredNodes = nodes.filter((n) => !hiddenTypes.has(n.type))
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id))
    const filteredLinks = edges
      .filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target))
      .map((e) => ({ source: e.source, target: e.target }))
    return { nodes: filteredNodes, links: filteredLinks }
  }, [nodes, edges, hiddenTypes])

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={colors.bg}
        nodeLabel={(node) => (node as GraphNode).label}
        nodeColor={(node) => {
          const n = node as GraphNode
          if (n.id === activeSlug) return colors.accent
          return getNodeColor(n.type, theme)
        }}
        nodeVal={(node) => Math.min(Math.max(1, (node as GraphNode).linkCount ?? 1), 10)}
        nodeRelSize={5}
        linkColor={() => colors.border}
        onZoom={({ k }) => setZoomLevel(k)}
        onNodeClick={(node, event) => {
          const slug = (node as GraphNode).id
          if (event.metaKey || event.ctrlKey) {
            openInPanel3(slug)
          } else {
            onNodeClick(slug)
          }
        }}
      />
      <GraphLegend />
      <GraphControls
        graphRef={graphRef}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        hiddenTypes={hiddenTypes}
        onToggleType={handleToggleType}
      />
    </div>
  )
}
