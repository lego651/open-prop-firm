'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppShell } from '@/contexts/AppShellContext'

type MarkdownRendererProps = {
  htmlContent: string
}

export default function MarkdownRenderer({ htmlContent }: MarkdownRendererProps) {
  const router = useRouter()
  const { openInPanel3 } = useAppShell()

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
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
    [router, openInPanel3],
  )

  return (
    <div
      className="prose"
      onClick={handleClick}
      /* htmlContent is generated from /data markdown files — trusted source */
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}
