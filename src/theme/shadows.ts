type ShadowOffset = { width: number; height: number };

type ShadowToken = {
  shadowColor: string;
  shadowOffset: ShadowOffset;
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export const shadows = {
  sm: {
    shadowColor: '#2A211C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#2A211C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#2A211C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  float: {
    shadowColor: '#2A211C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
  },
  /** Ultra-light diffuse shadow for full-bleed overlay cards (3-4% opacity). */
  diffuse: {
    shadowColor: '#2A211C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
} satisfies Record<string, ShadowToken>;

export type AppShadows = typeof shadows;
