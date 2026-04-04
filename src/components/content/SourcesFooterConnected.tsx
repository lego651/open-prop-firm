'use client'

import { useAppShell } from '@/contexts/AppShellContext'
import SourcesFooter from '@/components/content/SourcesFooter'
import type { SourceEntry } from '@/types/content'

type SourcesFooterConnectedProps = {
  sources: SourceEntry[]
}

/**
 * Client wrapper that connects SourcesFooter's onOpen callback to the
 * AppShell context, opening Panel 3 in sources mode.
 */
export default function SourcesFooterConnected({ sources }: SourcesFooterConnectedProps) {
  const { openSourcesPanel } = useAppShell()

  return (
    <SourcesFooter
      sources={sources}
      onOpen={() => openSourcesPanel(sources)}
    />
  )
}
