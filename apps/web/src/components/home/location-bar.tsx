'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Crosshair, Home, MapPin, Search } from 'lucide-react'
import Link from 'next/link'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { SERVING_AREAS } from '@/lib/serving-areas'
import { chooseServingArea, choosePreciseLocation } from '@/app/actions/location'
import AddressService from '@/services/AddressService'
import IdentityService from '@/services/IdentityService'
import type { Address } from '@/lib/api/types'
import { cn } from '@/lib/cn'

/**
 * Delivery location + search, the two controls above everything else.
 *
 * Location is first because it decides whether ANY of the page below is relevant
 * — a beautiful list of kitchens that do not deliver to you is worse than no
 * list. Every food app puts it here for that reason.
 *
 * This replaced a placeholder that displayed a hardcoded city and did nothing
 * when tapped. It now offers the three sources a delivery location can actually
 * come from, in order of how well each one identifies a doorstep:
 *
 *   1. A SAVED ADDRESS. Best, because it has a door number and a landmark. Only
 *      fetched when signed in, and only when the sheet opens.
 *   2. BROWSER GEOLOCATION. Good coordinates, no address. Requested on tap and
 *      never on page load — a permission prompt nobody asked for is the fastest
 *      way to get permanently denied.
 *   3. A SERVING AREA. The fallback that always works, including on a desktop
 *      that refuses geolocation.
 *
 * No reverse geocoding: there is no geocoding provider wired up, so "Current
 * location" is labelled honestly rather than shown as a guessed street name.
 * Adding a provider upgrades the label and changes nothing else here.
 */
export function LocationBar({
  label,
  isFallback,
}: {
  /** The active location's display name, resolved on the server. */
  label: string
  /** True when this is the launch-city default and not the customer's choice. */
  isFallback: boolean
}) {
  const [picking, setPicking] = useState(false)
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  // useTransition, so the sheet can show the action as pending. Server Functions
  // re-render the route, and without this the UI is frozen with no explanation
  // for the duration of that round trip.
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  /**
   * Loads saved addresses when the sheet opens, not on mount.
   *
   * On mount would mean an authenticated API call on every home-page view for a
   * panel most visitors never open. Failure is swallowed: the picker still works
   * via the other two routes, and an error banner for a list that is merely a
   * convenience would be noise.
   */
  function openPicker() {
    setPicking(true)
    if (addresses === null && IdentityService.isSignedIn()) {
      AddressService.list()
        .then(setAddresses)
        .catch(() => setAddresses([]))
    }
  }

  function useCurrentLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('This browser cannot share your location. Pick a city instead.')
      return
    }

    setGeoError(null)
    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        const { latitude, longitude } = position.coords
        startTransition(async () => {
          await choosePreciseLocation(latitude, longitude, 'Current location')
          setPicking(false)
          // The action revalidates on the server; this pulls the new render.
          router.refresh()
        })
      },
      (error) => {
        setLocating(false)
        // Distinguished, because the fix differs. "Denied" needs browser
        // settings; "unavailable" is usually a laptop with no GPS and the answer
        // is to pick a city. One generic message would leave both stuck.
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission is off. Turn it on in your browser, or pick a city below.'
            : 'Could not get your location just now. Pick a city below.',
        )
      },
      // 10s is long enough for a cold GPS fix; maximumAge accepts a recent one
      // rather than forcing a new lock for a delivery-area decision.
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  }

  function pickArea(slug: string) {
    startTransition(async () => {
      await chooseServingArea(slug)
      setPicking(false)
      router.refresh()
    })
  }

  function pickAddress(address: Address) {
    startTransition(async () => {
      await choosePreciseLocation(
        address.latitude,
        address.longitude,
        address.label || address.line1,
      )
      setPicking(false)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openPicker}
          className="group flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left"
        >
          <MapPin className="size-4 shrink-0 text-brand" />
          <span className="min-w-0">
            <span className="block text-[0.6875rem] font-medium uppercase tracking-wider text-ink-faint">
              {/* The wording carries the distinction: a guess is never presented
                  as the customer's choice. */}
              {isFallback ? 'Showing' : 'Deliver to'}
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold text-ink">
              <span className="truncate">{label}</span>
              <ChevronDown className="size-3.5 shrink-0 text-ink-faint transition-transform group-hover:translate-y-px" />
            </span>
          </span>
        </button>

        {isFallback && (
          <button
            type="button"
            onClick={openPicker}
            className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent ring-1 ring-accent/20"
          >
            Set your location
          </button>
        )}
      </div>

      {/* Search is a LINK, not an input, so the home page ships no search
          JavaScript. The real input lives on /search and gets focus on arrival —
          the interaction feels identical and the home page stays light. */}
      <Link
        href="/search"
        className="mt-3 flex items-center gap-2.5 rounded-xl border border-rule-strong bg-surface px-3.5 py-3 text-sm text-ink-faint transition-colors hover:border-brand/40"
      >
        <Search className="size-4 shrink-0" />
        <span>Search for biryani, dosa, thali…</span>
      </Link>

      <Sheet
        open={picking}
        onOpenChange={setPicking}
        title="Where should we deliver?"
        description="We use this to show kitchens that actually reach you."
      >
        <div className="flex flex-col gap-4">
          <Button
            variant="secondary"
            fullWidth
            onClick={useCurrentLocation}
            disabled={locating || pending}
          >
            <Crosshair className={cn('size-4', locating && 'animate-spin')} />
            {locating ? 'Finding you…' : 'Use my current location'}
          </Button>

          {geoError && (
            <p
              className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger"
              // Announced: the customer tapped a button and the outcome is a
              // message elsewhere on screen.
              role="status"
            >
              {geoError}
            </p>
          )}

          {addresses !== null && addresses.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Your saved addresses
              </p>
              <ul className="flex flex-col gap-1.5">
                {addresses.map((address) => (
                  <li key={address.id}>
                    <button
                      type="button"
                      onClick={() => pickAddress(address)}
                      disabled={pending}
                      className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left ring-1 ring-rule transition-colors hover:bg-surface-sunk disabled:opacity-50"
                    >
                      <Home className="mt-0.5 size-4 shrink-0 text-brand" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {address.label || address.line1}
                        </span>
                        <span className="block truncate text-xs text-ink-soft">
                          {address.line1}, {address.city} {address.pincode}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
              {/* Plural-aware. "Cities we deliver in" above a list of one reads
                  as a bug, and it will be a list of one for a while. */}
              {SERVING_AREAS.length === 1
                ? 'The city we deliver in'
                : 'Cities we deliver in'}
            </p>
            <ul className="flex flex-col gap-1.5">
              {SERVING_AREAS.map((area) => {
                const active = !isFallback && label === area.city
                return (
                  <li key={area.slug}>
                    <button
                      type="button"
                      onClick={() => pickArea(area.slug)}
                      disabled={pending}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left ring-1 transition-colors disabled:opacity-50',
                        active
                          ? 'bg-brand-soft ring-brand/25'
                          : 'ring-rule hover:bg-surface-sunk',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {area.city}
                        </span>
                        <span className="block truncate text-xs text-ink-soft">
                          {area.state}
                        </span>
                      </span>
                      {active && <Check className="size-4 shrink-0 text-brand" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <p className="text-sm leading-relaxed text-ink-soft">
            More cities as kitchens sign up. If we are not in yours yet, that is
            supply, not interest.
          </p>
        </div>
      </Sheet>
    </>
  )
}
