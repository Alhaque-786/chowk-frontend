# @chowk/tokens

The design tokens. One source of truth for the web app, the customer app, and the
driver app when it exists.

```ts
import { color, radius, space, motion, shadowNative } from '@chowk/tokens'
```

## Why this package exists

Measured, not assumed. The web app and the customer app each held their own copy of
the palette — one as CSS custom properties, one as a JS object transcribed by hand
from the other. **A day later, eleven of the nineteen shared colours had drifted:**

```
accent    web #c2681a   app #c2542c
veg       web #0a7a3d   app #1f7a4d
non-veg   web #9b2c2c   app #a6342b
ink       web #1c1a17   app #1c1917
...and seven more, plus six tokens the app simply lacked
```

Nothing failed. No test, no type, no reviewer — because **a palette drifting apart
looks like a design decision rather than a bug.** That silence is the whole
argument for a package.

## How each surface consumes it

| surface | how |
| --- | --- |
| customer app | imports the TypeScript directly |
| web | reads `apps/web/src/app/tokens.generated.css`, generated from this source |

```bash
npm run tokens        # regenerate the web stylesheet
npm run check:tokens  # exit 2 if the committed stylesheet is stale
npm run test          # unit tests for the generator
```

The generated CSS is **committed** so the web app needs no build step and no Node at
runtime. A committed generated file can go stale, which is why the check exists and
why CI runs it first — a stale palette fails in seconds rather than after a full
Next.js build.

## The naming trap this package was written to remove

The two apps had radius scales using **the same numbers under different names**:

```
          6px   8px  12px  16px  20px  28px
web        sm    md    lg    xl   2xl   3xl
app         —    sm    md    lg    xl     —
```

So `radius.lg` meant 16 in the app and 12 on web, and any value copied between them
arrived silently wrong by one step — invisible in review, because both sides read
correctly on their own.

The shared ladder is emitted as `--corner-*`, **not** `--radius-*`, because Tailwind
owns `--radius-*` for its utilities. The first version of the generator put the
ladder in `:root` under Tailwind's names and reintroduced exactly the same
same-name-different-value trap one file later. Tailwind owns `--radius-*`; the
ladder owns `--corner-*`; nothing owns both.

Every existing utility keeps its value: `rounded-lg` is still `0.75rem`.

## What is shared and what is not

**Shared:** colour, the corner ladder, the 4px spacing rhythm, durations, the
easing curve, the warm shadow tint, and the hero gradient stops.

**Not shared, deliberately:**

- **Shadows as a format.** CSS layers three stops per level; React Native takes one
  offset on iOS and ignores all of it on Android in favour of `elevation`. Both
  forms are exported, derived from one `rgb` triple. Pretending one format covers
  both would ship a worse shadow on both.
- **Springs.** `motion.spring` is app-only. A physical spring resolves over however
  long it needs; a CSS transition is a fixed duration along a curve. There is no
  translation.
- **Fonts.** They reference variables `next/font` generates at build time, so they
  stay in the web app's `globals.css`.
- **Tailwind's spacing scale.** Already a 4px rhythm. Generating CSS for `space`
  would produce a second set of names for the same numbers, which is the problem
  this package removes rather than one to add.

## Rules

- **Never edit `tokens.generated.css`.** Edit `src/index.ts` and regenerate. The
  generated file says so at the top.
- **The palette is light-only, deliberately.** Every major food app ships a light
  consumer surface, because warm food tones go muddy on a dark ground and
  photography that sells a biryani on paper reads as a nightclub menu on black. A
  dark variant would be a different design, not this one dimmed.
- **`success` equals `veg` and `danger` equals `nonVeg` on purpose.** One green and
  one red in the whole palette; two near-identical greens is how a palette starts
  looking accidental. They stay separately named so they can diverge in one line.
- **The veg/non-veg colours are regulated, not stylistic.** The FSSAI mark is a
  legal labelling requirement in India. They are not free to retune on aesthetic
  grounds.
