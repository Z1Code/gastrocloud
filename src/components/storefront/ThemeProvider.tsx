'use client';

import { createContext, useContext } from 'react';

// The theme shape matches what themes.ts exports
interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
}

interface StorefrontThemeContext {
  key: string;
  name: string;
  colors: ThemeColors;
  font: string;
  radius: string;
}

const ThemeContext = createContext<StorefrontThemeContext | null>(null);

export function useStorefrontTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useStorefrontTheme must be used within StorefrontThemeProvider');
  return ctx;
}

interface Props {
  theme: StorefrontThemeContext;
  children: React.ReactNode;
}

export function StorefrontThemeProvider({ theme, children }: Props) {
  return (
    <ThemeContext.Provider value={theme}>
      <div
        style={{
          '--sf-primary': theme.colors.primary,
          '--sf-secondary': theme.colors.secondary,
          '--sf-accent': theme.colors.accent,
          '--sf-bg': theme.colors.bg,
          '--sf-surface': theme.colors.surface,
          '--sf-text': theme.colors.text,
          '--sf-text-muted': theme.colors.textMuted,
          '--sf-font': theme.font,
          '--sf-radius': theme.radius,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
