'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

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

type GraphData = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

type GraphViewLoaderProps = {
  activeSlug: string
  onNodeClick: (slug: string) => void
}

// Dynamic import with ssr: false — ForceGraph2D uses canvas and browser APIs
const GraphView = dynamic(() => import('./GraphView'), { ssr: false })

export default function GraphViewLoader({ activeSlug, onNodeClick }: GraphViewLoaderProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null)

  useEffect(() => {
    fetch('/graph-data.json')
      .then((r) => r.json())
      .then(setGraphData)
      .catch((err) => console.error('Failed to load graph data:', err))
  }, [])

  if (!graphData) {
    return <Skeleton className="h-full w-full" />
  }

  return (
    <GraphView
      nodes={graphData.nodes}
      edges={graphData.edges}
      activeSlug={activeSlug}
      onNodeClick={onNodeClick}
    />
  )
}
