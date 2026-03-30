'use client'

import { useRef, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import type { GraphNode, GraphEdge } from '@/types/content'
import { getNodeColor } from '@/lib/graph-colors'
import type { ThemeVariant } from '@/lib/graph-colors'
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
    muted: styles.getPropertyValue('--muted-foreground').trim() || '#6b7280',
    border: styles.getPropertyValue('--border').trim() || '#e5e7eb',
    bg: styles.getPropertyValue('--sidebar-bg').trim() || '#1a1a1a',
    theme:
      (document.documentElement.dataset.theme as ThemeVariant | undefined) ??
      'dark',
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

  function handleToggleType(type: string) {
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  // Filter nodes by hidden types, then filter edges to only visible node pairs
  const filteredNodes = nodes
    .filter((n) => !hiddenTypes.has(n.type))
    .map((n) => ({ ...n }))
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id))
  const filteredLinks = edges
    .filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
    )
    .map((e) => ({ source: e.source, target: e.target }))

  const graphData = { nodes: filteredNodes, links: filteredLinks }

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
          return getNodeColor(n.type, colors.theme)
        }}
        nodeRelSize={5}
        linkColor={() => colors.border}
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
        hiddenTypes={hiddenTypes}
        onToggleType={handleToggleType}
      />
    </div>
  )
}
