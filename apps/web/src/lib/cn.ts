/**
 * Joins class names, dropping falsy values.
 *
 * Deliberately not clsx + tailwind-merge: those are worth it when variants
 * conflict at runtime, and here variants are closed unions resolved by a lookup
 * table, so nothing conflicts. One fewer dependency to keep current.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
