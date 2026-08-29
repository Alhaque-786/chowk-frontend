'use client'

import { Bike, ExternalLink, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import DeliveryService, { type Delivery } from '@/services/DeliveryService'
import TrackingService, { type LivePosition } from '@/services/TrackingService'
import dynamic from 'next/dynamic'
import { ApiError } from '@/lib/api/errors'

/**
 * Who is bringing the food, and when.
 *
 * THE ANSWER TO "WHERE IS MY FOOD" IS USUALLY A PHONE NUMBER, not a map. A moving
 * dot is the feature people ask for, but what actually resolves the situation is
 * being able to ring the person holding the bag — and that needs no rider app, no
 * location pipeline, and no map tiles. This is the ninety percent, built from an
 * endpoint that already existed and that the web had never once called.
 *
 * There is deliberately no map here yet. The delivery record carries no
 * coordinates at all: no rider app posts a position, and `rider.location_updated`
 * is declared in the contracts and never published. A map today could draw the
 * kitchen and the destination and a straight line between them, which looks like
 * live tracking and is not. Showing that would be worse than showing nothing,
 * because a customer would rely on it.
 *
 * Polls independently of the order, and stops once the delivery is terminal.
 */
/*
  The map is loaded only when one is actually drawn.

  next/dynamic rather than a plain import so MapLibre's JavaScript AND its
  stylesheet both split out of the orders route. Most people opening an order are
  reading a receipt, not watching a rider, and they should not download a mapping
  library to do it.

  ssr: false because maplibre-gl touches `window` at module scope and would fail
  server rendering outright.
*/
const DeliveryMap = dynamic(
  () => import('@/components/orders/delivery-map').then((m) => m.DeliveryMap),
  { ssr: false },
)

const POLL_MS = 20_000
/*
  The rider moves; his name does not.

  Position is polled four times as often as the delivery record, because they
  change at completely different rates. One interval for both would mean either
  re-fetching static fields every ten seconds or letting the dot lag half a
  minute behind — a dot that stale is worse than none, since the customer plans
  around it.
*/
const POSITION_POLL_MS = 10_000

export function RiderCard({
  orderId,
  kitchen,
  destination,
}: {
  orderId: string
  kitchen?: { lat: number; lng: number }
  destination?: { lat: number; lng: number }
}) {
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [position, setPosition] = useState<LivePosition | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const next = await DeliveryService.forOrder(orderId, { signal: controller.signal })
        setDelivery(next)
        // Nothing more will change. Polling a delivered order forever is a request
        // per twenty seconds, per open tab, for an answer that is already final.
        if (next.status === 'delivered' || next.status === 'cancelled' || next.status === 'failed') {
          clearInterval(timer)
        }
      } catch (err) {
        /*
          A 404 is the NORMAL state, not a failure: the kitchen is still cooking
          and no rider has been assigned. Rendering an error for it would put
          "something went wrong" on a page where nothing has.
        */
        if (err instanceof ApiError && err.status === 404) {
          setDelivery(null)
          return
        }
        // Anything else is also silent. This is supporting detail; the order page
        // above it is the thing that matters, and it has its own error handling.
      }
    }

    // The interval is created before the first load, so `load` can clear it once
    // the delivery reaches a state that will not change again. `load` is a hoisted
    // declaration and only ever runs after this line, so the reference is safe.
    const timer = setInterval(() => void load(), POLL_MS)
    void load()

    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [orderId])

  /*
    Poll the position only while somebody is actually carrying the food.

    Gated on the delivery status rather than run unconditionally: before pickup
    there is nothing to draw, and after delivery the API refuses anyway. Polling
    through both would be a request every ten seconds, per open tab, for a
    guaranteed 204.
  */
  const carrying = delivery?.status === 'picked_up' || delivery?.status === 'at_pickup'

  useEffect(() => {
    // No cleanup of stale state here: clearing it would be a setState inside an
    // effect, which is the pattern react-hooks/set-state-in-effect exists to
    // catch. The render below gates on `carrying` as well as on `position`, so a
    // position left over from before a drop is never drawn.
    if (!carrying) return

    const controller = new AbortController()

    async function load() {
      try {
        setPosition(await TrackingService.position(orderId, { signal: controller.signal }))
      } catch {
        // Silent, and the dot simply stops updating. A failed position read is
        // not worth an error on a page whose useful parts — status, ETA, the
        // rider's number — are all still correct.
      }
    }

    const timer = setInterval(() => void load(), POSITION_POLL_MS)
    void load()
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [orderId, carrying])

  // Nothing assigned yet, or nothing worth saying. The order timeline above
  // already tells the customer the kitchen is cooking.
  if (!delivery) return null
  if (delivery.status === 'requested') return null

  const eta = formatETA(delivery.drop_eta)
  const onTheWay = delivery.status === 'picked_up'

  return (
    <section
      aria-labelledby="rider-heading"
      className="mt-6 rounded-2xl border border-rule bg-surface p-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft">
          <Bike className="size-5 text-brand" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 id="rider-heading" className="text-sm font-semibold text-ink">
            {headline(delivery)}
          </h2>

          {delivery.rider_name && (
            <p className="mt-0.5 text-sm text-ink-soft">
              {delivery.rider_name}
              {eta && onTheWay ? ` · arriving around ${eta}` : eta ? ` · ETA ${eta}` : ''}
            </p>
          )}

          {/* No ETA is stated as no ETA. An invented one is worse than none: the
              customer plans around it and we are the reason they were wrong. */}
          {!delivery.rider_name && eta && (
            <p className="mt-0.5 text-sm text-ink-soft">Arriving around {eta}</p>
          )}

          {delivery.status === 'failed' && delivery.failure_reason && (
            <p className="mt-1 text-sm text-danger">{delivery.failure_reason}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {delivery.rider_phone && (
              <a
                href={`tel:${delivery.rider_phone}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-soft px-3 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft/70"
              >
                <Phone className="size-4" aria-hidden="true" />
                Call {delivery.rider_name ?? 'rider'}
              </a>
            )}

            {/* The provider's own tracking page, when they give us one. We do not
                have a map of our own and this is honest about whose it is. */}
            {delivery.tracking_url && (
              <a
                href={delivery.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rule-strong px-3 text-sm font-semibold text-ink-soft transition-colors hover:border-brand/50"
              >
                Track on map
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/*
        The map appears only once there is a rider position to put on it. A map
        showing two static pins and no rider looks like tracking that has broken,
        rather than a delivery that has not started.
      */}
      {carrying && position && (
        <>
          <DeliveryMap kitchen={kitchen} destination={destination} rider={position} />
          <p className="mt-2 text-xs text-ink-faint">
            Rider position as of {formatETA(position.recorded_at)}. Updates every few seconds.
          </p>
        </>
      )}
    </section>
  )
}

function headline(d: Delivery): string {
  switch (d.status) {
    case 'assigned':
      return 'A rider is on the way to the kitchen'
    case 'at_pickup':
      return 'Your rider is collecting the order'
    case 'picked_up':
      return 'On the way to you'
    case 'delivered':
      return 'Delivered'
    case 'cancelled':
      return 'Delivery cancelled'
    case 'failed':
      return 'We could not complete the delivery'
    default:
      return 'Arranging a rider'
  }
}

/**
 * A time, in the form somebody would say it.
 *
 * Local time rather than "in 18 minutes", because a countdown that is wrong is
 * obviously wrong every second it is on screen, and these estimates come from a
 * third party and move.
 */
function formatETA(iso?: string): string | null {
  if (!iso) return null
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null
  return at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}
