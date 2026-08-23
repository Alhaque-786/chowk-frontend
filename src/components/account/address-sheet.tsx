'use client'

import { useState } from 'react'
import { Crosshair, Loader2 } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ApiError, messageFor } from '@/lib/api/errors'
import { LOCATION_COOKIE } from '@/lib/location'
import AddressService from '@/services/AddressService'
import { cn } from '@/lib/cn'
import type { Address } from '@/lib/api/types'

/** The three types the API accepts, with the labels a person would use. */
const TYPES = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
] as const

/**
 * Add or edit a delivery address.
 *
 * THE HARD PART IS COORDINATES, not the form. The API requires a real latitude and
 * longitude — there is a CHECK constraint rejecting (0, 0) precisely so nobody
 * submits a placeholder — and there is no geocoder wired up, so a pincode cannot
 * be turned into a point.
 *
 * So the coordinates come from one of two honest sources, in this order:
 *
 *   1. The delivery location already chosen in the header, read from its cookie.
 *      Approximate, and good enough: it is the area the customer said they are in.
 *   2. Browser geolocation, offered as "use my exact location" for precision.
 *      Requested on tap and never on open — an unprompted permission dialog is
 *      the fastest route to a permanent denial.
 *
 * What it does NOT do is invent a point or send zeroes, which is what makes the
 * constraint worth having. Whichever source was used is stated on screen, because
 * a delivery address whose accuracy the customer cannot judge is worse than one
 * they know is approximate.
 *
 * Server field errors are attached to the inputs rather than shown as a banner —
 * `ApiError.fieldErrors` exists for exactly this, and "pincode must be 6 digits"
 * belongs beside the pincode.
 */
