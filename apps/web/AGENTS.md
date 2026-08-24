<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Where data fetching goes

`src/services/*Service.ts` — **one file per backend module**, mirroring
`backend/internal/modules/*`. Never add a fetcher anywhere else, and never call
`fetch` outside `src/lib/api/client.ts`.

| Service | Backend module | Routes |
| --- | --- | --- |
| `CatalogService` | `catalog` | `/kitchens/*` |
| `PromotionService` | `promotion` | `/offers/*` |
| `IdentityService` | `identity` | `/auth/*` |
| `AddressService` | `identity` | `/addresses/*` |
| `OrderingService` | `ordering` | `/cart/*`, `/checkout`, `/orders/*` |

Reads called from server components are wrapped in React `cache`; mutations are
not, and must not be — `cache` is server-only and throws in the browser. Full
reasoning in `src/services/README.md`.

# Never hardcode a location

There is no ambient "current city". The delivery point comes from
`getDeliveryLocation()` (`src/lib/location.ts`), which reads a cookie and falls
back to `SERVING_AREAS[0]` with `isFallback: true` — and UI **must** distinguish
a fallback from a choice. The set of cities we serve is
`src/lib/serving-areas.ts`, not a string literal in a component.

Consequence to know before you add one: reading that cookie opts a route into
dynamic rendering. Keep the read inside a `<Suspense>` boundary so the static
shell — and the LCP element — still streams first.
