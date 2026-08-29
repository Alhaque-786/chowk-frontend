import type { Metadata } from 'next'
import Link from 'next/link'
import { business } from '@/lib/business'

export const metadata: Metadata = {
  title: 'Terms of service',
  description:
    'The terms on which Chowk takes orders, connects you with kitchens, and delivers food.',
  alternates: { canonical: '/legal/terms' },
}

/**
 * Terms of service.
 *
 * Written from how this system ACTUALLY behaves rather than from a template: when
 * an order becomes binding, when money moves, who cooks the food, what an
 * assisted vendor is. A policy that describes a different product from the one
 * running is worse than none, because it is relied on and then contradicted.
 *
 * Not legal advice, and it needs a lawyer before launch — see lib/business.ts.
 */
export default function TermsPage() {
  return (
    <>
      <h1>Terms of service</h1>

      <p className="lead">
        These terms govern your use of {business.brand}. By placing an order you accept
        them. Please read the section on when an order becomes binding, and the one on
        refunds — those are the two that decide what happens when something goes wrong.
      </p>

      <h2>Who you are contracting with</h2>
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

      <h2>What we do, and what we do not</h2>
      <p>
        We are a marketplace. For most orders the food is cooked by an independent
        kitchen, and that kitchen — not us — is the food business operator responsible
        for preparing it, for its ingredients, and for its own FSSAI registration. We
        list them, take your order, take payment, and arrange delivery.
      </p>
      <p>
        Some kitchens on {business.brand} are what we call <strong>assisted vendors</strong>:
        small operators, often a cart or a stall, who do not use an app. For those orders
        our own staff take the order on the vendor&rsquo;s behalf and arrange delivery. The
        vendor still cooks the food and remains responsible for it. Where an order is
        handled this way we act as their agent for taking it, nothing more.
      </p>
      <p>
        We currently operate in {business.operatingCities} only. We do not accept orders
        for delivery outside the areas shown at checkout.
      </p>

      <h2>When an order becomes binding</h2>
      <p>
        Placing an order is an offer, not a contract. A kitchen may decline it — because
        they have closed, run out, or cannot cook it in time. The contract forms when the
        kitchen <strong>accepts</strong> your order, which is when you will see it move to
        &ldquo;Accepted&rdquo; on the order page.
      </p>
      <p>
        This matters for payment. For most orders we take payment when you place them.
        For assisted vendors we only <strong>authorise</strong> the amount when you order
        and charge it when the vendor accepts — so if nobody accepts, you are never
        charged. Either way, an order that is never accepted is refunded in full.
      </p>

      <h2>Prices, and what is added to them</h2>
      <p>
        Menu prices are set by the kitchen and include applicable taxes unless stated
        otherwise. Delivery fees, packaging charges and any government levies are shown
        separately in your cart before you pay. The total you see at checkout is the total
        you pay; we do not add anything after it.
      </p>
      <p>
        Prices can change between visits. The price that applies is the one shown when you
        place the order.
      </p>

      <h2>Your account</h2>
      <p>
        You need an account to order, and you are responsible for what happens under it.
        Your phone number identifies your account, so keep access to it. Tell us at once
        if you think somebody else is using your account.
      </p>
      <p>
        You must be old enough to enter a contract. We may close an account that is used
        for fraud, for abuse of our staff or riders, or for repeated refusal of delivered
        orders.
      </p>

      <h2>Delivery</h2>
      <p>
        Delivery times shown are estimates, not promises. Traffic, weather and how busy the
        kitchen is all move them. We will tell you when your order is on its way.
      </p>
      <p>
        Somebody must be available at the address to receive the order. If nobody is, and
        the rider cannot reach you, the order may be treated as delivered and not refunded
        — the food has been cooked and cannot be resold.
      </p>

      <h2>Cancellations and refunds</h2>
      <p>
        Set out in full in our <Link href="/legal/refunds">refund policy</Link>, which forms
        part of these terms.
      </p>

      <h2>Things we are not responsible for</h2>
      <p>
        We are responsible for our own service — the ordering platform, taking payment, and
        arranging delivery. We are not responsible for the food itself beyond selecting and
        listing kitchens in good faith and acting on complaints.
      </p>
      <p>
        If you have an allergy, please contact the kitchen or our support before ordering.
        Allergen information on the site comes from the kitchen and we cannot guarantee a
        kitchen is free of any particular ingredient. Nothing here limits liability that
        cannot be limited by law, including for death or personal injury caused by
        negligence.
      </p>

      <h2>Complaints</h2>
      <p>
        Under the Consumer Protection (E-Commerce) Rules 2020 we publish a grievance
        officer, and we acknowledge complaints within 48 hours. Details are on our{' '}
        <Link href="/support">support page</Link>.
      </p>

      <h2>Changes</h2>
      <p>
        We may change these terms. The version that applies to your order is the one
        published when you placed it. Material changes will be notified in the app or by
        message before they take effect.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of India, and the courts at{' '}
        {business.operatingCities} have jurisdiction.
      </p>
    </>
  )
}
