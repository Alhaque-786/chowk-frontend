import { api } from '@/lib/api/client'
import { tokens } from '@/lib/api/tokens'
import type { AuthResponse, OtpRequested, User } from '@/lib/api/types'

/**
 * Authentication — the `identity` backend module.
 *
 * NOT cache-wrapped, and never will be. Every method here is a mutation called
 * from a client component, and React `cache` is a server-only API that throws in
 * the browser.
 *
 * This service owns TOKEN AND USER PERSISTENCE as well as the calls. The user is
 * kept because there is no `GET /me` — the auth response is the only place the API
 * sends it, and discarding it left an account screen with nothing to display. That pairing is
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
    const auth = await api.post<AuthResponse>('/auth/register', input, { auth: false })
    tokens.set(auth.access_token, auth.refresh_token, auth.user)
    return auth
  },

  /** Password login. */
  login: async (phone: string, password: string): Promise<AuthResponse> => {
    const auth = await api.post<AuthResponse>('/auth/login', { phone, password }, { auth: false })
    tokens.set(auth.access_token, auth.refresh_token, auth.user)
    return auth
  },

  /**
   * Sends a login OTP.
   *
   * Returns the response body, which carries `debug_code` outside production so
   * local development needs no SMS provider. An earlier version returned void on
   * the reasoning that the response must not reveal whether a number is
   * registered — correct concern, wrong remedy: the BACKEND already answers
   * identically either way, and none of these fields distinguish the two cases.
   * Throwing the body away only hid the development code from the sign-in sheet.
   */
  requestOtp: async (phone: string): Promise<OtpRequested> =>
    api.post<OtpRequested>('/auth/otp/request', { phone }, { auth: false }),

  /** Exchanges an OTP for a session. Registers the user if they are new. */
  verifyOtp: async (phone: string, code: string): Promise<AuthResponse> => {
    const auth = await api.post<AuthResponse>('/auth/otp/verify', { phone, code }, { auth: false })
    tokens.set(auth.access_token, auth.refresh_token, auth.user)
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
      await api.post('/auth/logout')
    } finally {
      tokens.clear()
    }
  },

  /** Ends every session for this user. For "sign out of all devices". */
  logoutEverywhere: async (): Promise<void> => {
    try {
      await api.post('/auth/logout-all')
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
