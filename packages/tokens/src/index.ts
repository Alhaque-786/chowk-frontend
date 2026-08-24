/**
 * The design tokens. One source of truth for every surface.
 *
 * WHY THIS PACKAGE EXISTS, measured rather than asserted. The web app and the
 * customer app each held their own copy of the palette — one as CSS custom
 * properties, one as a JS object I transcribed by hand from the other. A day later,
 * eleven of the nineteen shared colours had drifted:
 *
 *     accent       web #c2681a   app #c2542c
 *     veg          web #0a7a3d   app #1f7a4d
 *     non-veg      web #9b2c2c   app #a6342b
 *     ink          web #1c1a17   app #1c1917
 *     ink-soft     web #55504a   app #57534e
 *     ...and six more
 *
 * Nothing failed. No test caught it, no type caught it, and nobody noticed, because
 * a palette drifting apart looks like a design decision rather than a bug. That is
 * the whole argument for a package: the failure mode of duplicated tokens is silence.
 *
 * WHERE THE TWO DISAGREED, THE APP'S VALUES WON. That is a product decision, not a
 * technical one — the app's look was the one signed off, so web moves to match it
 * rather than the other way round.
 *
 * The driver app does not exist yet. It should import this on day one, which is the
 * cheapest moment to be consistent and the only moment that requires no migration.
 */

/* ---------------------------------------------------------------------------
   Colour
   ---------------------------------------------------------------------------

   Direction: a chowk is the market square — the public ground everyone trades on.
   The surface reads as warm paper rather than dark app chrome, and the brand colour
   is INDIGO: a pigment with genuine Indian provenance, and cool enough to leave the
   warm end of the spectrum entirely to the food.

   That separation is the load-bearing decision. Food photography and the
   legally-required veg/non-veg marks are already red and green; a warm brand colour
   would fight both. Indigo lets a green mark read as "veg" rather than as
   decoration, which matters because in India that mark is regulated, not stylistic.

   LIGHT ONLY, deliberately. Every major food app — Swiggy, Zomato, Deliveroo,
   DoorDash — ships a light consumer surface and no dark mode, and the reason is
   appetite: warm food tones on a dark ground go muddy, and photography that sells a
   biryani on paper reads as a nightclub menu on black. A dark variant would not be
   this design dimmed; it would be a different one.
   --------------------------------------------------------------------------- */
export const color = {
  /** Warm paper, not white. A pure #FFF reads clinical next to food. */
  ground: '#FAF6EF',
  surface: '#FFFFFF',
  surfaceSunk: '#F2EDE3',
  surfaceRaised: '#FFFFFF',

  /** Warm near-black. Pure black on warm paper looks like a printing error. */
  ink: '#1C1917',
  inkSoft: '#57534E',
  inkFaint: '#8C837A',
  /*
    Ink for text sitting on a DARK fill. The app had this set to the ground colour,
    which happens to look right and is not a decision — "the palest thing in the
    palette" and "the page background" are separate roles that only coincidentally
    agree. Web's slightly cooler near-white is kept so the two roles can move
    independently later.
  */
  inkInverse: '#FBF9F5',

  rule: '#EBE4D8',
  ruleStrong: '#D6CDBC',

  /** Indigo. Actions and identity, never food state. */
  brand: '#2F3F7A',
  brandHover: '#263462',
  brandSoft: '#E7EAF4',
  brandInk: '#FFFFFF',

  /*
    SEMANTIC — separate from brand, because these encode regulated meaning. The
    veg/non-veg mark is a legal labelling requirement in India, so these values are
    not free for a designer to retune on aesthetic grounds.
  */
  veg: '#1F7A4D',
  nonVeg: '#A6342B',
  egg: '#B8860B',

  /*
    Ink for text sitting ON a semantic fill, as a token rather than a hardcoded
    white at each call site — so the pairing stays correct if a fill changes.
  */
  onVeg: '#FFFFFF',
  onWarning: '#FFFFFF',

  /*
    STATE. `success` deliberately equals `veg` and `danger` deliberately equals
    `nonVeg` — one green and one red in the whole palette. Two near-identical greens
    is the classic way a palette starts looking accidental, and a reader cannot tell
    a 5% hue difference apart anyway. They stay separately NAMED so that if
    "order confirmed" ever needs to stop looking like "vegetarian", the change is one
    line here rather than a hunt through call sites.
  */
  success: '#1F7A4D',
  warning: '#A1620A',
  danger: '#A6342B',
  dangerSoft: '#FBEBE9',

  /*
    ACCENT — terracotta, used sparingly for offers and highlights. One bold place;
    everything around it stays quiet.
  */
  accent: '#C2542C',
  accentSoft: '#FBEEE6',
} as const

