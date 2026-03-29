export type Theme = 'light' | 'dark' | 'blue'
export const THEMES: Theme[] = ['light', 'dark', 'blue']

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme) // key must match anti-flash script in layout.tsx
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }))
}

export function getTheme(): Theme {
  const t = document.documentElement.getAttribute('data-theme')
  if (t === 'light' || t === 'dark' || t === 'blue') return t
  const stored = localStorage.getItem('theme') as Theme | null
  if (stored && THEMES.includes(stored)) return stored
  return 'dark'
}
