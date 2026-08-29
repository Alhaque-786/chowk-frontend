/**
 * Who this business legally is.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EVERY PLACEHOLDER BELOW MUST BE REPLACED BEFORE THIS SITE TAKES REAL MONEY.
 *
 * They are written as visible square-bracket text on purpose. An invented
 * company name or a plausible-looking GSTIN would render as fact on a legal
 * page, and nobody reviewing the site would catch it — that is how a policy
 * page ends up asserting something untrue about a real company. A bracket in
 * the middle of the terms page is impossible to miss and impossible to mistake
 * for a real value.
 *
 * The policies themselves are written to be honest about how this platform
 * actually works — how orders are placed, when money moves, who cooks the food,
 * what happens on a refund. They still need a lawyer's eye before launch. They
 * are a starting point drafted from the system's real behaviour, not legal
 * advice, and the refund windows in particular are commercial decisions
 * somebody has to actually make.
 * ───────────────────────────────────────────────────────────────────────────
 */
export const business = {
  /** The trading name customers know. */
  brand: 'Chowk',

  /** The registered company. Appears on every policy page. */
  legalName: '[Registered legal entity name]',

  /** Registered office, as filed. */
  registeredAddress: '[Registered office address, with PIN code]',

  /** Where legal notices should be sent. */
  supportEmail: '[support@yourdomain]',
  grievanceEmail: '[grievance@yourdomain]',

  /**
   * India's Consumer Protection (E-Commerce) Rules 2020 require an e-commerce
   * entity to publish a named grievance officer with contact details and to
   * acknowledge complaints within 48 hours. A generic support address does not
   * satisfy it — the rule asks for a person.
   */
  grievanceOfficer: '[Name of grievance officer]',
  grievancePhone: '[Grievance officer phone]',

  gstin: '[GSTIN]',

  /**
   * FSSAI licence, displayed site-wide. A food business operator in India must
   * publish this, an aggregator included. Read from the environment because it
   * is the one detail already wired that way in the footer.
   */
  fssai: process.env.NEXT_PUBLIC_FSSAI_LICENCE ?? '[FSSAI licence number]',

  /** Cities served today. Stated plainly so nobody orders from outside one. */
  operatingCities: 'Lucknow',

  /**
   * Commission taken from a merchant, in basis points.
   *
   * CONFIRM THIS BEFORE PUBLISHING IT. 600 bps is what the development fixtures
   * use, which makes it a plausible number rather than a decided one, and this is
   * the figure a merchant will hold us to. It is also the entire pitch: the large
   * aggregators take somewhere between 18 and 25 percent, and being visibly
   * cheaper than that is why a kitchen would switch.
   */
  commissionBps: 600,

  /** How often merchants are paid out. Also a commitment, not a description. */
  payoutSchedule: 'every Tuesday, for the week before',
} as const

/** Commission as a percentage, for display. */
export const commissionPercent = business.commissionBps / 100

/**
 * When the policies last changed.
 *
 * A single constant rather than a date per page: they were written together and
 * a reader comparing three different dates would reasonably wonder which one is
 * current. Update it when the text changes, not on every deploy — a policy that
 * claims to have changed today, every day, tells a reader nothing.
 */
export const policiesUpdated = '29 August 2026'
