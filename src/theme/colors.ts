export const colors = {
  background: '#FAF4EC',
  surface: '#FFFFFF',
  surfaceFill: '#F5EFE7',
  surfaceFillLight: '#FAF6F1',
  surfaceElevated: '#FDF8F1',

  primary: '#BF5A36',
  primaryLight: '#F7E8E0',
  primaryBorder: '#EAD0C6',
  primarySurface: '#FAF0EC',

  secondary: '#6B7A45',
  secondaryLight: '#E8EBE0',

  success: '#6B7A45',
  successLight: '#E8EBE0',
  successSurface: '#F4F6EF',

  danger: '#B94E48',
  dangerLight: '#F8EAE9',
  dangerSurface: '#FBF3F2',

  warning: '#D4A056',
  warningLight: '#F9EFDC',
  warningSurface: '#FDF8F0',

  accent: '#C67B3C',

  // Legacy accent aliases recolored to the warm editorial palette
  purple: '#8B6A4B',
  teal: '#6B7A45',
  orange: '#C67B3C',

  text: {
    primary: '#2A211C',
    secondary: '#5C5048',
    muted: '#9A8E84',
    disabled: '#C4B8AE',
    placeholder: '#B0A499',
    inputPlaceholder: '#B0A499',
    lighter: '#A89E94',
    inverse: '#FFFFFF',
    inverse15: 'rgba(255,255,255,0.15)',
  },

  border: '#E8E0D6',
  borderLight: '#F0EAE2',
  divider: '#E8E0D6',

  overlay: '#2A211C',
  overlay30: 'rgba(42,33,28,0.3)',
  overlay40: 'rgba(42,33,28,0.4)',
  overlay50: 'rgba(42,33,28,0.5)',

  transparent: 'transparent',

  // Semantic aliases for common patterns
  tagBackground: '#F0EAE2',
  stepIndicatorActive: '#BF5A36',
  stepIndicatorInactive: '#D9CFC5',
  progressTrack: '#E8E0D6',
  skeleton: '#F0EAE2',
} as const;

export type AppColors = typeof colors;
