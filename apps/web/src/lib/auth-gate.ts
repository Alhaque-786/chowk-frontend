'use client'

/**
 * Asks for a sign-in, from anywhere, and waits for the answer.
 *
 * The problem this solves: fifty menu items each need "if not signed in, sign in
 * first, then add". Three obvious approaches and why they were rejected:
 *
 *   1. A Sheet inside every add button — fifty sheet instances in the DOM for a
 *      fifty-item menu, forty-nine of which can never open.
 *   2. Redirect to /login and come back — loses the customer's place, loses the
 *      thing they were adding, and on a menu that is the whole interaction.
 *   3. A Context provider — one instance, but it re-renders every consumer under
 *      it whenever the sheet opens, and the consumers here are the entire menu.
 *
 * So: ONE sheet mounted in the layout, opened by a custom event that carries a
 * resolver. The caller awaits a boolean and continues exactly where it was. Same
 * mechanism and the same reasoning as `cart-store` — no provider, no re-render of
 * anything that is not the sheet itself.
 */

import { useSyncExternalStore } from 'react'

import { onSessionChange, tokens } from './api/tokens'

const EVENT = 'chowk:require-auth'

/**
 * Re-exported, NOT reimplemented.
 *
 * This module used to define its own `isSignedIn` by reading the token — a second
 * answer to a question that already had one. Two definitions of "signed in" is
 * how they come to disagree, so this forwards to the single one in `api/tokens`.
 */
export const isSignedIn = tokens.isSignedIn

export type AuthRequest = {
  /** Why we are asking, shown in the sheet. "Sign in to add to your cart." */
  reason: string
  /** Called once: true if the customer signed in, false if they dismissed it. */
  settle: (ok: boolean) => void
}

/**
 * Resolves true if the customer is (or becomes) signed in, false if they gave up.
 *
 * Returns immediately when a token already exists, so the common path costs
 * nothing. When nobody is listening — the sheet is not mounted, which would be a
 * wiring bug — it resolves FALSE rather than hanging forever. A caller that never
 * settles is a button that silently does nothing, which is the worst outcome to
 * debug.
 */
export function requireAuth(reason: string): Promise<boolean> {
  if (isSignedIn()) return Promise.resolve(true)
  if (typeof window === 'undefined') return Promise.resolve(false)

  return new Promise((resolve) => {
    let settled = false
    const settle = (ok: boolean) => {
      if (settled) return // A sheet can fire close and success in one interaction.
      settled = true
      resolve(ok)
    }

    const event = new CustomEvent<AuthRequest>(EVENT, {
      detail: { reason, settle },
      cancelable: true,
    })
    window.dispatchEvent(event)

    // The listener calls preventDefault to acknowledge it will settle this.
    // Nothing acknowledged means nothing is listening.
    if (!event.defaultPrevented) settle(false)
  })
}

/** Subscribes the sheet. Returns an unsubscribe function. */
export function onAuthRequired(handler: (req: AuthRequest) => void): () => void {
  const listener = (e: Event) => {
    const custom = e as CustomEvent<AuthRequest>
    // Acknowledge, so requireAuth knows someone is handling it.
    custom.preventDefault()
    handler(custom.detail)
  }
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}

/**
 * Subscribes a component to the session, without an effect.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`, and this is the
 * third place in this codebase that needed the same fix — after the cart badge
 * and the carousel arrows. The pattern it replaces looks harmless:
 *
 *     const [signedIn, setSignedIn] = useState(false)
 *     useEffect(() => { setSignedIn(isSignedIn()) }, [])
 *
 * That renders once with the wrong answer, then again with the right one — a
 * cascading render React 19 reports as an error, and a visible flash of the
 * signed-out state for anyone who is signed in. Reading it as an external store
 * gets the right answer on the FIRST render instead.
 *
 * The server snapshot is `false`: there is no session on the server, and claiming
 * otherwise would produce a hydration mismatch.
 */
export function useIsSignedIn(): boolean {
  return useSyncExternalStore(onSessionChange, tokens.isSignedIn, () => false)
}
