# Chowk — Frontend

npm workspaces · Next.js 16 · Expo SDK 57 · TypeScript

Three surfaces and one shared palette, in one repository:

```
apps/web/          Next.js — customer web + the kitchen dashboard
apps/customer/     Expo — the customer app (iOS + Android)
packages/tokens/   the design tokens, shared by both
```

`apps/driver/` will join this when there are riders to dispatch to. It is
deliberately absent rather than scaffolded empty.

**Read [`STRUCTURE.md`](STRUCTURE.md)** for why the layout is what it is. This file
is how to run it.

---

## Quick start

```bash
npm install          # once, at the ROOT — workspaces resolve from here
npm run web          # Next.js on http://localhost:3000
npm run customer     # Expo dev server; press i for the iOS simulator
```

The backend is a separate repository. Start it first, or the app shows its
"could not reach the API" screen with the URL it tried — which is deliberate, and
usually tells you the answer.

## Checks

```bash
npm run check        # tokens + typecheck + lint + test, everything CI runs
npm run test         # tests only
npm run tokens       # regenerate the web stylesheet from packages/tokens
npm run check:tokens # fail if that stylesheet is stale
```

`npm run check` is the same sequence as CI, so a green local run is a green
pipeline.

---

## One repository, three apps

Because they share code. `packages/tokens` is imported by the web app and the
mobile app, and a palette split across two repositories drifts — this one did,
measurably: eleven of nineteen shared colours diverged within a day of being
duplicated. One repository means the change and its regeneration are the same
commit.

CI is **path-filtered**, so touching the mobile app does not run a Next.js build:

| you change | web job | app job |
| --- | --- | --- |
| `apps/web/**` | runs | skipped |
| `apps/customer/**` | skipped | runs |
| `packages/**` | **runs** | **runs** |

A consequence worth knowing: **a green tick can mean "nothing relevant changed"**
rather than "everything passed". That is the point of path filtering — a README
commit should not run a build — but when you want to know whether a change was
actually verified, read the job list rather than the run status.

---

## The design tokens are generated, not written twice

`packages/tokens/src/index.ts` is the source. The web app reads
`apps/web/src/app/tokens.generated.css`, which is produced from it and committed —
so the web app needs no build step and no Node at runtime.

Committed generated files go stale, so `npm run check:tokens` regenerates and
diffs, and exits non-zero when they disagree. Edit the source and regenerate;
never edit the CSS.

The mobile app imports the TypeScript directly. There is no second copy.

---

## Conventions that are not optional

- **`npm install` at the root, never inside an app.** Workspaces hoist to the
  root; installing inside `apps/customer` creates a second `node_modules` and two
  copies of React, which fails at runtime as "Invalid hook call" — a symptom that
  looks nothing like its cause.
- **Never edit `tokens.generated.css`.** Edit `packages/tokens` and run
  `npm run tokens`.
- **No colour literals in app code.** Import from `@chowk/tokens`. The web app has
  Tailwind utilities generated from the same values.
- **Metro's hierarchical lookup stays ON.** See the comment in
  `apps/customer/metro.config.js` — disabling it is pnpm advice that breaks any
  dependency shipping nested `node_modules`, and Reanimated is one.
