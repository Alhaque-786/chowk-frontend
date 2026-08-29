'use client'

import { useEffect, useRef } from 'react'
// MapLibre's own stylesheet. Required, not cosmetic: without it markers are
// positioned by the browser's default flow rather than by the map, so the rider
// dot and both pins detach from the places they are meant to mark.
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { LivePosition } from '@/services/TrackingService'

/**
 * Where the food is coming from, where it is going, and where the rider is.
 *
 * MAPLIBRE, NOT GOOGLE. It is free, needs no API key and bills nothing per load,
 * which for a platform competing on taking a smaller cut is the whole argument. It
 * also removes a class of outage: no key to expire, no quota to exceed on a busy
 * evening.
 *
 * TILES ARE THE PART TO WATCH. The default below is OpenStreetMap's own raster
 * service, which is free and explicitly NOT for heavy or commercial use — their
 * tile usage policy asks people at any real volume to self-host or use a provider.
 * It is right for development and wrong at launch, so the URL is configurable and
 * this comment is the reminder. Attribution is required either way and is rendered
 * below, not optional.
 *
 * Imported dynamically because maplibre-gl touches `window` at module scope and
 * would break server rendering outright.
 */
const TILES =
  process.env.NEXT_PUBLIC_MAP_TILES_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? '© OpenStreetMap contributors'

type Point = { lat: number; lng: number }

export function DeliveryMap({
  kitchen,
  destination,
  rider,
}: {
  kitchen?: Point
  destination?: Point
  rider: LivePosition | null
}) {
  const container = useRef<HTMLDivElement | null>(null)
  // Kept outside React state on purpose: these are imperative map objects, and
  // putting them in state would re-render the tree on every rider update to
  // change something React does not own.
  const map = useRef<MapLibreMap | null>(null)
  const riderMarker = useRef<Marker | null>(null)

  // --- create the map once -------------------------------------------------
  useEffect(() => {
    if (!container.current) return
    let cancelled = false
    let created: MapLibreMap | null = null

    void (async () => {
      const { Map: MapCtor, Marker: MarkerCtor, Popup } = await import('maplibre-gl')
      // The component may have unmounted while the chunk was downloading — a real
      // case on a slow connection, where the customer navigates away mid-load.
      if (cancelled || !container.current) return

      created = new MapCtor({
        container: container.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: [TILES],
              tileSize: 256,
              attribution: ATTRIBUTION,
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        center: [destination?.lng ?? kitchen?.lng ?? 80.9462, destination?.lat ?? kitchen?.lat ?? 26.8467],
        zoom: 13,
        // A map that pans under a finger scrolling past it is a map that traps
        // the page. Dragging still works; the wheel does not hijack.
        scrollZoom: false,
        attributionControl: { compact: true },
      })
      map.current = created

      if (kitchen) pin(MarkerCtor, Popup, created, kitchen, '#8A8A8A', 'Kitchen')
      if (destination) pin(MarkerCtor, Popup, created, destination, '#C1440E', 'Your address')

      // Both ends visible from the first frame, so the customer can see the whole
      // journey rather than a zoomed-in view of one end of it.
      if (kitchen && destination) {
        created.fitBounds(
          [
            [Math.min(kitchen.lng, destination.lng), Math.min(kitchen.lat, destination.lat)],
            [Math.max(kitchen.lng, destination.lng), Math.max(kitchen.lat, destination.lat)],
          ],
          { padding: 56, animate: false, maxZoom: 15 },
        )
      }
    })()

    return () => {
      cancelled = true
      created?.remove()
      map.current = null
      riderMarker.current = null
    }
  }, [kitchen, destination])

  // --- move the rider, without rebuilding anything -------------------------
  useEffect(() => {
    const current = map.current
    if (!current || !rider) return
    let cancelled = false

    void (async () => {
      const { Marker: MarkerCtor } = await import('maplibre-gl')
      if (cancelled || !map.current) return

      const at: [number, number] = [rider.longitude, rider.latitude]
      if (riderMarker.current) {
        // Moved rather than recreated: replacing the marker each poll makes the
        // rider blink out and back rather than travel.
        riderMarker.current.setLngLat(at)
        return
      }

      const el = document.createElement('div')
      el.className = 'delivery-map-rider'
      el.setAttribute('aria-hidden', 'true')
      riderMarker.current = new MarkerCtor({ element: el }).setLngLat(at).addTo(map.current)
    })()

    return () => {
      cancelled = true
    }
  }, [rider])

  return (
    <div
      ref={container}
      className="mt-3 h-56 w-full overflow-hidden rounded-xl bg-surface-sunk sm:h-64"
      // The map is decoration for a screen reader: everything it shows is stated
      // in text above it — who the rider is, how far along, when he will arrive.
      // Announcing an unlabelled canvas would add noise and no information.
      role="presentation"
    />
  )
}

function pin(
  MarkerCtor: typeof Marker,
  PopupCtor: typeof import('maplibre-gl').Popup,
  map: MapLibreMap,
  at: Point,
  colour: string,
  label: string,
) {
  new MarkerCtor({ color: colour })
    .setLngLat([at.lng, at.lat])
    .setPopup(new PopupCtor({ offset: 24 }).setText(label))
    .addTo(map)
}
