import type { Metadata } from 'next'
import Link from 'next/link'
import { business } from '@/lib/business'

export const metadata: Metadata = {
  title: 'Cancellation and refund policy',
  description:
    'When you can cancel a Chowk order, when you are refunded, and how long the money takes to come back.',
  alternates: { canonical: '/legal/refunds' },
}

/**
 * Cancellation and refunds.
 *
 * The windows here are COMMERCIAL DECISIONS somebody has to actually make, not
 * facts about the code. They are written to match how the system behaves today —
 * an order can be cancelled while it is `placed`, and the kitchen accepting it is
 * the point of no return — but "free until the kitchen accepts" is a choice about
 * how much waste to absorb, and it should be a deliberate one.
 *
 * Refund timelines are the gateway's, not ours. Stating a shorter one than
 * Razorpay actually delivers would be a promise we cannot keep, and the complaint
 * lands with us either way.
 */
export default function RefundsPage() {
  return (
    <>
      <h1>Cancellation and refund policy</h1>

      <p className="lead">
        Food is cooked to order, so the moment a kitchen starts cooking is the moment a
        cancellation starts costing somebody money. This policy is built around that one
        fact.
      </p>

      <h2>Cancelling before the kitchen accepts</h2>
      <p>
        <strong>Free, always.</strong> Until a kitchen accepts your order, nothing has been
        cooked. Cancel from the order page and you are refunded in full.
      </p>
      <p>
        If you paid by UPI or card, the refund is issued straight away. For orders at an
        assisted vendor we only authorise the amount rather than taking it, so there is
        usually nothing to refund — the hold is released.
      </p>

      <h2>Cancelling after the kitchen accepts</h2>
      <p>
        Once a kitchen has accepted, they have begun cooking. You can still cancel from the
        order page, but we cannot guarantee a refund: the food exists and cannot be resold.
        Contact <Link href="/support">support</Link> and we will look at it case by case.
      </p>

      <h2>When we cancel</h2>
      <p>You are refunded in full, every time, when:</p>
      <ul>
        <li>no kitchen accepts your order</li>
        <li>the kitchen cancels after accepting</li>
        <li>we cannot deliver to your address</li>
        <li>an item turns out to be unavailable and you do not want a substitute</li>
      </ul>

      <h2>Something was wrong with the order</h2>
      <p>
        Tell us within <strong>24 hours</strong> of delivery, with a photograph where it
        makes sense. We refund or replace when:
      </p>
      <ul>
        <li>items are missing</li>
        <li>you received the wrong order</li>
        <li>the food arrived spilled, or cold enough not to be edible</li>
        <li>the food was not fit to eat</li>
      </ul>
      <p>
        We look at each one properly rather than applying a rule. We will not refund on
        taste alone — a dish you did not enjoy is not a dish that was wrong — but tell us
        anyway, because it is how we decide which kitchens stay listed.
      </p>

      <h2>Failed delivery</h2>
      <p>
        If nobody is available at the address and the rider cannot reach you after trying,
        the order is treated as delivered and is not refunded. The food was cooked, the
        journey was made, and both were paid for. Please keep your phone reachable while an
        order is on its way.
      </p>

      <h2>How long a refund takes</h2>
      <p>
        We issue the refund immediately once it is approved. After that the timing belongs
        to your bank, not to us:
      </p>
      <ul>
        <li>
          <strong>UPI</strong> — usually the same day, sometimes up to 3 working days
        </li>
        <li>
          <strong>Cards</strong> — typically 5 to 7 working days to appear on a statement
        </li>
        <li>
          <strong>Cash on delivery</strong> — refunded to your bank account or UPI ID; we
          will ask you for it
        </li>
      </ul>
      <p>
        If it has been longer than that, contact <Link href="/support">support</Link> with
        your order number and we will chase it with the payment provider.
      </p>

      <h2>Cancelling repeatedly</h2>
      <p>
        Frequent cancellation after a kitchen has accepted, or repeated refusal of
        delivered orders, may mean we stop offering prepaid ordering on your account or
        close it. Every one of those orders is food a small kitchen cooked and threw away.
      </p>

      <h2>Getting hold of us</h2>
      <p>
        Our <Link href="/support">support page</Link> has the details, including the
        grievance officer we are required to publish. Email {business.supportEmail} with
        your order number and we will come back to you.
      </p>
    </>
  )
}
