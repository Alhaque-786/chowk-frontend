'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Phone, ShieldCheck } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { onAuthRequired, type AuthRequest } from '@/lib/auth-gate'
import { messageFor } from '@/lib/api/errors'
import IdentityService from '@/services/IdentityService'

/**
 * The single sign-in sheet, mounted once in the layout.
 *
 * OTP rather than a password, because that is how every Indian food app signs
 * people in and because it removes a whole class of work: no reset flow, no email
 * deliverability, no password rules to explain. The customer already has their
 * phone.
 *
 * It settles the promise from `requireAuth` on EVERY exit path — success, cancel,
 * Escape, drag-dismiss. A path that forgets to settle leaves the caller's `await`
 * hanging forever, which presents as a button that did nothing at all.
 */
export function AuthSheet() {
  const [request, setRequest] = useState<AuthRequest | null>(null)
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const router = useRouter()

  /*
    Held in a ref as well as state.

    `close` runs from an event handler that may fire after the state has been
    cleared, and reading `request` there would read the already-cleared value and
    silently skip settling. The ref is the copy that is guaranteed current.
  */
  const pending = useRef<AuthRequest | null>(null)

  useEffect(
    () =>
      onAuthRequired((req) => {
        pending.current = req
        setRequest(req)
        setStep('phone')
        setPhone('')
        setCode('')
        setError(null)
        setDevCode(null)
      }),
    [],
  )

  function close(ok: boolean) {
    pending.current?.settle(ok)
    pending.current = null
    setRequest(null)
  }

  async function sendCode() {
    // Ten digits. Checked here only to save a round trip — the backend validates
    // properly and its message wins if the two ever disagree.
    const clean = phone.replace(/\D/g, '')
    if (clean.length !== 10) {
      setError('Enter a 10-digit mobile number.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await IdentityService.requestOtp(clean)
      setStep('code')
      // Development only: the API returns the code when it is not production, so
      // local testing needs no SMS provider. Shown rather than hidden — a tester
      // who cannot find the code is stuck.
      if (res.debug_code) setDevCode(res.debug_code)
    } catch (err) {
      setError(messageFor(err, 'Could not send the code. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    const clean = code.replace(/\D/g, '')
    if (clean.length < 4) {
      setError('Enter the code from your SMS.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await IdentityService.verifyOtp(phone.replace(/\D/g, ''), clean)
      close(true)
      // Re-render anything server-rendered that depends on a session now existing.
      router.refresh()
    } catch (err) {
      setError(messageFor(err, 'That code did not work. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={request !== null}
      // Any dismissal is a decline. vaul routes Escape, overlay click and drag
      // through this one callback, so all three settle without separate handlers.
      onOpenChange={(open) => {
        if (!open) close(false)
      }}
      title={step === 'phone' ? 'Sign in to continue' : 'Enter the code'}
      description={
        step === 'phone'
          ? request?.reason
          : `Sent to +91 ${phone.replace(/\D/g, '')}`
      }
      footer={
        <Button
          fullWidth
          size="lg"
          disabled={busy}
          onClick={step === 'phone' ? sendCode : verify}
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {step === 'phone' ? 'Send code' : 'Verify and continue'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {step === 'phone' ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Mobile number</span>
            <span className="flex items-center gap-2 rounded-xl border border-rule-strong bg-surface px-3.5 py-3 focus-within:border-brand/50">
              <Phone className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
              <span className="text-sm text-ink-faint">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void sendCode()
                }}
                placeholder="98765 43210"
                maxLength={11}
                className="tabular min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </span>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">6-digit code</span>
            <span className="flex items-center gap-2 rounded-xl border border-rule-strong bg-surface px-3.5 py-3 focus-within:border-brand/50">
              <ShieldCheck className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
              <input
                type="text"
                inputMode="numeric"
                // Lets the phone's SMS autofill offer the code directly.
                autoComplete="one-time-code"
                // The only field on a sheet the customer just opened on purpose.
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void verify()
                }}
                placeholder="123456"
                maxLength={6}
                className="tabular min-w-0 flex-1 bg-transparent text-base tracking-[0.3em] text-ink outline-none placeholder:tracking-normal placeholder:text-ink-faint"
              />
            </span>
          </label>
        )}

        {devCode && (
          <p className="rounded-xl bg-accent-soft px-3 py-2.5 text-sm text-accent">
            Development build — your code is{' '}
            <strong className="tabular font-semibold">{devCode}</strong>. This is
            never returned in production.
          </p>
        )}

        {error && (
          <p
            className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        )}

        {step === 'code' && (
          <button
            type="button"
            onClick={() => {
              setStep('phone')
              setError(null)
              setDevCode(null)
            }}
            className="self-start text-sm font-medium text-brand hover:underline"
          >
            Change number
          </button>
        )}

        <p className="text-xs leading-relaxed text-ink-faint">
          We use your number to confirm the order and for delivery updates.
          Nothing else.
        </p>
      </div>
    </Sheet>
  )
}
