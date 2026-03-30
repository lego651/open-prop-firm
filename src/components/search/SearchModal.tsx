'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Fuse from 'fuse.js'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import type { SearchEntry } from '@/types/content'

type SearchModalProps = {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [fuse, setFuse] = useState<Fuse<SearchEntry> | null>(null)

  // Load and initialize Fuse on first open
  useEffect(() => {
    if (!isOpen || fuse) return
    const controller = new AbortController()
    fetch('/search-index.json', { signal: controller.signal })
      .then((r) => r.json())
      .then((entries: SearchEntry[]) => {
        setFuse(
          new Fuse(entries, {
            keys: [
              { name: 'title', weight: 0.4 },
              { name: 'excerpt', weight: 0.3 },
              { name: 'firm', weight: 0.2 },
              { name: 'type', weight: 0.1 },
            ],
            threshold: 0.4,
            includeScore: true,
          }),
        )
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error('Failed to load search index:', err)
      })
    return () => controller.abort()
  }, [isOpen, fuse])

  // Compute results synchronously — Fuse.search is fast for client-side indexes
  const results: SearchEntry[] =
    query && fuse ? fuse.search(query).slice(0, 10).map((r) => r.item) : []

  function handleClose() {
    setQuery('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl p-0">
        <Command>
          <CommandInput
            placeholder="Search firms, rules, challenges..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {results.length === 0 && query.length > 0 && (
              <CommandEmpty>No results for &ldquo;{query}&rdquo;</CommandEmpty>
            )}
            {results.map((entry) => (
              <CommandItem
                key={entry.slug}
                onSelect={() => {
                  router.push('/' + entry.slug)
                  handleClose()
                }}
              >
                <span className="font-medium">{entry.title}</span>
                <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                  {entry.firm} · {entry.type}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
