import type { Metadata } from 'next'
import Link from 'next/link'
import { business } from '@/lib/business'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What Chowk collects, why, who it is shared with, and the rights you have over it.',
  alternates: { canonical: '/legal/privacy' },
}

/**
 * Privacy policy.
 *
 * Written from what this system ACTUALLY stores and shares, which is why it is
 * specific: a phone number as the account identifier, addresses with coordinates
 * because delivery radius is computed from a point, the rider seeing a name and a
 * door number, the payment gateway receiving contact details for its own receipts.
 *
 * A generic template would claim collection we do not do and omit sharing we do.
 * Both are worse than saying nothing, because a privacy policy is relied upon.
 *
 * India's DPDP Act 2023 is the governing law and its obligations are still being
 * phased in. This needs a lawyer before launch — see lib/business.ts.
 */
export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy policy</h1>

      <p className="lead">
        This describes what {business.brand} collects, why, and who else sees it. It is
        written to match what the system genuinely does rather than to cover every
        eventuality — if something is listed here, we do it.
      </p>

      <h2>Who is responsible</h2>
      <p>
        {business.legalName}, at {business.registeredAddress}, decides how your data is
        used and is the data fiduciary for the purposes of the Digital Personal Data
        Protection Act, 2023.
      </p>

      <h2>What we collect</h2>
      <h3>Because you gave it to us</h3>
      <ul>
        <li>
          <strong>Your phone number.</strong> It identifies your account — you sign in with
          it — and riders and kitchens use it to reach you about an active order.
        </li>
        <li>
          <strong>Your name</strong>, so a rider knows who they are handing food to.
        </li>
        <li>
          <strong>Delivery addresses, including their map coordinates.</strong> We store
          the point as well as the text, because whether a kitchen can deliver to you is
          worked out from the distance between two points, not from the words in an
          address.
        </li>
        <li>
          <strong>Your email</strong>, if you give one. Optional.
        </li>
      </ul>

      <h3>Because you used the service</h3>
      <ul>
        <li>Your orders — what, from where, when, and what you paid.</li>
        <li>Which area you are browsing from, so we can show kitchens that reach you.</li>
        <li>Basic technical information such as device type and app version.</li>
      </ul>

      <h3>What we deliberately do not hold</h3>
      <p>
        <strong>We never see your card or UPI details.</strong> Payment happens inside the
        payment provider&rsquo;s own screen and they send us only whether it succeeded and a
        reference. There is nowhere in our systems that a card number could be stored,
        because it never arrives.
      </p>
      <p>
        We do not track your location in the background. The app asks for location only
        while you are choosing where to deliver.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To take your order, get it cooked, and get it to you.</li>
        <li>To take payment and issue refunds.</li>
        <li>To tell you what is happening with an order.</li>
        <li>To answer you when you contact support.</li>
        <li>To detect fraud and abuse.</li>
        <li>To meet legal obligations, including tax and food safety records.</li>
      </ul>

      <h2>Who else sees it</h2>
      <p>Only those who need it to get you your food:</p>
      <ul>
        <li>
          <strong>The kitchen cooking your order</strong> — your first name, the items, and
          any note you added. Not your phone number unless they need to call you about it.
        </li>
        <li>
          <strong>The rider delivering it</strong> — your name, address and phone number,
          for that delivery only.
        </li>
        <li>
          <strong>Our payment provider</strong> — your name, phone and email, so they can
          process the payment and send their own receipt.
        </li>
        <li>
          <strong>Authorities</strong>, where the law requires it.
        </li>
      </ul>
      <p>
        We do not sell your data, and we do not share it with advertisers.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Order records are kept for as long as tax and food safety law requires — currently
        eight years — because they are the only evidence of what was sold, to whom, and
        what was in it. That question gets asked years later, and by somebody with a right
        to an answer.
      </p>
      <p>
        Closing your account removes your profile and addresses from the app. Past orders
        are kept, but stop being linked to a usable account.
      </p>

      <h2>Your rights</h2>
      <p>Under the DPDP Act you can ask us to:</p>
      <ul>
        <li>tell you what we hold about you</li>
        <li>correct anything wrong</li>
        <li>delete your data, where we are not required to keep it</li>
        <li>nominate somebody to exercise these rights if you cannot</li>
      </ul>
      <p>
        Email {business.grievanceEmail} and we will respond. If you are not satisfied you
        may complain to the Data Protection Board of India.
      </p>

      <h2>Keeping it safe</h2>
      <p>
        Traffic is encrypted in transit. Passwords are hashed, never stored as text. Access
        to customer data is limited to staff who need it for the job in front of them. No
        system is perfectly secure, and we will tell you and the Board if a breach affects
        you.
      </p>

      <h2>Children</h2>
      <p>
        {business.brand} is not for children under 18. We do not knowingly collect their
        data, and will delete it if we find we have.
      </p>

      <h2>Changes, and how to reach us</h2>
      <p>
        If we change this materially we will tell you before it takes effect. Our{' '}
        <Link href="/support">support page</Link> has contact details including the
        grievance officer.
      </p>
    </>
  )
}