export function AddressSheet({
  open,
  onOpenChange,
  onSaved,
  existing,
  /** True when this is the customer's first address, so it becomes the default. */
  makeDefault,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (address: Address) => void
  /** Present when editing. Absent when adding. */
  existing?: Address
  makeDefault?: boolean
}) {
  const [type, setType] = useState<string>(existing?.type ?? 'home')
  const [label, setLabel] = useState(existing?.label ?? '')
  const [line1, setLine1] = useState(existing?.line1 ?? '')
  const [line2, setLine2] = useState(existing?.line2 ?? '')
  const [landmark, setLandmark] = useState(existing?.landmark ?? '')
  const [city, setCity] = useState(existing?.city ?? '')
  const [state, setState] = useState(existing?.state ?? '')
  const [pincode, setPincode] = useState(existing?.pincode ?? '')
  const [receiverName, setReceiverName] = useState(existing?.receiver_name ?? '')
  const [receiverPhone, setReceiverPhone] = useState(existing?.receiver_phone ?? '')

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    existing ? { lat: existing.latitude, lng: existing.longitude } : readAreaFromCookie(),
  )
  const [precise, setPrecise] = useState(Boolean(existing))
  const [locating, setLocating] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  function useExactLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('This browser cannot share your location. The area above will be used.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        setPrecise(true)
        setLocating(false)
      },
      () => {
        setLocating(false)
        setError('Could not get your exact location. The area above will be used.')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  async function save() {
    if (!coords) {
      // Cannot happen through the UI — the cookie always has a fallback area —
      // but sending zeroes would trip a database constraint and surface as an
      // opaque 500, so it is refused here with something readable.
      setError('Pick a location first, or set your delivery area at the top of the page.')
      return
    }

    setBusy(true)
    setError(null)
    setFields({})
    try {
      const payload = {
        type: type as Address['type'],
        label: label.trim(),
        line1: line1.trim(),
        line2: line2.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        is_default: makeDefault ?? existing?.is_default ?? false,
        receiver_name: receiverName.trim(),
        receiver_phone: receiverPhone.trim(),
      }
      const saved = existing
        ? await AddressService.update(existing.id, payload)
        : await AddressService.create(payload)
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      // Field errors go on the fields; only what is left over becomes a banner.
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFields(err.fieldErrors)
        setError(null)
      } else {
        setError(messageFor(err, 'Could not save that address.'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? 'Edit address' : 'Add a delivery address'}
      description="The rider sees this, so a landmark helps more than a perfect line one."
      footer={
        <Button fullWidth size="lg" disabled={busy} onClick={save}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {existing ? 'Save changes' : 'Save address'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <fieldset className="border-0 p-0">
          <legend className="mb-2 text-sm font-medium text-ink">
            What is this address?
          </legend>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <label
                key={t.value}
                className={cn(
                  'flex-1 cursor-pointer rounded-xl px-3 py-2.5 text-center text-sm font-semibold ring-1 transition-colors',
                  type === t.value
                    ? 'bg-brand-soft text-brand ring-brand/30'
                    : 'text-ink-soft ring-rule hover:bg-surface-sunk',
                )}
              >
                <input
                  type="radio"
                  name="address-type"
                  value={t.value}
                  checked={type === t.value}
                  onChange={() => setType(t.value)}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          label="Flat, house or building"
          value={line1}
          onChange={setLine1}
          error={fields.line1}
          required
          autoFocus
        />
        <Field label="Street or area" value={line2} onChange={setLine2} />
        <Field
          label="Landmark"
          hint="What the rider will actually look for"
          value={landmark}
          onChange={setLandmark}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="City" value={city} onChange={setCity} error={fields.city} required />
          <Field
            label="Pincode"
            value={pincode}
            onChange={(v) => setPincode(v.replace(/\D/g, '').slice(0, 6))}
            error={fields.pincode}
            required
            numeric
          />
        </div>
        <Field label="State" value={state} onChange={setState} />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Receiver name"
            hint="If it is not you"
            value={receiverName}
            onChange={setReceiverName}
          />
          <Field
            label="Receiver phone"
            value={receiverPhone}
            onChange={setReceiverPhone}
            numeric
          />
        </div>

        <Field
          label="Nickname"
          hint="Shown in your list, like “Mum’s place”"
          value={label}
          onChange={setLabel}
        />

        {/*
          The coordinate state, stated rather than hidden. A delivery address whose
          accuracy the customer cannot judge is worse than one they know is
          approximate.
        */}
        <div className="rounded-xl bg-surface-sunk px-3.5 py-3">
          <p className="text-sm font-medium text-ink">
            {precise ? 'Using your exact location' : 'Using your delivery area'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
            {precise
              ? 'Pinned to where you are now, so the rider gets close.'
              : 'Accurate to the area, not the door. Sharing your exact location helps the rider find you.'}
          </p>
          {!precise && (
            <Button
              variant="secondary"
              className="mt-2.5"
              disabled={locating}
              onClick={useExactLocation}
            >
              <Crosshair className={cn('size-4', locating && 'animate-spin')} />
              {locating ? 'Finding you…' : 'Use my exact location'}
            </Button>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}

/**
 * One labelled input, with its error attached.
 *
 * A local component rather than a shared one because the error placement and the
 * hint line are specific to this form. Extracting it further would mean guessing
 * at a shape no other form needs yet.
 */
function Field({
  label,
  hint,
  value,
  onChange,
  error,
  required,
  numeric,
  autoFocus,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  numeric?: boolean
  autoFocus?: boolean
}) {
  const id = `addr-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-sm font-medium text-ink">
        {label}
        {!required && <span className="ml-1.5 text-xs text-ink-faint">optional</span>}
      </span>
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={numeric ? 'numeric' : undefined}
        autoFocus={autoFocus}
        // Ties the message to the input for a screen reader, instead of leaving it
        // as unrelated text that happens to sit underneath.
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'h-11 rounded-xl border bg-surface px-3.5 text-sm text-ink outline-none transition-colors',
          error ? 'border-danger' : 'border-rule-strong focus:border-brand/50',
        )}
      />
      {error && (
        <span id={`${id}-error`} className="text-xs text-danger">
          {humanise(error)}
        </span>
      )}
    </label>
  )
}

/**
 * Turns the API's machine codes into a sentence.
 *
 * The backend sends `must_be_6_digits` and `required` — stable identifiers, which
 * is right for an API and unreadable in a form. Mapping them here keeps the
 * contract machine-readable and the UI human, rather than asking the backend to
 * choose one or the other.
 */
function humanise(code: string): string {
  switch (code) {
    case 'required':
      return 'This one is needed.'
    case 'must_be_6_digits':
      return 'A pincode is six digits, not starting with zero.'
    case 'out_of_range':
      return 'That location does not look right.'
    default:
      return code.replace(/_/g, ' ')
  }
}

/**
 * The delivery area the customer already chose, from the location cookie.
 *
 * Read directly rather than passed in, so this sheet works from anywhere without
 * every caller having to thread coordinates through. The cookie is deliberately
 * not httpOnly for exactly this kind of read — see lib/location.
 *
 * Returns null only when there is no cookie at all, which the caller handles with
 * a readable message rather than sending zeroes into a CHECK constraint.
 */
function readAreaFromCookie(): { lat: number; lng: number } | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${LOCATION_COOKIE}=`))
  if (!match) return null

  const [lat, lng] = decodeURIComponent(match.split('=')[1] ?? '').split('|')
  const parsedLat = Number(lat)
  const parsedLng = Number(lng)
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null
  if (parsedLat === 0 && parsedLng === 0) return null
  return { lat: parsedLat, lng: parsedLng }
}
