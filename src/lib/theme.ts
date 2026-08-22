/**
 * The ground colour, duplicated from globals.css.
 *
 * Duplicated because it has to be: the browser reads `theme-color` from a meta
 * tag before any stylesheet is parsed, so it cannot reference a CSS variable.
 * Keeping it here — named, next to the reason — means a palette change has
 * exactly one other place to update, rather than a raw hex buried in layout.tsx
 * that nobody connects to the tokens.
 *
 * This colour paints the browser chrome on mobile, so a mismatch shows up as a
 * visible seam above the page.
 */
export const THEME_GROUND = '#FAF6EF'
