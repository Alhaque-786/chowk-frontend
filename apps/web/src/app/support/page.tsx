import type { Metadata } from 'next'
import Link from 'next/link'
import { business } from '@/lib/business'

export const metadata: Metadata = {
  title: 'Support',
  description: 'How to reach Chowk about an order, a refund, or a complaint.',
  alternates: { canonical: '/support' },
}

/**
 * Support and grievance contact.
 *
 * The grievance officer block is a LEGAL REQUIREMENT, not a courtesy. The
 * Consumer Protection (E-Commerce) Rules 2020 oblige an e-commerce entity to
 * publish a named officer with contact details and to acknowledge a complaint
 * within 48 hours. A generic support address does not satisfy it — the rule asks
 * for a person, by name.
 *
 * Payment providers also check for a reachable contact page before approving a
 * live account, so this page gates going live in two separate ways.
 */
export default function SupportPage() {
  return (
    <main className="mx-auto w-full max-w-[68ch] px-4 py-10 sm:py-14">
      <div className="prose-chowk">
        <h1>Support</h1>

        <p className="lead">
          Something wrong with an order? Start there — the order page has the fastest route
          to a person who can see what happened.
        </p>

        <h2>About a specific order</h2>
        <p>
          Open the order from <Link href="/orders">your orders</Link> and use the contact
          option on it. That way we already have the order in front of us, which is most of
          the conversation.
        </p>
        <p>
          If the food has just arrived and something is wrong — missing items, the wrong
          order, or food that is not fit to eat — tell us within 24 hours and include a
          photograph where it makes sense. What happens next is set out in the{' '}
          <Link href="/legal/refunds">refund policy</Link>.
        </p>

        <h2>Everything else</h2>
        <dl>
          <div>
            <dt>Email</dt>
            <dd>{business.supportEmail}</dd>
          </div>
          <div>
            <dt>Hours</dt>
            <dd>8am to midnight, every day — the hours we take orders</dd>
          </div>
        </dl>
        <p>
          Please include your order number if it is about an order. It is on the order page
          and starts with CK.
        </p>

        <h2>Complaints</h2>
        <p>
          If we have not sorted something out, escalate it. We publish a grievance officer
          as the Consumer Protection (E-Commerce) Rules 2020 require, and we acknowledge
          complaints within 48 hours and aim to resolve them within a month.
        </p>
        <dl>
          <div>
            <dt>Grievance officer</dt>
            <dd>{business.grievanceOfficer}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{business.grievanceEmail}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{business.grievancePhone}</dd>
          </div>
          <div>
            <dt>Post</dt>
            <dd>
              {business.legalName}, {business.registeredAddress}
            </dd>
          </div>
        </dl>

        <h2>Running a kitchen?</h2>
        <p>
          Partner questions go to the same address, but{' '}
          <Link href="/partner">the partner page</Link> is faster if you are asking about
          joining, and <Link href="/partner/pricing">how commission works</Link> answers
          most of the rest.
        </p>

        <h2>Who you are dealing with</h2>
        <dl>
          <div>
            <dt>Legal entity</dt>
            <dd>{business.legalName}</dd>
          </div>
          <div>
            <dt>Registered office</dt>
            <dd>{business.registeredAddress}</dd>
          </div>
          <div>
            <dt>GSTIN</dt>
            <dd>{business.gstin}</dd>
          </div>
          <div>
            <dt>FSSAI licence</dt>
            <dd>{business.fssai}</dd>
          </div>
        </dl>
      </div>
    </main>
  )
}
