export interface StorefrontTheme {
  key: string;
  name: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  font: string;
  radius: string;
}

const clasico_elegante: StorefrontTheme = {
  key: 'clasico_elegante',
  name: 'Clasico Elegante',
  emoji: '\u{1F3DB}\uFE0F',
  colors: {
    primary: '#d4af37',
    secondary: '#b8860b',
    accent: '#f5e6a3',
    bg: '#1a1a2e',
    surface: '#252542',
    text: '#f0ead6',
    textMuted: '#9a95a8',
  },
  font: 'Georgia, serif',
  radius: '0.5rem',
};

const moderno: StorefrontTheme = {
  key: 'moderno',
  name: 'Moderno',
  emoji: '\u2728',
  colors: {
    primary: '#4f46e5',
    secondary: '#06b6d4',
    accent: '#818cf8',
    bg: '#ffffff',
    surface: '#f8fafc',
    text: '#111827',
    textMuted: '#6b7280',
  },
  font: 'Inter, sans-serif',
  radius: '1rem',
};

const rustico: StorefrontTheme = {
  key: 'rustico',
  name: 'Rustico',
  emoji: '\u{1F33E}',
  colors: {
    primary: '#92400e',
    secondary: '#f59e0b',
    accent: '#d97706',
    bg: '#fef3c7',
    surface: '#fffbeb',
    text: '#451a03',
    textMuted: '#78716c',
  },
  font: 'Nunito, sans-serif',
  radius: '0.75rem',
};

const minimalista: StorefrontTheme = {
  key: 'minimalista',
  name: 'Minimalista',
  emoji: '\u25FB\uFE0F',
  colors: {
    primary: '#111111',
    secondary: '#555555',
    accent: '#333333',
    bg: '#ffffff',
    surface: '#fafafa',
    text: '#111111',
    textMuted: '#888888',
  },
  font: 'Inter, sans-serif',
  radius: '0.25rem',
};

const tropical: StorefrontTheme = {
  key: 'tropical',
  name: 'Tropical',
  emoji: '\u{1F334}',
  colors: {
    primary: '#059669',
    secondary: '#eab308',
    accent: '#34d399',
    bg: '#ecfdf5',
    surface: '#ffffff',
    text: '#064e3b',
    textMuted: '#6b7280',
  },
  font: 'Poppins, sans-serif',
  radius: '1.25rem',
};

const noche: StorefrontTheme = {
  key: 'noche',
  name: 'Noche',
  emoji: '\u{1F319}',
  colors: {
    primary: '#7c3aed',
    secondary: '#ec4899',
    accent: '#a78bfa',
    bg: '#0f0118',
    surface: '#1e0a2e',
    text: '#f3e8ff',
    textMuted: '#9686a8',
  },
  font: 'Inter, sans-serif',
  radius: '1rem',
};

const mediterraneo: StorefrontTheme = {
  key: 'mediterraneo',
  name: 'Mediterraneo',
  emoji: '\u{1FAD2}',
  colors: {
    primary: '#c2410c',
    secondary: '#65a30d',
    accent: '#ea580c',
    bg: '#fdf6f0',
    surface: '#ffffff',
    text: '#1c1917',
    textMuted: '#78716c',
  },
  font: 'Lora, serif',
  radius: '0.75rem',
};

const urbano: StorefrontTheme = {
  key: 'urbano',
  name: 'Urbano',
  emoji: '\u{1F3D9}\uFE0F',
  colors: {
    primary: '#dc2626',
    secondary: '#2563eb',
    accent: '#f87171',
    bg: '#ffffff',
    surface: '#f1f5f9',
    text: '#0f172a',
    textMuted: '#64748b',
  },
  font: '"Roboto Condensed", sans-serif',
  radius: '0.5rem',
};

const japones: StorefrontTheme = {
  key: 'japones',
  name: 'Japones',
  emoji: '\u{1F363}',
  colors: {
    primary: '#f43f5e',
    secondary: '#84cc16',
    accent: '#fb7185',
    bg: '#fef2f2',
    surface: '#ffffff',
    text: '#1e1b18',
    textMuted: '#78716c',
  },
  font: '"Noto Sans JP", sans-serif',
  radius: '1rem',
};

const chileno: StorefrontTheme = {
  key: 'chileno',
  name: 'Chileno',
  emoji: '\u{1F1E8}\u{1F1F1}',
  colors: {
    primary: '#dc2626',
    secondary: '#1d4ed8',
    accent: '#ef4444',
    bg: '#ffffff',
    surface: '#f8fafc',
    text: '#111827',
    textMuted: '#6b7280',
  },
  font: 'Inter, sans-serif',
  radius: '0.75rem',
};

export const themes: Record<string, StorefrontTheme> = {
  clasico_elegante,
  moderno,
  rustico,
  minimalista,
  tropical,
  noche,
  mediterraneo,
  urbano,
  japones,
  chileno,
};

export const themeList: StorefrontTheme[] = Object.values(themes);

export const DEFAULT_THEME = 'moderno';

export function getTheme(key?: string | null): StorefrontTheme {
  if (key && themes[key]) {
    return themes[key];
  }
  return themes[DEFAULT_THEME];
}
