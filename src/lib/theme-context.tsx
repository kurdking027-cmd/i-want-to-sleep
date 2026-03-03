'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  resolvedTheme: 'light' | 'dark'
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start with 'dark' on server to avoid hydration mismatch
  const [theme, setThemeState] = useState<ThemeMode>('dark')
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  // Load saved theme on client mount
  useEffect(() => {
    const saved = localStorage.getItem('medicore_theme') as ThemeMode
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Loading saved preference from localStorage on mount
      setThemeState(saved)
    }
    
    // Get system theme
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setSystemTheme(isDark ? 'dark' : 'light')
    setMounted(true)
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Calculate resolved theme using useMemo
  const resolvedTheme = useMemo<'light' | 'dark'>(() => {
    return theme === 'system' ? systemTheme : theme
  }, [theme, systemTheme])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return
    
    const root = document.documentElement
    
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      root.style.setProperty('--bg-primary', '#0f172a')
      root.style.setProperty('--bg-secondary', '#1e293b')
      root.style.setProperty('--bg-card', 'rgba(30, 41, 59, 0.5)')
      root.style.setProperty('--text-primary', '#ffffff')
      root.style.setProperty('--text-secondary', '#94a3b8')
      root.style.setProperty('--border-color', '#334155')
      document.body.style.backgroundColor = '#0f172a'
      document.body.style.color = '#ffffff'
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
      root.style.setProperty('--bg-primary', '#f8fafc')
      root.style.setProperty('--bg-secondary', '#ffffff')
      root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.8)')
      root.style.setProperty('--text-primary', '#0f172a')
      root.style.setProperty('--text-secondary', '#64748b')
      root.style.setProperty('--border-color', '#e2e8f0')
      document.body.style.backgroundColor = '#f8fafc'
      document.body.style.color = '#0f172a'
    }
  }, [resolvedTheme, mounted])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('medicore_theme', newTheme)
    }
  }

  const value = useMemo(() => ({
    theme,
    setTheme,
    resolvedTheme,
    mounted
  }), [theme, resolvedTheme, mounted])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Theme options for UI
export const themeOptions = [
  { code: 'light' as ThemeMode, name: 'Light', icon: '☀️', description: 'Light theme' },
  { code: 'dark' as ThemeMode, name: 'Dark', icon: '🌙', description: 'Dark theme' },
  { code: 'system' as ThemeMode, name: 'System', icon: '💻', description: 'Follow device settings' }
]
