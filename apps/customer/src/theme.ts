/**
 * Design tokens, mirrored from the web app's globals.css.
 *
 * Duplicated rather than shared, and that is deliberate for now: extracting them
 * into `packages/core` would mean shipping CSS custom properties to a runtime that
 * has none, so the values would have to be converted anyway. When the second
 * consumer genuinely needs them the extraction is a plain object, not a stylesheet.
 *
 * LIGHT ONLY, matching the web decision and for the same reason: warm food tones go
 * muddy on a dark ground, and every major food app ships a light consumer surface.
 * A dark variant would be a different design, not this one dimmed.
 */
export const c = {
  ground: '#FAF6EF',
  surface: '#FFFFFF',
  sunk: '#F2EDE3',
  rule: '#EBE4D8',
  ruleStrong: '#D6CDBC',

  ink: '#1C1917',
  inkSoft: '#57534E',
  inkFaint: '#8C837A',
  inkInverse: '#FAF6EF',

  brand: '#2F3F7A',
  brandSoft: '#E7EAF4',
  brandInk: '#FFFFFF',

  accent: '#C2542C',
  accentSoft: '#FBEEE6',

  veg: '#1F7A4D',
  nonVeg: '#A6342B',
  onVeg: '#FFFFFF',

  danger: '#A6342B',
  dangerSoft: '#FBEBE9',
} as const

/** A 4px rhythm, so spacing is chosen from a scale rather than typed per component. */
export const s = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const

/**
 * Warm-tinted shadows, not neutral grey.
 *
 * The same choice as the web app: a brown-black shadow reads as an object sitting
 * on paper, where a grey one reads as a sticker. iOS takes the four shadow props;
 * Android only honours `elevation`, so both are set and neither is redundant.
 */
export const shadow = {
  card: {
    shadowColor: '#4A3820',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#4A3820',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const

/**
 * Motion.
 *
 * ONE spring, reused. A codebase with a different spring per component animates
 * inconsistently in a way people feel without being able to name — the app seems
 * to have several personalities. `damping` high enough that nothing wobbles: a
 * bouncy food app reads as a toy.
 */
export const spring = {
  damping: 18,
  stiffness: 220,
  mass: 0.7,
} as const

/** Duration for anything that fades rather than springs. */
export const duration = {
  fast: 160,
  base: 260,
  slow: 420,
} as const