/**
 * The hero gradient, as three stops.
 *
 * Shared because it is the single most recognisable thing on either surface: the
 * warm band the headline and the search field sit against. Three stops rather than
 * two — a two-stop linear gradient bands visibly at this size, and the third stop is
 * what keeps it looking like a printed surface.
 */
export const gradient = {
  hero: ['#E9963C', '#D2622C', '#B84B2A'],
  /** Sits under a photograph while it decodes, so the slot is never white. */
  imagePlaceholder: '#E8A44C',
} as const

/**
 * Corner radii, in px. ONE ladder, and consolidating it caught a real trap.
 *
 * The two apps had scales using THE SAME NUMBERS UNDER DIFFERENT NAMES:
 *
 *              6px    8px   12px   16px   20px   28px
 *     web       sm     md     lg     xl    2xl    3xl
 *     app        —     sm     md     lg     xl      —
 *
 * So `radius.lg` meant 16 in the app and 12 on the web — and any value copied
 * between the two arrived silently wrong by one step. Naming a scale after its
 * position rather than its size is what allows that, and it is invisible in review
 * because both sides read as correct on their own.
 *
 * The ladder below is keyed so that every existing utility keeps its current value:
 * web's `rounded-sm` still resolves to 6px, `rounded-lg` to 12px. Nothing moves.
 */
export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const

/**
 * Spacing, on a 4px rhythm.
 *
 * Emitted for the app only. Tailwind already ships an identical 4px scale, so
 * generating CSS for this would produce a second set of names for the same numbers —
 * which is the problem this package exists to remove, not to add.
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

/**
 * Motion.
 *
 * `easing` is the standard curve — a fast start that settles rather than
 * decelerating evenly — and both surfaces already used exactly this cubic-bezier, so
 * it was duplicated rather than shared.
 *
 * `spring` is app-only and has no CSS equivalent: a physical spring resolves on the
 * UI thread over however long it needs, where a CSS transition is a fixed duration
 * along a curve. ONE spring, reused everywhere. A codebase with a different spring
 * per component animates inconsistently in a way people feel without being able to
 * name it — the app seems to have several personalities. Damping high enough that
 * nothing wobbles: a bouncy food app reads as a toy.
 */
export const motion = {
  duration: { fast: 160, base: 260, slow: 420 },
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  spring: { damping: 18, stiffness: 220, mass: 0.7 },
} as const

/**
 * Shadows.
 *
 * WARM-TINTED, not neutral grey — a brown-black shadow reads as an object sitting on
 * paper, where a grey one reads as a sticker. The tint is the shared part; the two
 * platforms genuinely cannot share the rest.
 *
 * CSS layers three stops per level, because a single hard shadow reads as a sticker
 * and stacked soft ones read as depth without any 3D transform. React Native takes
 * one offset/radius/opacity on iOS and ignores all of it on Android in favour of
 * `elevation`. Pretending one format covers both would mean shipping a worse shadow
 * on both, so each is expressed natively and derived from the same tint.
 */
export const shadowTint = { r: 74, g: 56, b: 32 } as const

const t = `${shadowTint.r} ${shadowTint.g} ${shadowTint.b}`

export const shadowCss = {
  sm: `0 1px 2px rgb(${t} / 0.06)`,
  base: `0 1px 2px rgb(${t} / 0.05), 0 4px 8px -2px rgb(${t} / 0.06), 0 12px 24px -8px rgb(${t} / 0.10)`,
  lg: `0 2px 4px rgb(${t} / 0.05), 0 8px 16px -4px rgb(${t} / 0.08), 0 24px 48px -12px rgb(${t} / 0.16)`,
  brand: `0 8px 24px -8px rgb(47 63 122 / 0.35)`,
  /** For elements floating clear of the page. Deep, wide and soft, because a
   *  floating object casts a diffuse shadow rather than a crisp one. */
  float: `0 4px 8px rgb(${t} / 0.06), 0 16px 32px -8px rgb(${t} / 0.12), 0 48px 80px -24px rgb(${t} / 0.28)`,
} as const

const tintHex = `#${[shadowTint.r, shadowTint.g, shadowTint.b]
  .map((n) => n.toString(16).padStart(2, '0'))
  .join('')}`

export const shadowNative = {
  card: {
    shadowColor: tintHex,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  raised: {
    shadowColor: tintHex,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const
