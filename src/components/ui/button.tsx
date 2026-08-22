import { cn } from '@/lib/cn'

/**
 * Variants are a closed union resolved by a lookup table rather than composed
 * from arbitrary classes. That means a caller cannot invent a fifth kind of
 * button by passing className, which is how design systems drift.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-ink hover:bg-brand-hover active:bg-brand-hover shadow-sm',
  secondary:
    'bg-surface text-ink border border-rule-strong hover:bg-surface-sunk',
  ghost: 'text-ink-soft hover:bg-surface-sunk hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90',
}

const SIZES: Record<Size, string> = {
  // min-h-11 is ~44px: the smallest reliably tappable target on a phone, and
  // this is a mobile-first ordering flow.
  sm: 'min-h-9 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-[0.9375rem] gap-2',
  lg: 'min-h-12 px-5 text-base gap-2',
}

export type ButtonProps = {
  variant?: Variant
  size?: Size
  /** Renders a spinner AND disables the button, so one prop cannot desync them. */
  loading?: boolean
  fullWidth?: boolean
  /**
   * LAYOUT ONLY — margin, width, alignment, grid placement.
   *
   * Not for appearance: colour, padding, radius and weight come from `variant`
   * and `size`, and overriding them here is how a design system quietly grows a
   * fifth kind of button nobody chose. Prefer letting the parent's flex/grid
   * `gap` handle spacing over adding a margin at all.
   */
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      // Defaults to type="button". An unspecified button inside a form submits
      // it, which turns "remove item" into "place order".
      type={type}
      // Loading implies disabled. Keeping them independent lets a double-tap
      // submit twice while the spinner is showing.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-[--radius] font-medium',
        'transition-colors duration-150',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        // Last so a layout utility wins over the base, which is the only
        // override this escape hatch is meant to allow.
        className,
      )}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <svg
      className="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="44"
        strokeDashoffset="14"
        opacity="0.9"
      />
    </svg>
  )
}
