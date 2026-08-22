'use client'

import { Drawer } from 'vaul'
import { X } from 'lucide-react'

/**
 * A bottom sheet.
 *
 * vaul rather than a hand-rolled modal, and the reasons are behavioural rather
 * than visual: drag-to-dismiss with real momentum, background scroll locking,
 * focus trapping, Escape handling, and a correct `aria-modal` tree. Each of those
 * is a day of fiddly work and a likely accessibility bug if hand-written.
 *
 * A bottom sheet specifically because this is a phone-first ordering flow — a
 * centred dialog puts its actions where a thumb cannot reach.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Optional; when absent no aria-describedby is emitted rather than an empty one. */
  description?: string
  children: React.ReactNode
  /** Pinned to the bottom, outside the scroll area, so the action is always reachable. */
  footer?: React.ReactNode
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-rule bg-surface outline-none"
        >
          {/* The drag handle is the affordance that tells someone this can be
              swiped away, so it is not decoration. */}
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-rule-strong" />

          <div className="flex items-start justify-between gap-4 px-5 pt-4">
            <div className="min-w-0">
              <Drawer.Title className="font-display text-xl font-bold leading-tight text-ink">
                {title}
              </Drawer.Title>
              {description && (
                <Drawer.Description className="mt-1 text-sm text-ink-soft">
                  {description}
                </Drawer.Description>
              )}
            </div>
            <Drawer.Close
              className="grid size-9 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-surface-sunk hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" />
            </Drawer.Close>
          </div>

          {/* Only the body scrolls, so the title and the action stay put. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && (
            <div className="shrink-0 border-t border-rule bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
