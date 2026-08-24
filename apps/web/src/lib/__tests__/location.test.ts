import { describe, expect, it } from 'vitest'

import { encodeLocation, fallbackLocation, parseLocation } from '../location'
import { DEFAULT_AREA } from '../serving-areas'

/**
 * The location cookie, tested because it is UNTRUSTED INPUT.
 *
 * It is not httpOnly — client components read the label to render the picker — so
 * anyone can put anything in it. The parsed values go straight into the `lat`/`lng`
 * query parameters of the most important request the page makes, and a NaN there is
 * a 400 on the kitchen list. "Falls back rather than passing junk to the API" is a
 * security property, not a nicety.
 */
describe('parseLocation', () => {
  it('round-trips a real location', () => {
    const encoded = encodeLocation(26.85, 80.947, 'Hazratganj')
    const parsed = parseLocation(encoded)
    expect(parsed).toEqual({ lat: 26.85, lng: 80.947, label: 'Hazratganj', isFallback: false })
  })

  it('never reports a parsed location as a fallback', () => {
    // The whole point of the flag: a choice must not be shown with the same
    // confidence as a guess, or someone in Kanpur browses Lucknow for ten minutes.
    expect(parseLocation(encodeLocation(26.85, 80.947, 'X'))?.isFallback).toBe(false)
    expect(fallbackLocation().isFallback).toBe(true)
  })

  it('keeps a label containing the delimiter', () => {
    // `|` was chosen over `,` because labels contain commas — but a label can
    // contain a pipe too, and the parser rejoins the remainder for that reason.
    const parsed = parseLocation('26.85000|80.94700|Flat 3 | Gomti Nagar')
    expect(parsed?.label).toBe('Flat 3 | Gomti Nagar')
  })

  it('rejects non-numeric coordinates instead of yielding NaN', () => {
    expect(parseLocation('abc|80.947|X')).toBeNull()
    expect(parseLocation('26.85|xyz|X')).toBeNull()
    expect(parseLocation('|,|X')).toBeNull()
  })

  it('rejects coordinates outside real bounds', () => {
    expect(parseLocation('91|80.947|X')).toBeNull()
    expect(parseLocation('-91|80.947|X')).toBeNull()
    expect(parseLocation('26.85|181|X')).toBeNull()
    expect(parseLocation('26.85|-181|X')).toBeNull()
    // The edges themselves are valid.
    expect(parseLocation('90|180|X')).not.toBeNull()
    expect(parseLocation('-90|-180|X')).not.toBeNull()
  })

  it('rejects Infinity, which is finite-looking to a naive check', () => {
    // `Number('Infinity')` is a number and passes a `typeof` test. Only
    // Number.isFinite catches it, and an Infinity in a query parameter is a 400.
    expect(parseLocation('Infinity|80.947|X')).toBeNull()
    expect(parseLocation('26.85|-Infinity|X')).toBeNull()
  })

  it('rejects an empty or absurd label', () => {
    expect(parseLocation('26.85|80.947|')).toBeNull()
    expect(parseLocation('26.85|80.947|   ')).toBeNull()
    // A 120-char cap, so a hostile cookie cannot push a paragraph into the header.
    expect(parseLocation(`26.85|80.947|${'a'.repeat(121)}`)).toBeNull()
    expect(parseLocation(`26.85|80.947|${'a'.repeat(120)}`)).not.toBeNull()
  })

  it('rejects a truncated cookie', () => {
    expect(parseLocation('')).toBeNull()
    expect(parseLocation('26.85')).toBeNull()
    expect(parseLocation('26.85|80.947')).toBeNull()
  })
})

describe('fallbackLocation', () => {
  it('uses the first serving area, not a separately declared default', () => {
    // If these two could drift, the launch city shown in the UI and the coordinates
    // searched against would disagree — a bug that renders as "no kitchens nearby".
    const fallback = fallbackLocation()
    expect(fallback.lat).toBe(DEFAULT_AREA.lat)
    expect(fallback.lng).toBe(DEFAULT_AREA.lng)
    expect(fallback.label).toBe(DEFAULT_AREA.city)
  })
})
