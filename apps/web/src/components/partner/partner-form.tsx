'use client'

import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { ApiError, messageFor } from '@/lib/api/errors'
import SourcingService, { type LeadKind, type VendorKind } from '@/services/SourcingService'

/**
 * Telling us about a vendor.
 *
 * TWO AUDIENCES, ONE FORM. A vendor signing themselves up and a customer naming
 * their favourite cart want to fill in almost exactly the same fields, and the one
 * that genuinely differs — whose phone number this is — is handled by relabelling
 * rather than by a second form. Two forms would drift, and the second one would be
 * the one nobody tested.
 *
 * The referral case is the one that matters commercially. A cart selling fresh
 * nariyal pani is exactly the supply this platform wants and exactly the supply
 * that cannot onboard itself, so the lead has to come from somebody else.
 */
const VENDOR_KINDS: { value: VendorKind; label: string }[] = [
  { value: 'juice_cart', label: 'Juice or nariyal pani cart' },
  { value: 'tiffin', label: 'Tiffin service' },
  { value: 'sweet_shop', label: 'Sweet shop or bakery' },
  { value: 'cloud_kitchen', label: 'Cloud kitchen' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'other', label: 'Something else' },
]

export function PartnerForm() {
  const [kind, setKind] = useState<LeadKind>('referral')
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [area, setArea] = useState('')
  const [vendorKind, setVendorKind] = useState<VendorKind>('juice_cart')
  const [note, setNote] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)

  const mine = kind === 'self_signup'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})

    try {
      await SourcingService.submit({
        kind,
        business_name: businessName,
        contact_name: contactName,
        contact_phone: phone,
        area,
        vendor_kind: vendorKind,
        note,
      })
      setDone(true)
    } catch (err) {
      // Field errors next to the field, everything else in the banner. The
      // backend already says which field it rejected and why, and repeating that
      // as a generic "check your details" throws away the useful half.
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors)
      setError(messageFor(err, 'Could not send that. Try again in a moment.'))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <EmptyState
        icon={CheckCircle2}
        tone="plain"
        title="Got it — thank you"
        body={
          mine
            ? 'We will ring you within a couple of days. If you sell food that travels well, we can usually start you the same week.'
            : 'We will go and find them. If they join, you get the first order there free — we will text you when they are live.'
        }
      />
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-ink">Who are you telling us about?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <KindOption
            selected={kind === 'referral'}
            onSelect={() => setKind('referral')}
            title="A place I buy from"
            body="A cart, stall or shop you think should be on here."
          />
          <KindOption
            selected={mine}
            onSelect={() => setKind('self_signup')}
            title="My own business"
            body="You run it and want to start selling."
          />
        </div>
      </fieldset>

      <Input
        label={mine ? 'What is your place called?' : 'What is it called?'}
        hint={mine ? undefined : 'A description is fine if it has no name — "the juice cart by Gate 2".'}
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        error={fieldErrors.business_name}
        required
        maxLength={120}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="vendor-kind" className="text-sm font-medium text-ink">
          What do they sell?
        </label>
        <select
          id="vendor-kind"
          value={vendorKind}
          onChange={(e) => setVendorKind(e.target.value as VendorKind)}
          className="min-h-11 rounded-xl border border-rule-strong bg-surface px-3 text-[0.9375rem] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        >
          {VENDOR_KINDS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Where are they?"
        hint="A locality is enough. Tell us even if we do not deliver there yet — that is useful too."
        value={area}
        onChange={(e) => setArea(e.target.value)}
        error={fieldErrors.area}
        required
        maxLength={120}
      />

      <Input
        label={mine ? 'Your phone number' : 'Their phone number'}
        hint={mine ? undefined : 'So we can ring them. If you do not have it, put your own and we will ask you.'}
        prefix="+91"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={fieldErrors.phone ?? fieldErrors.contact_phone}
        required
      />

      {/* Optional and last, because a referrer usually does not know the owner's
          name and being asked for it early reads as a wall. */}
      <Input
        label={mine ? 'Your name' : "Owner's name, if you know it"}
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        error={fieldErrors.contact_name}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-medium text-ink">
          Anything else?
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={
            mine
              ? 'What you cook, roughly how many orders a day you can handle.'
              : 'What is good there, when they open, anything that helps us find them.'
          }
          className="rounded-xl border border-rule-strong bg-surface px-3 py-2.5 text-[0.9375rem] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
      </div>

      {error && (
        // role="alert" so it is announced. A form error that only appears
        // visually is invisible to the people most likely to need it.
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="self-start">
        {busy ? 'Sending…' : mine ? 'Ask us to call you' : 'Tell us about them'}
      </Button>
    </form>
  )
}

function KindOption({
  selected,
  onSelect,
  title,
  body,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  body: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      // aria-pressed rather than a styled radio: these are two buttons that change
      // the form, and a screen reader should hear which one is currently on.
      aria-pressed={selected}
      className={
        selected
          ? 'rounded-xl border-2 border-brand bg-brand-soft p-3 text-left'
          : 'rounded-xl border border-rule-strong bg-surface p-3 text-left transition-colors hover:border-brand/50'
      }
    >
      <span className="block text-sm font-semibold text-ink">{title}</span>
      <span className="mt-0.5 block text-xs text-ink-soft">{body}</span>
    </button>
  )
}
