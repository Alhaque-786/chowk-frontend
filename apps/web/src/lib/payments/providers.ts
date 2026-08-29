'use client'

import { loadScript } from '@/lib/payments/script'
import type { PaymentIntent } from '@/lib/api/types'

/**
 * How the client completes a payment, per gateway.
 *
 * MIRRORS THE BACKEND'S PROVIDER REGISTRY, deliberately. The server tells us which
 * gateway opened the intent — it is a field on the response, not an assumption —
 * and this map says what to do with each one. Adding Cashfree or PhonePe later is
 * one entry here and one entry there; no call site changes, because the cart only
 * ever asks for "the handler for whatever the server said".
 *
 * That indirection is worth the small cost now. A marketplace ends up with more
 * than one gateway sooner than it expects: a second provider is the only real
 * answer to the first being down, and split-settlement terms differ enough that
 * the choice can end up being made per merchant. A cart with `if (razorpay)` in it
 * breaks on the day a second appears, at the payment step of somebody's order.
 */

/** What a handler reports back. */
export type PaymentOutcome =
  /** The customer completed the payment. The webhook is what makes it true. */
  | { kind: 'submitted' }
  /** The customer closed the sheet. Not an error — the order is still payable. */
  | { kind: 'dismissed' }

export type PaymentContext = {
  intent: PaymentIntent
  amountMinor: number
  orderNumber: string
  customerName?: string
  customerPhone?: string
}

type Handler = (ctx: PaymentContext) => Promise<PaymentOutcome>

/*
  ── Razorpay ────────────────────────────────────────────────────────────────
*/
type RazorpayOptions = {
  key: string
  order_id: string
  amount: number
  currency: string
  name: string
  description: string
  prefill: { name?: string; contact?: string }
  theme: { color: string }
  handler: () => void
  modal: { ondismiss: () => void }
}
type RazorpayInstance = { open: () => void }
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

const razorpay: Handler = async (ctx) => {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  if (!key) {
    // A configuration problem, phrased for the person who can fix it. The customer
    // sees the generic failure; this string is for the log and the developer.
    throw new Error('NEXT_PUBLIC_RAZORPAY_KEY_ID is not set, so checkout cannot open.')
  }

  await loadScript('https://checkout.razorpay.com/v1/checkout.js')
  const Razorpay = window.Razorpay
  if (!Razorpay) throw new Error('Razorpay loaded but did not register itself.')

  return new Promise<PaymentOutcome>((resolve) => {
    const checkout = new Razorpay({
      key,
      // The gateway's own order id, which the backend returns as client_secret.
      order_id: ctx.intent.client_secret,
      amount: ctx.amountMinor,
      currency: 'INR',
      name: 'Chowk',
      description: `Order ${ctx.orderNumber}`,
      prefill: { name: ctx.customerName, contact: ctx.customerPhone },
      theme: { color: '#C1440E' },
      /*
        SUCCESS HERE MEANS "THE CUSTOMER FINISHED", NOT "WE HAVE THE MONEY".

        The signed webhook is the only thing that moves a payment to captured, and
        it arrives server-to-server. This callback is a hint that the customer is
        done and the order page is worth watching — it is not proof, it is not
        verified here, and nothing is trusted from it. A client that treated it as
        settlement would mark orders paid on a forged callback.
      */
      handler: () => resolve({ kind: 'submitted' }),
      // Dismissal is a normal outcome, not a failure. The order exists and stays
      // payable; telling somebody their payment "failed" because they closed a
      // sheet to check their balance would be wrong and alarming.
      modal: { ondismiss: () => resolve({ kind: 'dismissed' }) },
    })
    checkout.open()
  })
}

/*
  ── Mock ────────────────────────────────────────────────────────────────────
*/
const mock: Handler = async () => {
  /*
    The development gateway, which has no sheet to open.

    The backend selects it when gateway credentials are absent, so this path is
    what a developer without a Razorpay account actually hits. It reports the
    payment as submitted and leaves the order page polling, exactly as the real
    one does — the difference is that nothing will confirm it until a signed
    webhook is posted. See the payment module's mock adapter.
  */
  return { kind: 'submitted' }
}

const handlers: Record<string, Handler> = { razorpay, mock }

/** Whether this build knows how to complete a payment with the named gateway. */
export function canHandle(provider: string): boolean {
  return provider in handlers
}

/**
 * Completes a payment with whichever gateway opened it.
 *
 * Throws on an unknown provider rather than guessing. A silent fallback to the
 * first registered handler would open the wrong SDK against the wrong order id,
 * and the customer would see an error from a company they are not paying.
 */
export function completePayment(ctx: PaymentContext): Promise<PaymentOutcome> {
  const handler = handlers[ctx.intent.provider]
  if (!handler) {
    throw new Error(
      `No client handler for payment provider "${ctx.intent.provider}". ` +
        `Known: ${Object.keys(handlers).join(', ')}.`,
    )
  }
  return handler(ctx)
}
