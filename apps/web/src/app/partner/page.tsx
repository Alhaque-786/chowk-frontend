import type { Metadata } from 'next'
import { PartnerForm } from '@/components/partner/partner-form'

export const metadata: Metadata = {
  title: 'Sell on Chowk',
  description:
    'Tell us about a kitchen, cart or tiffin service that should be on Chowk — or sign up your own. Lower commission than the big apps, and we can take orders on your behalf if you do not want an app.',
}

/**
 * The supply-side front door.
 *
 * The heading lives HERE rather than inside the form, for the same reason the
 * dashboards put theirs in the page: a heading is a property of the document, not
 * of whether the form has been submitted. With it inside, the success state
 * replaced the h1 and the page briefly had none.
 */
export default function PartnerPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Sell on Chowk</h1>

      <p className="mt-4 text-ink-soft">
        We take a smaller cut than the big apps, and we pay out weekly. If you would rather
        not deal with an app at all, we will take the orders and deliver them for you — a lot
        of the carts we work with do it that way.
      </p>

      {/*
        The referral pitch is stated plainly because it is the point of this page.
        The vendors worth the most to a customer here — the juice cart, the chaat
        stall, the man who has sold the same thing on the same corner for fifteen
        years — are exactly the ones who will never fill in a form. Somebody else
        has to tell us they exist.
      */}
      <div className="mt-8 rounded-2xl border border-rule bg-surface-sunken p-5">
        <h2 className="text-base font-semibold text-ink">Know somewhere good?</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Tell us about the cart outside your office or the tiffin service you have used for
          years. You do not need an account, and you do not need their permission — we will
          ring them ourselves. If they join, your first order there is on us.
        </p>
      </div>

      <div className="mt-8">
        <PartnerForm />
      </div>

      <p className="mt-10 border-t border-rule pt-6 text-sm text-ink-faint">
        We only work in Lucknow so far. Tell us about places outside it anyway — that is how
        we decide where to go next.
      </p>
    </main>
  )
}
