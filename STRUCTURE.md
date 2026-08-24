# Repository structure

```
cloud_kitchen/
├── backend/                Go API. Its own repository.
└── frontend/               This monorepo (npm workspaces).
    ├── apps/
    │   ├── web/            Next.js — customer web AND the kitchen dashboard
    │   ├── customer/       Expo — the customer app
    │   └── driver/         Expo — the rider app  (NOT YET CREATED)
    └── packages/
        └── core/           shared TypeScript  (NOT YET CREATED)
```

## Why three apps and not four

The **kitchen owner does not get a native app**, at least not for a long time, and
that is a deliberate saving rather than a gap.

A kitchen runs on a fixed tablet, on wifi, in one room. That is the ideal case for
a web app: instant deploys with no store review, no third native codebase, no
separate release process. Installed as a PWA it gets a home-screen icon and full
screen, which is the only part of "app-ness" a kitchen display actually needs.

Native buys a kitchen dashboard nothing. It costs an entire codebase.

The rider app is the opposite case and genuinely needs to be native: background
location, foreground-service notifications, battery and Doze behaviour, and
surviving being backgrounded for an hour. None of that is available to a web app,
and all of it is the rider app's core function.

## Order of work

1. `apps/web` — exists.
2. `apps/customer` — started. Proves the mobile stack against the real API.
3. `packages/core` — extract only when `apps/customer` genuinely needs the same
   code as `apps/web`. Extracting before there is a second consumer means guessing
   at the boundary, and a guessed boundary is worse than none.
4. `apps/driver` — build when there are riders to dispatch to. Its hard parts are
   background location and battery, not UI, so starting it early buys nothing.

## The kitchen dashboard lives in apps/web

Not a separate app. It shares the API client, the money formatting, the design
tokens and the auth flow with the customer web app. Splitting it out would
duplicate all four to gain a separate deploy nobody needs.
