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

export type AuthResponse = {
  user: User
  access_token: string
  refresh_token: string
  token_type: string
  expires_at: string
}

export type Address = {
  id: string
  type: 'home' | 'work' | 'other'
  label: string
  line1: string
  line2?: string
  landmark?: string
  city: string
  pincode: string
  latitude: number
  longitude: number
  is_default: boolean
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
  /** > 0 means the customer must choose. */
  min_select: number
  max_select: number
  modifiers: Modifier[]
}

export type Modifier = {
  id: string
  name: string
  price_minor: Paise
  is_available: boolean
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

export type CartLine = {
  id: string
  menu_item_id: string
  name: string
  quantity: number
  unit_price_minor: Paise
  line_total_minor: Paise
  modifiers?: { id: string; name: string; price_minor: Paise }[]
  note?: string
}

export type Cart = {
  kitchen_id?: string
  lines: CartLine[]
  item_count: number
  subtotal_minor: Paise
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
  menu_item_id: string
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
