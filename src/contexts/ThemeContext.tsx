'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'qc-theme',
}: ThemeProviderProps): React.ReactNode {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme
    const stored = localStorage.getItem(storageKey)
    return stored === 'light' || stored === 'dark' ? stored : defaultTheme
  })

  const isDark = theme === 'dark'

  useEffect(() => {
    const root = window.document.documentElement

    if (isDark) {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#1f2937' : '#ffffff')
    }
  }, [isDark])

  function setTheme(newTheme: Theme): void {
    setThemeState(newTheme)
    localStorage.setItem(storageKey, newTheme)
  }

  function toggle(): void {
    setTheme(isDark ? 'light' : 'dark')
  }

  const value: ThemeContextType = {
    theme,
    setTheme,
    isDark,
    toggle,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
