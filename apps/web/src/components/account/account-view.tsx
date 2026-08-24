'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { AddressSheet } from './address-sheet'
import { messageFor } from '@/lib/api/errors'
import { requireAuth, useIsSignedIn } from '@/lib/auth-gate'
import { tokens } from '@/lib/api/tokens'
import AddressService from '@/services/AddressService'
import IdentityService from '@/services/IdentityService'
import type { Address, User } from '@/lib/api/types'
import { cn } from '@/lib/cn'

/**
 * Profile, saved addresses, and sign out.
 *
 * The profile is read from the CACHED user rather than an endpoint, because there
 * is no `GET /me`: the API returns the user only in an auth response. So this shows
 * what the last sign-in returned, which for a phone-and-OTP account is everything
 * there is to show. Called out because it is a limitation, not a design: the day
 * a profile becomes editable, this needs a real endpoint behind it.
 *
 * Addresses ARE live, because they change from here and from checkout.
 */
export function AccountView() {
  const [user, setUser] = useState<User | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const signedIn = useIsSignedIn()
  const router = useRouter()

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const next = await AddressService.list({ signal })
      setAddresses(next)
      setUser(tokens.user())
      setError(null)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(messageFor(err, 'Could not load your addresses.'))
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!signedIn) return
    const controller = new AbortController()
    /*
      eslint-disable-next-line react-hooks/set-state-in-effect --
      Every setState in `load` runs after an await; the rule cannot see through the
      async boundary. Same caveat as the cart: fetching in an effect is the wrong
      tool, and a data library is the real fix rather than this suppression.
    */
    void load(controller.signal)
    return () => controller.abort()
  }, [signedIn, load])

  async function remove(address: Address) {
    setRemovingId(address.id)
    setError(null)
    try {
      await AddressService.remove(address.id)
      // Removed from the list rather than re-fetching: the server soft-deletes, so
      // the row is gone from every read anyway, and a refetch would just be a
      // slower way to reach the same list.
      setAddresses((prev) => prev.filter((a) => a.id !== address.id))
    } catch (err) {
      setError(messageFor(err, 'Could not remove that address.'))
    } finally {
      setRemovingId(null)
    }
  }

  async function signOut() {
    setSigningOut(true)
    // Tokens are cleared even if the call fails — see IdentityService. So this
    // always ends signed out, which is the only safe outcome on a shared phone.
    await IdentityService.logout()
    router.push('/')
  }

  if (!signedIn) {
    return (
      <EmptyState
        className="mt-6"
        title="Sign in to see your account"
        body="Your addresses and orders live with your account, so they follow you to any device."
        action={
          <Button onClick={() => void requireAuth('Sign in to see your account.')}>
            Sign in
          </Button>
        }
      />
    )
  }

  if (!loaded) {
    return (
      <div className="mt-6 flex flex-col gap-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {(adding || editing) && (
        <AddressSheet
          open
          onOpenChange={(open) => {
            if (!open) {
              setAdding(false)
              setEditing(null)
            }
          }}
          existing={editing ?? undefined}
          makeDefault={addresses.length === 0}
          onSaved={(saved) => {
            setAddresses((prev) => {
              const without = prev.filter((a) => a.id !== saved.id)
              // A new default demotes the others locally, matching what the server
              // just did — otherwise two rows would show as default until reload.
              const demoted = saved.is_default
                ? without.map((a) => ({ ...a, is_default: false }))
                : without
              return [saved, ...demoted]
            })
            setAdding(false)
            setEditing(null)
          }}
        />
      )}

      <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-rule/70">
        <h2 className="font-display text-base font-bold text-ink">Profile</h2>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-soft">Phone</dt>
            <dd className="tabular font-medium text-ink">
              {user?.phone ?? 'Signed in'}
            </dd>
          </div>
          {user?.full_name && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-soft">Name</dt>
              <dd className="font-medium text-ink">{user.full_name}</dd>
            </div>
          )}
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Your number is how a rider reaches you, and how you sign in. Changing it
          is not built yet.
        </p>
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-rule/70">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-bold text-ink">
            Saved addresses
          </h2>
          {addresses.length > 0 && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              <Plus className="size-3.5" />
              Add new
            </button>
          )}
        </div>

        {addresses.length === 0 ? (
          <EmptyState
            tone="plain"
            className="px-0 py-6"
            icon={MapPin}
            title="No addresses yet"
            body="Add one now and checkout will be a single tap next time."
            action={
              <Button onClick={() => setAdding(true)}>
                <Plus className="size-4" />
                Add an address
              </Button>
            }
          />
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {addresses.map((address) => (
              <li
                key={address.id}
                className="flex items-start gap-3 rounded-xl px-3 py-3 ring-1 ring-rule"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink">
                      {address.label || labelFor(address.type)}
                    </span>
                    {address.is_default && (
                      <span className="shrink-0 rounded-md bg-brand-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold text-brand">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                    {[address.line1, address.line2, address.landmark]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p className="tabular mt-0.5 text-xs text-ink-faint">
                    {address.city} {address.pincode}
                  </p>
                  {address.receiver_name && (
                    <p className="mt-0.5 text-xs text-ink-faint">
                      For {address.receiver_name}
                      {address.receiver_phone ? ` · ${address.receiver_phone}` : ''}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(address)}
                    className="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-surface-sunk hover:text-ink"
                    aria-label={`Edit ${address.label || address.line1}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(address)}
                    disabled={removingId === address.id}
                    className={cn(
                      'grid size-8 place-items-center rounded-lg text-ink-soft transition-colors',
                      'hover:bg-danger-soft hover:text-danger disabled:opacity-50',
                    )}
                    aria-label={`Remove ${address.label || address.line1}`}
                  >
                    {removingId === address.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <p className="rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <Link href="/orders" className="text-sm font-semibold text-brand hover:underline">
          Your orders →
        </Link>
        <Button variant="secondary" onClick={signOut} disabled={signingOut}>
          {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          Sign out
        </Button>
      </section>
    </div>
  )
}

/** A readable name for an address with no nickname. */
function labelFor(type: Address['type']): string {
  switch (type) {
    case 'home':
      return 'Home'
    case 'work':
      return 'Work'
    default:
      return 'Address'
  }
}
