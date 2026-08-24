import { color, gradient, motion, radius, shadowCss } from './index.ts'

/**
 * Renders the tokens as CSS.
 *
 * GENERATED, NOT HAND-MAINTAINED. The file this produces is checked in so the web
 * app has no build step and no runtime dependency on Node — it is a plain stylesheet
 * that Tailwind reads like any other. But being checked in means it can go stale, so
 * `npm run check --workspace=@chowk/tokens` regenerates and diffs, and fails if the
 * two disagree. That converts drift from something you notice months later into a
 * failing command, which is the entire point.
 */

/** `surfaceSunk` -> `surface-sunk`, matching the custom-property names already in use. */
function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)
}

/** px as rem, because a radius should scale with a customer's chosen font size. */
function rem(px: number): string {
  return px >= 9999 ? '9999px' : `${px / 16}rem`
}

/*
  Tailwind's radius utility names sit one step off this ladder — `rounded-sm` is 6px,
  which is `xs` here. Mapping them explicitly is what keeps every existing class in
  the web app rendering exactly as it does today while the ladder itself is shared.
  Getting this table wrong would silently reshape every corner in the app, so it is
  written out rather than computed.

  THE LADDER IS EMITTED AS `--corner-*`, NOT `--radius-*`, and that naming is the
  whole point. The first version of this generator emitted the ladder as `--radius-*`
  in `:root` while Tailwind owns `--radius-*` for its utilities — so `var(--radius-sm)`
  meant 8px in hand-written CSS and `rounded-sm` meant 6px in a class attribute. That
  is precisely the same-name-different-value trap this package was written to remove,
  reintroduced one file later. Tailwind owns `--radius-*`; the ladder owns
  `--corner-*`; nothing owns both.
*/
const TAILWIND_RADIUS: ReadonlyArray<readonly [string, keyof typeof radius]> = [
  ['sm', 'xs'],
  ['md', 'sm'],
  ['lg', 'md'],
  ['xl', 'lg'],
  ['2xl', 'xl'],
  ['3xl', 'xxl'],
  ['full', 'full'],
]

export function renderCss(): string {
  const out: string[] = []

  out.push('/* GENERATED FILE — DO NOT EDIT.')
  out.push(' *')
  out.push(' * Source:    packages/tokens/src/index.ts')
  out.push(' * Regenerate: npm run generate --workspace=@chowk/tokens')
  out.push(' * Verify:     npm run check --workspace=@chowk/tokens')
  out.push(' *')
  out.push(' * Every value here is shared with the customer app and the driver app. Editing')
  out.push(' * this file changes web only, which is how the palette drifted apart the first')
  out.push(' * time. Edit the source and regenerate.')
  out.push(' */')
  out.push('')
  out.push(':root {')
  out.push('  /* Set explicitly so the browser paints form controls, scrollbars and autofill')
  out.push('     in light regardless of the OS setting. Without it, a customer in system-dark')
  out.push('     gets dark native inputs on a cream page. */')
  out.push('  color-scheme: light;')
  out.push('')
  for (const [key, value] of Object.entries(color)) {
    out.push(`  --${kebab(key)}: ${value.toLowerCase()};`)
  }
  out.push('')
  const heroStops = gradient.hero.map((stop) => stop.toLowerCase()).join(', ')
  out.push(`  --gradient-hero: linear-gradient(160deg, ${heroStops});`)
  out.push(`  --image-placeholder: ${gradient.imagePlaceholder.toLowerCase()};`)
  out.push('')
  for (const [key, px] of Object.entries(radius)) {
    out.push(`  --corner-${key}: ${rem(px)};`)
  }
  out.push('')
  for (const [key, value] of Object.entries(shadowCss)) {
    out.push(`  --elev-${key}: ${value};`)
  }
  out.push('')
  out.push(`  --ease: ${motion.easing};`)
  for (const [key, ms] of Object.entries(motion.duration)) {
    out.push(`  --duration-${key}: ${ms}ms;`)
  }
  out.push('}')
  out.push('')
  out.push('/* Tailwind v4 is CSS-first: @theme maps tokens onto utility names, so')
  out.push('   `bg-surface` and `text-ink-soft` work without a JS config file. */')
  out.push('@theme inline {')
  for (const key of Object.keys(color)) {
    out.push(`  --color-${kebab(key)}: var(--${kebab(key)});`)
  }
  out.push('')
  for (const [utility, step] of TAILWIND_RADIUS) {
    out.push(`  --radius-${utility}: var(--corner-${step});`)
  }
  out.push('')
  out.push('  --shadow-sm: var(--elev-sm);')
  out.push('  --shadow-md: var(--elev-base);')
  out.push('  --shadow-lg: var(--elev-lg);')
  out.push('  --shadow-brand: var(--elev-brand);')
  out.push('  --shadow-float: var(--elev-float);')
  out.push('}')
  out.push('')
  return out.join('\n')
}
