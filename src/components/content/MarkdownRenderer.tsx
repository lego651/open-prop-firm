'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppShell } from '@/contexts/AppShellContext'
import type { SourceEntry } from '@/types/content'

type MarkdownRendererProps = {
  htmlContent: string
  sources?: SourceEntry[]
}

export default function MarkdownRenderer({ htmlContent, sources = [] }: MarkdownRendererProps) {
  const router = useRouter()
  const { openInPanel3, openSourcesPanel, focusSource } = useAppShell()

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement

      // --- Citation badge click ---
      const badge = target.closest<HTMLElement>('.citation-badge')
      if (badge) {
        e.preventDefault()
        const rawIndices = badge.dataset.citationIndices ?? ''
        const indices = rawIndices
          .split(',')
          .map((s) => parseInt(s, 10))
          .filter((n) => !Number.isNaN(n))

        // Open sources panel with the page's sources, then focus the first cited one
        openSourcesPanel(sources)
        if (indices.length > 0) {
          focusSource(indices[0])
        }
        return
      }

      // --- Anchor click ---
      const anchor = target.closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return

      // Modifier-click on any internal link: open in Panel 3
      if ((e.metaKey || e.ctrlKey) && href.startsWith('/')) {
        e.preventDefault()
        const slug = href.replace(/^\//, '')
        openInPanel3(slug)
        return
      }

      // Internal wikilinks start with /firms/ — intercept and use router
      if (href.startsWith('/firms/')) {
        e.preventDefault()
        router.push(href)
      }
      // External links fall through to default browser behavior
    },
    [router, openInPanel3, openSourcesPanel, focusSource, sources],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      const target = e.target as HTMLElement
      const badge = target.closest<HTMLElement>('.citation-badge')
      if (!badge) return
      e.preventDefault()
      const rawIndices = badge.dataset.citationIndices ?? ''
      const indices = rawIndices
        .split(',')
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n))
      openSourcesPanel(sources)
      if (indices.length > 0) {
        focusSource(indices[0])
      }
    },
    [openSourcesPanel, focusSource, sources],
  )

  return (
    <div
      className="prose"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      /* htmlContent is generated from /data markdown files — trusted source */
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}
