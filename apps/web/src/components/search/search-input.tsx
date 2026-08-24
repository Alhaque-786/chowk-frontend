'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, X } from 'lucide-react'

/**
 * The search box.
 *
 * A FORM with a real submit, not an onChange that navigates. Two reasons: typing
 * "biryani" would otherwise fire seven navigations, each scanning six menus; and
 * a form works with the Enter key, browser autofill and a phone keyboard's Search
 * button without any of that being implemented here.
 *
 * Debounced live search would be nicer and is not free — it needs the results to
 * stream without losing scroll position, and a cancelled-request story. Not worth
 * it while a search is six menu fetches deep.
 */
export function SearchInput({
  initialQuery,
  autoFocus = false,
}: {
  initialQuery: string
  autoFocus?: boolean
}) {
  const [value, setValue] = useState(initialQuery)
  const router = useRouter()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const q = value.trim()
    // An empty submit goes to the bare page rather than ?q= — otherwise the URL
    // carries a meaningless parameter that then shows up in analytics as a real
    // search for nothing.
    router.push(q === '' ? '/search' : `/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={submit} role="search">
      <label htmlFor="search-q" className="sr-only">
        Search for a dish, cuisine or kitchen
      </label>
      <div className="flex items-center gap-2.5 rounded-xl border border-rule-strong bg-surface px-3.5 py-3 focus-within:border-brand/50">
        <Search className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <input
          id="search-q"
          name="q"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          // Autofocus is normally an accessibility smell, but this IS the page's
          // purpose: arriving at /search and having to tap the only field is a
          // wasted interaction. The caller passes false once a query is present,
          // so it never steals focus from results someone is already reading.
          autoFocus={autoFocus}
          placeholder="Search for biryani, dosa, thali…"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          enterKeyHint="search"
          autoComplete="off"
        />
        {value !== '' && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="shrink-0 rounded-full p-0.5 text-ink-faint hover:text-ink"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </form>
  )
}
