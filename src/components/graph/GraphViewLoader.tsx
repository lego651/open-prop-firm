'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import type { GraphData } from '@/types/content'

type GraphViewLoaderProps = {
  activeSlug: string
  onNodeClick: (slug: string) => void
}

// Dynamic import with ssr: false — ForceGraph2D uses canvas and browser APIs
const GraphView = dynamic(() => import('./GraphView'), { ssr: false })

export default function GraphViewLoader({ activeSlug, onNodeClick }: GraphViewLoaderProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/graph-data.json', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load graph data: ${r.status}`)
        return r.json()
      })
      .then(setGraphData)
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error('Failed to load graph data:', err)
      })
    return () => controller.abort()
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
