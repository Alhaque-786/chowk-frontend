# Services

One file per **backend module**, mirroring `backend/internal/modules/*`. A
`SomethingService` here is the frontend's view of exactly one bounded context
there, and it owns every call into that context's routes.

## Why this shape

The alternative — one `queries.ts` holding every fetcher — is what this replaced,
and it fails in a specific way: there is nothing to tell you where a new call
belongs, so the file accumulates until it is the only place anyone looks and
every feature imports all of it. Splitting by backend module gives the answer for
free. A new coupon call goes in `PromotionService` because coupons live in the
promotion module; no judgement required, no debate in review.

It also keeps the seam honest. The backend is a modular monolith that is meant to
be splittable into services later, and when `promotion` becomes its own
deployment the only frontend file that changes base URL is `PromotionService.ts`.
A shared `queries.ts` would have to be picked apart by hand.

## Conventions

- **Default-export an object literal** of async methods. Matches the pattern used
  across `weavestream/src/services`, so the two codebases read the same way.
- **`client.ts` is the only transport.** No service calls `fetch` directly —
  auth headers, token refresh, error envelopes and idempotency all live in the
  client, and a service that bypasses it silently loses all four.
- **Reads called from server components are wrapped in React `cache`.** That is
  request-scoped deduplication, not caching: `generateMetadata` and the page body
  both need the same kitchen, and without it every such page fetches twice.
  HTTP-level cache lifetime is the `revalidate` option per call.
- **Mutations are never `cache`-wrapped**, and live in the services called from
  client components (`OrderingService`, `IdentityService`, `AddressService`).
  `cache` is a server-only API; calling it in a client component throws.
- **Degrade or throw, deliberately, per method.** Documented at each call site:
  a missing offers rail is not an error, but a missing menu is.
