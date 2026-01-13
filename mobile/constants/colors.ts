// Colors matched to web app design system
// Primary: Green (HSL 142 76% 36%)

export const Colors = {
  light: {
    background: '#ffffff',
    surface: '#f5f5f5',
    card: '#fafafa',
    text: '#1a1a1a',
    textSecondary: '#666666',
    textTertiary: '#999999',
    // Green primary to match web
    primary: '#22c55e',
    primaryForeground: '#ffffff',
    accent: '#f59e0b',
    accentForeground: '#1a1a1a',
    border: '#e5e5e5',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    // Card colors
    spades: '#1a1a1a',
    hearts: '#dc2626',
    diamonds: '#dc2626',
    clubs: '#1a1a1a',
    // Muted
    muted: '#f5f5f5',
    mutedForeground: '#737373',
  },
  dark: {
    background: '#121212',
    surface: '#1a1a1a',
    card: '#171717',
    text: '#f5f5f5',
    textSecondary: '#a3a3a3',
    textTertiary: '#737373',
    // Green primary to match web
    primary: '#22c55e',
    primaryForeground: '#ffffff',
    accent: '#fbbf24',
    accentForeground: '#1a1a1a',
    border: '#292929',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    // Card colors
    spades: '#f5f5f5',
    hearts: '#f87171',
    diamonds: '#f87171',
    clubs: '#f5f5f5',
    // Muted
    muted: '#262626',
    mutedForeground: '#a3a3a3',
  },
};

export type ColorScheme = 'light' | 'dark';
