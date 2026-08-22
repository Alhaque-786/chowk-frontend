'use client'

import { useState } from 'react'
import { ChevronDown, MapPin, Search } from 'lucide-react'
import Link from 'next/link'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

/**
 * Delivery location + search, the two controls that belong above everything else.
 *
 * Location is first because it determines whether ANY of the page below is
 * relevant — a beautiful list of kitchens that do not deliver to you is worse
 * than no list. Every food app puts it here for that reason.
 */
export function LocationBar({ city }: { city: string }) {
  const [picking, setPicking] = useState(false)

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="group flex min-w-0 items-center gap-2 rounded-[--radius] px-1 py-1 text-left"
        >
          <MapPin className="size-4 shrink-0 text-brand" />
          <span className="min-w-0">
            <span className="block text-[0.6875rem] font-medium uppercase tracking-wider text-ink-faint">
              Deliver to
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold text-ink">
              <span className="truncate">{city}</span>
              <ChevronDown className="size-3.5 shrink-0 text-ink-faint transition-transform group-hover:translate-y-px" />
            </span>
          </span>
        </button>
      </div>

      {/* Search is a LINK, not an input, so the home page ships no search
          JavaScript. The real input lives on /search and gets focus on arrival —
          the interaction feels identical and the home page stays light. */}
      <Link
        href="/search"
        className="mt-3 flex items-center gap-2.5 rounded-[--radius] border border-rule-strong bg-surface px-3.5 py-3 text-sm text-ink-faint transition-colors hover:border-brand/40"
      >
        <Search className="size-4 shrink-0" />
        <span>Search for biryani, dosa, thali…</span>
      </Link>

      <Sheet
        open={picking}
        onOpenChange={setPicking}
        title="Where should we deliver?"
        description="We use this to show kitchens that actually reach you."
        footer={
          <Button fullWidth onClick={() => setPicking(false)}>
            Use {city}
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {/*
            Honest scaffolding, and labelled as such. Real behaviour needs the
            browser geolocation prompt plus the customer's saved addresses from
            the identity module, and shipping a fake picker that silently does
            nothing would be worse than showing the one city we actually serve.
          */}
          <p className="rounded-[--radius] bg-brand-soft px-3 py-2.5 text-sm text-brand">
            We are only in {city} for now. More cities as kitchens sign up.
          </p>
          <p className="text-sm leading-relaxed text-ink-soft">
            Once you place an order your saved addresses appear here, and you can
            switch between home and work in a tap.
          </p>
        </div>
      </Sheet>
    </>
  )
}
