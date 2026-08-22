'use client'

import { useId } from 'react'
import { cn } from '@/lib/cn'

export type InputProps = {
  label: string
  /**
   * Field-level error, taken straight from ApiError.fieldErrors. Rendering the
   * backend's reason next to the input beats a banner: the customer can see
   * WHICH field to fix.
   */
  error?: string
  hint?: string
  /** Rendered inside the field, e.g. "+91" on a phone input. */
  prefix?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'>

export function Input({ label, error, hint, prefix, required, ...rest }: InputProps) {
  // useId rather than a prop: every input needs a label association, and making
  // the caller supply an id means some call site eventually forgets.
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div
        className={cn(
          'flex items-center rounded-[--radius] border bg-surface',
          'focus-within:ring-2 focus-within:ring-brand/25',
          error ? 'border-danger' : 'border-rule-strong focus-within:border-brand',
        )}
      >
        {prefix && (
          <span className="pl-3 text-sm text-ink-faint tabular" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={id}
          required={required}
          // Programmatic link to the error, so a screen reader announces the
          // reason and not just "invalid".
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'min-h-11 w-full bg-transparent px-3 text-[0.9375rem] text-ink',
            'placeholder:text-ink-faint focus:outline-none',
            prefix && 'pl-2',
          )}
          {...rest}
        />
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
