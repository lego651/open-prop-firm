import type { FileType } from '@/types/content'

export type ThemeVariant = 'dark' | 'light' | 'blue'

export type NodeColors = {
  dark: string
  light: string
  blue: string
}

// Per file-type palette across the three supported themes
export const FILE_TYPE_COLORS: Record<FileType | 'folder' | 'other', NodeColors> = {
  'basic-info': { dark: '#60a5fa', light: '#2563eb', blue: '#93c5fd' },
  challenge: { dark: '#34d399', light: '#059669', blue: '#6ee7b7' },
  rules: { dark: '#f472b6', light: '#db2777', blue: '#f9a8d4' },
  promo: { dark: '#fb923c', light: '#ea580c', blue: '#fdba74' },
  changelog: { dark: '#a78bfa', light: '#7c3aed', blue: '#c4b5fd' },
  folder: { dark: '#94a3b8', light: '#64748b', blue: '#cbd5e1' },
  other: { dark: '#6b7280', light: '#374151', blue: '#9ca3af' },
}

export function getNodeColor(
  type: string,
  theme: ThemeVariant = 'dark',
): string {
  const colors =
    FILE_TYPE_COLORS[type as keyof typeof FILE_TYPE_COLORS] ??
    FILE_TYPE_COLORS.other
  return colors[theme]
}
