import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Design tokens — one source of truth for the whole app's look.
// Palette (from the brief): purple #a37ab4, pink #d486b8, light-pink #f1b1c1,
// periwinkle #abbcd6, blue #b4d8e8. Soft pastel + frosted glass aesthetic.
// ---------------------------------------------------------------------------

export const colors = {
  purple: '#a37ab4',
  pink: '#d486b8',
  lightPink: '#f1b1c1',
  periwinkle: '#abbcd6',
  blue: '#b4d8e8',

  // Gradients
  bg: ['#F4E7EF', '#E9EEF7', '#E1F0F7'] as const, // page background wash
  hero: ['#a37ab4', '#d486b8'] as const,          // hero / total card
  fab: ['#a37ab4', '#d486b8'] as const,           // centre upload button

  // Text
  ink: '#2E2A3B',
  inkMuted: '#736F87',
  accent: '#8A5AA6',
  onHero: '#FFFFFF',
  onHeroDim: 'rgba(255,255,255,0.85)',

  // Glass
  glass: 'rgba(255,255,255,0.45)',
  glassStrong: 'rgba(255,255,255,0.62)',
  glassBorder: 'rgba(255,255,255,0.7)',
  hairline: 'rgba(120,110,140,0.16)',

  success: '#3E9E6E',
  danger: '#C64B6E',

  // Chart series (category colours) — drawn from the palette
  chart: ['#a37ab4', '#d486b8', '#b4d8e8', '#f1b1c1', '#abbcd6', '#8A5AA6', '#7FA8D0'] as const,
};

export const radius = { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 };

// 4-pt spacing scale
export const space = (n: number) => n * 4;

export const shadow = (Platform.select({
  ios: {
    shadowColor: '#5B4A6B',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 5 },
  default: {},
}) ?? {}) as object;

export const shadowStrong = (Platform.select({
  ios: {
    shadowColor: '#4A2E5C',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  android: { elevation: 10 },
  default: {},
}) ?? {}) as object;

export const font = { h1: 30, h2: 22, h3: 18, body: 15, small: 13, tiny: 11 };

// Inter — the free, open-source "SF Pro"-style font (Apple's SF Pro can't be
// bundled/redistributed; Inter is the standard lookalike). Weight = family.
export const type = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};
