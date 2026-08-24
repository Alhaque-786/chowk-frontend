/**
 * Types mirroring the Go response DTOs in each module's `adapter/http` package.
 *
 * HAND-WRITTEN, and that is a known liability: a renamed JSON field in Go becomes
 * a silent `undefined` here rather than a compile error. Only the endpoints the
 * current screens actually use are typed, so the surface stays small enough to
 * keep honest.
 *
 * The fix, when the surface grows: generate an OpenAPI spec from the handlers and
 * generate this file from it — the same argument as `make erd` in the backend.
 * Doing it now would mean building the generator for 40 endpoints when the UI
 * touches 12.
 */

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

/**
 * Every response the API sends has this shape — `internal/platform/httpx`
 * guarantees it, including for router-level 404s. One envelope means one client
 * and one error handler rather than a special case per endpoint.
 */
export type Envelope<T> = {
  data?: T
  error?: ApiErrorBody
  meta?: unknown
}

export type ApiErrorBody = {
  /** Stable, screaming-snake. Switch on THIS, never on `message`. */
  code: string
  /** Safe to show a user as-is; the backend writes these for customers. */
  message: string
  /** Field-level validation reasons, for attaching to form inputs. */
  fields?: Record<string, string>
  /** Correlates to backend logs. Worth showing on an unexpected failure. */
  trace_id?: string
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/**
 * Every amount crossing the wire is an integer count of paise, named `*_minor`.
 *
 * The branded type is deliberate: it makes `formatRupees(order.total_minor)`
 * type-check and `formatRupees(500)` a compile error, so a raw number can never
 * be mistaken for an amount. Floats are never used for money anywhere in this
 * stack — see `shared/money` in the backend for why.
 */
export type Paise = number & { readonly __brand: 'paise' }

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type User = {
  id: string
  phone: string
  email?: string
  full_name: string
  status: 'pending_verification' | 'active' | 'suspended' | 'deleted'
  roles: string[]
  phone_verified: boolean
  referral_code: string
  kitchen_id?: string
  created_at: string
}

/**
 * Response to an OTP request.
 *
 * Deliberately says NOTHING about whether the phone number is registered — the
 * backend answers identically either way, because a different response for a
 * known number would turn this endpoint into a free "is this person a customer"
 * oracle. Returning the body is still safe: none of these fields distinguish the
 * two cases.
 */
export type OtpRequested = {
  sent: boolean
  /** Seconds until the code expires. */
  expires_in: number
  /**
   * The code itself, returned ONLY when the API is not running in production.
   * Its absence is the security property, so treat it as optional forever and
   * never build a flow that requires it.
   */
  debug_code?: string
}

export type AuthResponse = {
  user: User
  access_token: string
  refresh_token: string
  token_type: string
  expires_at: string
}

/**
 * A saved delivery address.
 *
 * `state`, `receiver_name` and `receiver_phone` were MISSING from this type while
 * the API has always sent them (all three `omitempty`, hence optional here). The
 * effect was quiet rather than loud: an address form could not prefill them and an
 * edit would have silently blanked them, because a field absent from the type is
 * a field nobody writes code for.
 */
export type Address = {
  id: string
  type: 'home' | 'work' | 'other'
  label: string
  line1: string
  line2?: string
  landmark?: string
  city: string
  state?: string
  pincode: string
  latitude: number
  longitude: number
  is_default: boolean
  /** Who takes delivery, when it is not the account holder. */
  receiver_name?: string
  receiver_phone?: string
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/** Legally required labelling in India, not a preference — it drives the mark. */
export type FoodType = 'veg' | 'non_veg' | 'egg' | 'vegan'

export type MenuItem = {
  id: string
  name: string
  description?: string
  image_url?: string
  price_minor: Paise
  /** Struck-through "was" price. Absent when there is no offer. */
  compare_price_minor?: Paise
  food_type: FoodType
  spice_level: number
  allergens: string[]
  serves: number
  prep_minutes: number
  is_recommended: boolean
  rating_average: number
  rating_count: number
  modifier_groups?: ModifierGroup[]
}

export type ModifierGroup = {
  id: string
  name: string
  /**
   * The server's own verdict on whether a choice is mandatory.
   *
   * Redundant with `min_select > 0` today, and preferred anyway: if the rule ever
   * becomes more subtle than a count, the server is the one place that should
   * decide. Derived booleans on the client are how two definitions drift.
   */
  is_required: boolean
  min_select: number
  /** How many may be picked. 1 means a radio group, more means checkboxes. */
  max_select: number
  modifiers: Modifier[]
}

export type Modifier = {
  id: string
  name: string
  /** Added to the item's base price. Zero is common — a portion choice where the
   *  small size is the base price. */
  price_minor: Paise
  /**
   * NOT SENT by the API. Declared optional so nothing can guard on it and
   * conclude every modifier is unavailable.
   *
   * It was previously declared required, which is the more dangerous mistake: a
   * check like `m.is_available && …` reads undefined, and every add-on silently
   * disappears from the sheet with no error anywhere.
   */
  is_available?: boolean
}

export type MenuCategory = {
  id: string
  name: string
  description?: string
  items: MenuItem[]
}

export type Kitchen = {
  id: string
  name: string
  slug: string
  description?: string
  cuisines: string[]
  /**
   * Listing card photograph. ABSENT when the kitchen has none — the API omits
   * the key rather than sending '', so this is optional and no component may
   * assume a kitchen has a picture.
   */
  cover_image_url?: string
  city: string
  latitude: number
  longitude: number
  /**
   * False when closed, paused, or outside opening hours.
   *
   * The field is `is_open`, verified against the running API. An earlier version
   * of this file guessed `is_open`, which is the Go domain method
   * name but NOT the JSON tag — so it read `undefined`, and every kitchen
   * rendered as closed. A hand-written type produces exactly this failure: no
   * compile error, no runtime error, just a silently wrong UI.
   */
  is_open: boolean
  /** Why it cannot take an order. Absent when it can. */
  closed_reason?: string
  avg_prep_minutes: number
  rating_average: number
  rating_count: number
  min_order_minor: Paise
  packaging_fee_minor: Paise
  /**
   * Typical spend for two people.
   *
   * ABSENT when the merchant has not set one — the API omits the key rather than
   * sending 0, so a card must render nothing rather than "₹0 for two". Declared
   * by the merchant, not derived from the menu, because a median price describes
   * neither a kitchen selling one family biryani beside cheap breads nor a thali
   * place where one plate feeds two.
   */
  cost_for_two_minor?: Paise
}

export type Menu = {
  kitchen: Kitchen
  categories: MenuCategory[]
}

/**
 * A kitchen in a proximity search.
 *
 * FLAT, not `{ kitchen, distance_m }` — the API spreads the kitchen fields and
 * adds `distance_m` alongside them. Verified against the running endpoint.
 */
export type NearbyKitchen = Kitchen & {
  /** Straight-line metres. Absent if the search had no origin. */
  distance_m?: number
}

// ---------------------------------------------------------------------------
// Cart & ordering
// ---------------------------------------------------------------------------

/**
 * One line in the server cart.
 *
 * The identifier is `line_id`, NOT `id`. Verified against the running API. This
 * mattered: `setQuantity(line.id, n)` would have read `undefined` and issued
 * `PATCH /cart/items/undefined` — no TypeScript error, no runtime error at the
 * call site, just a 404 or a 400 from the server on every quantity change.
 *
 * CORRECTION to an earlier note in this file: the response DOES echo modifiers
 * back, as an array of NAMES (not ids, not objects). Verified against the live
 * API. An earlier version of this type dropped the field on the reasoning that it
 * was request-only, which was simply wrong — and dropping it meant the cart could
 * not show what a customer had chosen.
 *
 * `unit_price_minor` is the BASE price and EXCLUDES modifiers. `line_total_minor`
 * includes them. So for a ₹389 biryani with a ₹140 "Full" portion at quantity 2,
 * unit_price_minor is 38900 and line_total_minor is 105800 — and rendering
 * "₹389 each" beside a ₹1,058 line total is how a customer concludes the maths
 * is broken. Derive the effective unit price from the line total instead.
 */
export type CartLine = {
  line_id: string
  menu_item_id: string
  name: string
  quantity: number
  unit_price_minor: Paise
  line_total_minor: Paise
  /**
   * The chosen modifiers, as display NAMES — "Full (serves 2)", "Extra raita".
   * Names, not ids, so they can be shown without a second lookup; the trade is
   * that they cannot be mapped back to modifier ids for editing.
   */
  modifiers?: string[]
  /** False when the dish sold out after it went in the cart. */
  is_available: boolean
}

/**
 * The server cart. Every field below was read off the live response.
 *
 * The previous version of this type had four of the ten fields, which meant a
 * cart page literally could not render a total — the numbers were not in the
 * type, so nobody could reach for them.
 *
 * `item_count` is the sum of QUANTITIES, not the number of lines. Two biryanis
 * on one line is item_count 2. The badge was using `lines.length` and would have
 * shown "1".
 */
export type Cart = {
  /** Absent on an empty cart — a cart belongs to at most one kitchen. */
  kitchen_id?: string
  /**
   * The kitchen's name, so a "replace your cart?" prompt can be specific.
   *
   * "Your cart has items from another kitchen" makes somebody go and look.
   * "Replace your Khansama order?" is a decision they can make on the spot.
   */
  kitchen_name?: string
  lines: CartLine[]
  item_count: number
  subtotal_minor: Paise
  packaging_fee_minor: Paise
  delivery_fee_minor: Paise
  tax_minor: Paise
  total_minor: Paise
  /** False blocks checkout. The reason is customer-facing copy. */
  kitchen_open: boolean
  closed_reason?: string
}

export type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'rejected'
  | 'refunded'

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'cod'

export type OrderLine = {
  /** Absent in the checkout response, present when reading an order back. Not
   *  needed to render a line, so optional rather than required. */
  menu_item_id?: string
  name: string
  quantity: number
  unit_price_minor: Paise
  line_total_minor: Paise
}

export type Order = {
  id: string
  /** Customer-facing, e.g. "CK-8F2K9Q". What they quote to support. */
  number: string
  status: OrderStatus
  lines: OrderLine[]
  subtotal_minor: Paise
  packaging_fee_minor: Paise
  delivery_fee_minor: Paise
  discount_minor: Paise
  tax_minor: Paise
  tip_minor: Paise
  total_minor: Paise
  payment_method: PaymentMethod
  coupon_code?: string
  /** Pre-formatted single line, e.g. "12 Hazratganj, Lucknow, 226001". The API
   *  flattens it, so there is no structured address to re-format here. */
  delivery_address?: string
  /** The SERVER's ruling on whether cancelling is still allowed — it depends on
   *  the order's state machine, so never infer it from `status` on the client. */
  can_cancel: boolean
  promised_at?: string
  created_at: string
}

export type PaymentIntent = {
  payment_id: string
  provider_ref: string
  client_secret: string
  status: string
  requires_action: boolean
}

export type CheckoutResult = {
  order: Order
  /** Absent for COD, where nothing is collected up front. */
  payment?: PaymentIntent
}

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

export type Offer = {
  code: string
  description: string
  min_order_minor: Paise
  first_order_only: boolean
  valid_until?: string
  /**
   * Which kitchens the offer applies to. EMPTY means every kitchen — a
   * platform-wide offer.
   *
   * The distinction matters at the call site: `[]` is "applies everywhere", not
   * "applies nowhere", and reading it the other way hides every global offer.
   */
  kitchen_ids: string[]
}

export type CouponCheck = {
  valid: boolean
  code?: string
  description?: string
  discount_minor: Paise
  /** Why it does not apply — written for the customer, so show it verbatim. */
  reason?: string
}
