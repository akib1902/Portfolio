import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThemeId } from '@/content/types';
import { THEME_STORAGE_KEY, normaliseTheme, themeMetaContent } from '@/lib/themes';

interface ThemeContextValue {
  theme: ThemeId;
  defaultTheme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  resetToDefault: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemeId) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = themeMetaContent(theme);
}

/**
 * Applies the visitor's saved theme without touching the server default.
 * The no-flash bootstrap in /theme-init.js has already set the attribute.
 */
export function ThemeProvider({
  defaultTheme,
  children,
}: {
  defaultTheme: ThemeId;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeId>(defaultTheme);

  useEffect(() => {
    const current = normaliseTheme(document.documentElement.dataset.theme);
    setThemeState(current ?? defaultTheme);
  }, [defaultTheme]);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Storage can be unavailable in private modes; the theme still applies. */
    }
  }, []);

  const resetToDefault = useCallback(() => {
    try {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setThemeState(defaultTheme);
    applyTheme(defaultTheme);
  }, [defaultTheme]);

  const value = useMemo(
    () => ({ theme, defaultTheme, setTheme, resetToDefault }),
    [theme, defaultTheme, setTheme, resetToDefault],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
