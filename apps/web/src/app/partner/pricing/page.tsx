import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { business, commissionPercent } from '@/lib/business'

export const metadata: Metadata = {
  title: 'How commission works',
  description: `What Chowk charges a kitchen, what is deducted from an order, and when you get paid. ${commissionPercent}% commission, no listing fee.`,
  alternates: { canonical: '/partner/pricing' },
}

/**
 * What a kitchen actually pays.
 *
 * WORKED THROUGH ON A REAL ORDER rather than stated as a rate. "6% commission" is
 * the number every aggregator leads with and none of them is lying — the money
 * disappears in the deductions underneath it, and a merchant who has been through
 * that once does not believe a headline rate again. Showing the arithmetic on a
 * ₹500 order is the only version of this page a sceptical merchant will read.
 *
 * The comparison to the large aggregators is the entire commercial argument, so it
 * is stated plainly and without naming them: their rates move, and a page that
 * quotes a competitor's number is wrong eventually.
 */
export default function PartnerPricingPage() {
  // A worked example, in rupees. Deliberately a realistic order rather than a
  // round ₹1,000 that makes the percentages easy and the example useless.
  const orderValue = 500
  const commission = (orderValue * commissionPercent) / 100
  const gstOnCommission = commission * 0.18
  const youKeep = orderValue - commission - gstOnCommission

  return (
    <main className="mx-auto w-full max-w-[68ch] px-4 py-10 sm:py-14">
      <div className="prose-chowk">
        <h1>How commission works</h1>

        <p className="lead">
          {commissionPercent}% of the food bill. No listing fee, no monthly fee, nothing
          for photography, and no charge for being shown higher in a list. If you sell
          nothing, you pay nothing.
        </p>

        <h2>On a ₹{orderValue} order</h2>
        <table className="not-prose mt-4 w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-rule">
              <td className="py-2 text-ink-soft">Food bill</td>
              <td className="py-2 text-right font-medium tabular text-ink">₹{orderValue}</td>
            </tr>
            <tr className="border-b border-rule">
              <td className="py-2 text-ink-soft">
                Our commission ({commissionPercent}%)
              </td>
              <td className="py-2 text-right tabular text-ink">−₹{commission.toFixed(0)}</td>
            </tr>
            <tr className="border-b border-rule">
              <td className="py-2 text-ink-soft">GST on our commission (18%)</td>
              <td className="py-2 text-right tabular text-ink">
                −₹{gstOnCommission.toFixed(0)}
              </td>
            </tr>
            <tr>
              <td className="py-2 font-semibold text-ink">You receive</td>
              <td className="py-2 text-right font-semibold tabular text-ink">
                ₹{youKeep.toFixed(0)}
              </td>
            </tr>
          </tbody>
        </table>

        <p>
          That is the whole calculation. GST on the commission is a government charge we
          pass on at cost and claim nothing from; it appears on your invoice from us.
        </p>

        <h2>What we do not deduct</h2>
        <ul>
          <li>
            <strong>Delivery.</strong> The customer pays it. It is not taken out of your
            share.
          </li>
          <li>
            <strong>Payment charges.</strong> Most of our orders are UPI, which costs
            nothing to process by law. We absorb the rest.
          </li>
          <li>
            <strong>Discounts we chose to run.</strong> If we fund an offer, we fund it. A
            platform-funded discount is never deducted from your settlement. If you choose
            to run one, that one is yours.
          </li>
          <li>
            <strong>Ranking.</strong> There is nothing to buy. Kitchens are ordered by
            distance, rating and whether they are open.
          </li>
        </ul>

        <h2>When you get paid</h2>
        <p>
          {business.payoutSchedule}, to the account you register with us. Every payout comes
          with the orders that make it up, so it reconciles against your own records
          without a phone call.
        </p>

        <h2>Why this is lower than you are used to</h2>
        <p>
          The large aggregators charge several times this. Most of that difference is not
          margin — it is discounting, advertising, and a sales operation. We do less of all
          three, deliberately, and in exchange the number above is smaller and does not
          move.
        </p>
        <p>
          We would rather the difference showed up in your price to the customer than in
          our revenue. That is the point.
        </p>

        <h2>If you would rather not use an app at all</h2>
        <p>
          Plenty of the vendors we work with do not. If you sell from a cart or a stall, our
          own team can take the orders and arrange delivery for you — you cook, we handle
          the rest. Same commission. Tell us on{' '}
          <Link href="/partner">the partner page</Link> and we will come and see you.
        </p>

        <div className="not-prose mt-10">
          <Link href="/partner">
            <Button size="lg">List your kitchen</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
