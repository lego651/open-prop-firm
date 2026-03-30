'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

type MarkdownRendererProps = {
  htmlContent: string
}

export default function MarkdownRenderer({ htmlContent }: MarkdownRendererProps) {
  const router = useRouter()

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return
      // Internal wikilinks start with /firms/ — intercept and use router
      if (href.startsWith('/firms/')) {
        e.preventDefault()
        router.push(href)
      }
      // External links fall through to default browser behavior
    },
    [router],
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
