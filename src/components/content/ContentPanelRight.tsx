'use client'

import { useState, useEffect } from 'react'
import TabBar from '@/components/content/TabBar'
import { PaneHeader } from '@/components/content/PaneHeader'
import MarkdownRenderer from '@/components/content/MarkdownRenderer'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppShell } from '@/contexts/AppShellContext'
import { DEFAULT_FIRM_SLUG } from '@/lib/constants'
import type { PageContent, ContentApiResponse } from '@/types/content'

type ContentPanelRightProps = {
  externalSlug?: string | null
}

export default function ContentPanelRight({ externalSlug }: ContentPanelRightProps) {
  const { activeSlug } = useAppShell()
  const [compareSlug, setCompareSlug] = useState(DEFAULT_FIRM_SLUG)

  useEffect(() => {
    if (externalSlug) {
      setCompareSlug(externalSlug)
    }
  }, [externalSlug])

  const [content, setContent] = useState<PageContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!compareSlug) return
    const controller = new AbortController()
    setLoading(true)
    setContent(null)
    setError(null)
    fetch('/api/content/' + compareSlug, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: unknown) => {
        const resp = data as ContentApiResponse
        if (!resp || typeof resp !== 'object' || !('ok' in resp)) {
          setError('Unexpected response format.')
          setLoading(false)
          return
        }
        if (resp.ok) {
          setContent(resp.data)
        } else {
          setError(resp.error)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError('Failed to load content. Please check your connection.')
        setLoading(false)
      })
    return () => controller.abort()
  }, [compareSlug])

  return (
    <div className="flex h-full flex-col">
      <TabBar />
      <PaneHeader paneId="pane-compare" activeSlug={activeSlug} />
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <>
            <Skeleton className="mb-4 h-6 w-3/4" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </>
        ) : error ? (
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
        ) : content ? (
          <MarkdownRenderer htmlContent={content.htmlContent} />
        ) : null}
      </div>
    </div>
  )
}
