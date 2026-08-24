import { describe, expect, it } from 'vitest'

import { renderCss } from '../css.ts'
import { color, radius } from '../index.ts'

const css = renderCss()

/** Pulls a custom property's value out of the generated `:root` block. */
function rootVar(name: string): string | undefined {
  const root = css.slice(css.indexOf(':root {'), css.indexOf('@theme inline'))
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(root)?.[1]?.trim()
}

/** Pulls a mapping out of the `@theme inline` block. */
function themeVar(name: string): string | undefined {
  const theme = css.slice(css.indexOf('@theme inline'))
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(theme)?.[1]?.trim()
}

/**
 * The generator, tested on the two things that would break silently.
 *
 * `check:tokens` already proves the checked-in file matches this output. What it
 * cannot prove is that the output is CORRECT — regenerate a wrong mapping and the
 * check goes green while every corner in the app reshapes.
 */
describe('the Tailwind radius mapping', () => {
  /*
    THE TRAP THIS GUARDS. The two apps had radius scales using the same numbers
    under different names, so `radius.lg` meant 16 in the app and 12 on web. The
    mapping table in css.ts is written out by hand rather than computed for exactly
    that reason — and a hand-written table is the kind that gets edited wrongly.

    These are the values web shipped BEFORE the token package existed. Any change
    here is a visual change to every rounded element on the site, so it should have
    to be deliberate enough to update a test.
  */
  const SHIPPED = {
    sm: '0.375rem', // 6px
    md: '0.5rem', //   8px
    lg: '0.75rem', // 12px
    xl: '1rem', //    16px
    '2xl': '1.25rem', // 20px
    '3xl': '1.75rem', // 28px
  } as const

  for (const [utility, expected] of Object.entries(SHIPPED)) {
    it(`rounded-${utility} still resolves to ${expected}`, () => {
      const step = themeVar(`radius-${utility}`)
      expect(step, `--radius-${utility} missing from @theme`).toBeDefined()
      // It maps to a --corner-* step; follow the indirection to the real value.
      const cornerName = /var\(--(corner-[a-z]+)\)/.exec(step!)?.[1]
      expect(cornerName, `--radius-${utility} should map to a --corner-* step`).toBeDefined()
      expect(rootVar(cornerName!)).toBe(expected)
    })
  }

  it('never emits the ladder under the names Tailwind owns', () => {
    /*
      The first version of this generator put the ladder in `:root` as `--radius-*`,
      colliding with Tailwind's own radius variables — so `var(--radius-sm)` meant
      8px in hand-written CSS while `rounded-sm` meant 6px in a class attribute.
      That is the same-name-different-value trap this package exists to remove,
      reintroduced one file later. Tailwind owns --radius-*; the ladder owns
      --corner-*; nothing owns both.
    */
    const root = css.slice(css.indexOf(':root {'), css.indexOf('@theme inline'))
    expect(root).not.toMatch(/--radius-/)
    for (const step of Object.keys(radius)) {
      expect(rootVar(`corner-${step}`)).toBeDefined()
    }
  })
})

describe('colour emission', () => {
  it('emits every colour token, none missed', () => {
    for (const key of Object.keys(color)) {
      const kebab = key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)
      expect(rootVar(kebab), `--${kebab} missing`).toBeDefined()
      expect(themeVar(`color-${kebab}`), `--color-${kebab} missing`).toBeDefined()
    }
  })

  it('uses the kebab-case names the app already had, so classes keep working', () => {
    // `bg-surface-sunk`, `text-ink-soft` and `bg-non-veg` exist across the web app.
    // A camelCase slip here would compile to no utility at all and the element
    // would simply render unstyled — no error, no warning.
    expect(rootVar('surface-sunk')).toBeDefined()
    expect(rootVar('ink-soft')).toBeDefined()
    expect(rootVar('non-veg')).toBeDefined()
    expect(rootVar('surfaceSunk')).toBeUndefined()
  })

  it('lowercases hex so the file is byte-stable across edits', () => {
    // The source mixes cases; the check is a byte comparison, so the generator must
    // normalise or the guard fails on a cosmetic change.
    const hexes = css.match(/#[0-9a-fA-F]{6}/g) ?? []
    expect(hexes.length).toBeGreaterThan(20)
    expect(hexes.filter((h) => h !== h.toLowerCase())).toEqual([])
  })

  it('keeps one green and one red, named separately', () => {
    // Deliberate: `success` equals `veg`, `danger` equals `nonVeg`. Two
    // near-identical greens is how a palette starts looking accidental.
    expect(color.success).toBe(color.veg)
    expect(color.danger).toBe(color.nonVeg)
  })
})

describe('the generated file', () => {
  it('says not to edit it, and where the source is', () => {
    // The only defence against someone tweaking a hex in the CSS and having it
    // silently reverted on the next regenerate.
    expect(css).toContain('DO NOT EDIT')
    expect(css).toContain('packages/tokens/src/index.ts')
  })

  it('is deterministic — same input, same bytes', () => {
    expect(renderCss()).toBe(css)
  })
})
