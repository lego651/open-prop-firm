'use client'

import { useEffect, useState } from 'react'
import { Moon, Palette, Sun } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getTheme, setTheme, THEMES, type Theme } from '@/lib/theme'

const THEME_LABELS: Record<Theme, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
  blue: 'Blue theme',
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === 'light') return <Sun size={16} />
  if (theme === 'dark') return <Moon size={16} />
  return <Palette size={16} />
}

export function ThemeToggle() {
  const [current, setCurrentTheme] = useState<Theme>('dark')

  useEffect(() => {
    // Hydration read — syncing theme from DOM attribute set by inline script.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTheme(getTheme())
  }, [])

  function handleClick() {
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]
    setTheme(next)
    setCurrentTheme(next)
  }

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={handleClick}
        aria-label={THEME_LABELS[current]}
        className="flex size-7 items-center justify-center rounded-md hover:bg-[var(--muted)]"
      >
        <ThemeIcon theme={current} />
      </TooltipTrigger>
      <TooltipContent>{THEME_LABELS[current]}</TooltipContent>
    </Tooltip>
  )
}
