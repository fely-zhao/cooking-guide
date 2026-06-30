export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    xxl: 28,
    full: 9999,
  },

  scrollBottomPadding: 100,
  screenTopPadding: 60,
} as const;

export type AppSpacing = typeof spacing;
