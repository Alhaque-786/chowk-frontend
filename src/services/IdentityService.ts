import { request, tokens } from '@/lib/api/client'
import type { AuthResponse, User } from '@/lib/api/types'

/**
 * Authentication — the `identity` backend module.
 *
 * NOT cache-wrapped, and never will be. Every method here is a mutation called
 * from a client component, and React `cache` is a server-only API that throws in
 * the browser.
 *
 * This service owns TOKEN PERSISTENCE as well as the calls. That pairing is
 * deliberate: a login that succeeds but does not store its tokens looks like it
 * worked and then fails on the next request, which is a miserable bug to trace.
 * Keeping `tokens.set` in the same method as the call it belongs to makes the
 * two impossible to separate.
 */
const IdentityService = {
  /** Password registration. Stores the returned session on success. */
  register: async (input: {
    phone: string
    name: string
    password: string
    email?: string
  }): Promise<AuthResponse> => {
    const auth = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      auth: false,
      body: input,
    })
    tokens.set(auth.access_token, auth.refresh_token)
    return auth
  },

  /** Password login. */
  login: async (phone: string, password: string): Promise<AuthResponse> => {
    const auth = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { phone, password },
    })
    tokens.set(auth.access_token, auth.refresh_token)
    return auth
  },

  /**
   * Sends a login OTP.
   *
   * Returns nothing on purpose. The backend answers identically whether or not
   * the phone number is registered, because a different response for each would
   * turn this endpoint into a free "is this person a customer" oracle. Surfacing
   * that difference here would undo it.
   */
  requestOtp: async (phone: string): Promise<void> => {
    await request<unknown>('/auth/otp/request', {
      method: 'POST',
      auth: false,
      body: { phone },
    })
  },

  /** Exchanges an OTP for a session. Registers the user if they are new. */
  verifyOtp: async (phone: string, code: string): Promise<AuthResponse> => {
    const auth = await request<AuthResponse>('/auth/otp/verify', {
      method: 'POST',
      auth: false,
      body: { phone, code },
    })
    tokens.set(auth.access_token, auth.refresh_token)
    return auth
  },

  /**
   * Ends this session.
   *
   * Tokens are cleared even if the call fails. The alternative is worse: a user
   * who taps "log out", sees an error, and stays logged in on a shared phone.
   * A server-side session that outlives its tokens expires on its own.
   */
  logout: async (): Promise<void> => {
    try {
      await request<unknown>('/auth/logout', { method: 'POST' })
    } finally {
      tokens.clear()
    }
  },

  /** Ends every session for this user. For "sign out of all devices". */
  logoutEverywhere: async (): Promise<void> => {
    try {
      await request<unknown>('/auth/logout-all', { method: 'POST' })
    } finally {
      tokens.clear()
    }
  },

  /** Whether a session token is present. Says nothing about validity — only the
   *  server can rule on that, and the client must not pretend otherwise. */
  isSignedIn: (): boolean => tokens.access() !== null,
}

export default IdentityService

/** Re-exported so consumers do not import the User type from two places. */
export type { User }
