'use client'

import type { SourceEntry } from '@/types/content'

type SourcesPanelProps = {
  sources: SourceEntry[]
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function SourceRow({ source }: { source: SourceEntry }) {
  const domain = extractDomain(source.url)

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-1 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5 transition-colors hover:border-[var(--accent)] hover:bg-[var(--interactive-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <div className="flex items-center gap-2">
        {/* Favicon — external Google service, next/image not applicable */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
          alt=""
          aria-hidden="true"
          width={14}
          height={14}
          className="size-3.5 shrink-0 rounded-sm object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />

        {/* Official badge */}
        {source.isOfficial && (
          <span className="inline-flex items-center rounded-sm bg-[var(--accent)] px-1 py-px text-[10px] font-semibold leading-none text-white">
            Official
          </span>
        )}

        {/* Label */}
        <span className="flex-1 truncate text-[13px] font-medium text-[var(--foreground)] group-hover:text-[var(--accent)]">
          {source.label}
        </span>

        {/* External link icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="size-3 shrink-0 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        >
          <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
          <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
        </svg>
      </div>

      {/* Domain */}
      <span className="text-[11px] text-[var(--muted-foreground)]">{domain}</span>

      {/* Description */}
      {source.description && (
        <p className="text-[12px] leading-snug text-[var(--muted-foreground)]">
          {source.description}
        </p>
      )}
    </a>
  )
}

export default function SourcesPanel({ sources }: SourcesPanelProps) {
  // Deduplicate by URL
  const seen = new Set<string>()
  const deduped: SourceEntry[] = []
  for (const s of sources) {
    if (!seen.has(s.url)) {
      seen.add(s.url)
      deduped.push(s)
    }
  }

  // Official sources first, then the rest
  const sorted = [
    ...deduped.filter((s) => s.isOfficial),
    ...deduped.filter((s) => !s.isOfficial),
  ]

  if (sorted.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-[var(--muted-foreground)]">No sources available.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-3 py-3">
      <div className="flex flex-col gap-2">
        {sorted.map((source, i) => (
          <SourceRow key={`${source.url}-${i}`} source={source} />
        ))}
      </div>
    </div>
  )
}
