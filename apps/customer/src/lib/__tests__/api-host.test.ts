import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Where the API and the images live, per platform.
 *
 * This is the single most commonly botched thing when moving from web to mobile, and
 * every failure mode looks identical from the app: "Network request failed", which
 * is indistinguishable from the server being down. Two of them already happened:
 *
 *   1. Images 404'd on every card, because they are served by the NEXT app on :3000
 *      and I prefixed them with the API host on :8080.
 *   2. A real device could not reach anything, because `localhost` on a phone means
 *      the phone.
 *
 * `API_BASE_URL` is computed once at module load, so each case has to reset the
 * module registry and re-import. That is the cost of a module-level constant, and it
 * is worth paying here — the value must not change mid-session.
 */
const ORIGINAL_ENV = { ...process.env }

function load(opts: {
  platform?: 'ios' | 'android'
  hostUri?: string
  debuggerHost?: string
  explicit?: string
}) {
  vi.resetModules()
  if (opts.explicit === undefined) delete process.env.EXPO_PUBLIC_API_URL
  else process.env.EXPO_PUBLIC_API_URL = opts.explicit

  vi.doMock('react-native', () => ({ Platform: { OS: opts.platform ?? 'ios' } }))
  vi.doMock('expo-constants', () => ({
    default: {
      expoConfig: opts.hostUri ? { hostUri: opts.hostUri } : null,
      expoGoConfig: opts.debuggerHost ? { debuggerHost: opts.debuggerHost } : null,
    },
  }))
  return import('../api-host')
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.doUnmock('react-native')
  vi.doUnmock('expo-constants')
})

describe('API_BASE_URL', () => {
  it('uses the packager LAN address when there is one — a real device needs it', () => {
    const mod = load({ hostUri: '192.168.1.6:8081' })
    return mod.then((m) => {
      expect(m.API_BASE_URL).toBe('http://192.168.1.6:8080/api/v1')
    })
  })

  it('prefers the LAN address over the platform default', async () => {
    // Checked first on purpose: it is correct in every case where it exists,
    // including an emulator launched from a LAN-hosted packager.
    const m = await load({ platform: 'android', hostUri: '192.168.1.6:8081' })
    expect(m.API_BASE_URL).toBe('http://192.168.1.6:8080/api/v1')
  })

  it('falls back to the Android emulator host alias, not localhost', async () => {
    // 10.0.2.2 is the emulator's magic alias for its host machine. `localhost`
    // there is the emulator itself, so the request never leaves the VM.
    const m = await load({ platform: 'android' })
    expect(m.API_BASE_URL).toBe('http://10.0.2.2:8080/api/v1')
  })

  it('falls back to localhost on iOS, which shares the Mac network stack', async () => {
    const m = await load({ platform: 'ios' })
    expect(m.API_BASE_URL).toBe('http://localhost:8080/api/v1')
  })

  it('ignores a packager host of "localhost" so the Android branch still applies', async () => {
    // An emulator started from a localhost packager reports `localhost`, which is
    // useless to it. Accepting it would send Android back to a dead address.
    const m = await load({ platform: 'android', hostUri: 'localhost:8081' })
    expect(m.API_BASE_URL).toBe('http://10.0.2.2:8080/api/v1')
  })

  it('reads the older expoGoConfig.debuggerHost when hostUri is absent', async () => {
    const m = await load({ debuggerHost: '192.168.1.9:8081' })
    expect(m.API_BASE_URL).toBe('http://192.168.1.9:8080/api/v1')
  })

  it('lets an explicit env var override everything, for staging and prod', async () => {
    const m = await load({ hostUri: '192.168.1.6:8081', explicit: 'https://api.example.com/api/v1' })
    expect(m.API_BASE_URL).toBe('https://api.example.com/api/v1')
  })
})

describe('assetUrl', () => {
  it('points at the WEB port, not the API port', async () => {
    /*
      THE BUG THIS EXISTS FOR. Photographs are stored as root-relative paths and
      served from the Next app's public directory. :8080 does not serve them; :3000
      does. Prefixing with the API host 404s every image on every card, and an empty
      photo slot reads as missing data rather than a wrong port.
    */
    const m = await load({ hostUri: '192.168.1.6:8081' })
    expect(m.assetUrl('/dishes/cover-mughlai.jpg')).toBe(
      'http://192.168.1.6:3000/dishes/cover-mughlai.jpg',
    )
    expect(m.ASSET_BASE_URL).not.toContain('8080')
  })

  it('leaves an already-absolute URL alone', async () => {
    // Once images move to object storage the API returns absolute URLs, and this
    // function has to become a no-op rather than double-prefixing them.
    const m = await load({ hostUri: '192.168.1.6:8081' })
    const cdn = 'https://cdn.example.com/dishes/x.jpg'
    expect(m.assetUrl(cdn)).toBe(cdn)
  })

  it('strips the API path when deriving the asset host from an override', async () => {
    const m = await load({ explicit: 'https://api.example.com/api/v1' })
    expect(m.ASSET_BASE_URL).toBe('https://api.example.com')
  })
})

describe('describeApiHost', () => {
  it('explains which branch was taken, because a failed request gives no clue', async () => {
    expect((await load({ platform: 'android' })).describeApiHost()).toContain('10.0.2.2')
    expect((await load({ hostUri: '192.168.1.6:8081' })).describeApiHost()).toContain('LAN')
    expect((await load({ explicit: 'https://x/api/v1' })).describeApiHost()).toContain('override')
  })
})
