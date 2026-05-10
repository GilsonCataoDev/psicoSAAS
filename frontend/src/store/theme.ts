import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function applyTheme(mode: ThemeMode): void {
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark())
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',

      setMode: (mode) => {
        applyTheme(mode)
        set({ mode })
      },

      toggleMode: () => {
        const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
        applyTheme(next)
        set({ mode: next })
      },
    }),
    {
      name: 'psicosaas-theme',
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.mode ?? 'system')
      },
    },
  ),
)
