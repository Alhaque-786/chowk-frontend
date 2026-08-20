# Cloud Kitchen — Frontend

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4

Scaffolded only. The backend architecture came first deliberately — the API
contract shapes the frontend, not the other way round.

## Why Next.js

Menu pages must be indexable by Google: organic search is how a cloud kitchen
gets orders without paying Zomato's commission, which is the entire point of
building this. That rules out a client-only SPA. Server components also let the
menu render from the API without shipping the fetching logic to the browser.

## Planned structure

Three distinct surfaces, one codebase — they share the API client, design
tokens, and auth handling, so splitting them into separate repos would mean
maintaining three copies of all three.

```
src/app/
  (customer)/        browse kitchens, menu, cart, checkout, order tracking
  (kitchen)/         staff app: live order queue, mark preparing/ready, stock
  (admin)/           dashboard: menus, inventory, users, reports, settlements
  api/               route handlers — BFF only (cookie handling, webhook proxy)
src/lib/
  api/               generated/typed client for the Go backend
  auth/              token storage, refresh-on-401 interceptor
src/components/
  ui/                primitives
  domain/            MenuItemCard, OrderStatusTimeline, KitchenHours…
```

Route groups rather than separate apps because the three surfaces have very
different layouts and auth requirements but identical data contracts.

## Setup

```bash
npm install
npm run dev     # http://localhost:3000
```

Point it at the backend:

```bash
echo 'NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1' > .env.local
```

The backend's `CORS_ALLOWED_ORIGINS` already permits `http://localhost:3000`.

## Notes for whoever builds this

- The API returns one envelope for everything: `{ data }` or
  `{ error: { code, message, fields, trace_id } }`. Write **one** client and
  **one** error handler. `error.fields` maps directly onto form field errors.
- Branch on `error.code`, never on `error.message` — messages are copy and will
  change.
- Access tokens live 15 minutes. Implement a refresh-on-401 interceptor once, in
  the client. Refresh tokens are single-use and rotate; a `TOKEN_REUSE_DETECTED`
  response means force a full re-login, not a retry.
- Money arrives as integer paise (`total_minor: 24999`). Format at the render
  edge; never do arithmetic on it in floats.
- Send an `Idempotency-Key` header on checkout. Mobile networks retry, and
  without it a retry is a second order.
