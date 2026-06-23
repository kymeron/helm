/**
 * User token lifecycle for cloud sync.
 *
 * HELM uses an anonymous, URL-safe token as the data partition key.
 * The token is read from the URL first (so users can share/bookmark),
 * then falls back to localStorage, and finally generates a new one if
 * neither source has it. The active token is always reflected in the URL.
 */

const TOKEN_KEY = 'helm:cloud-sync-token'
const TOKEN_PARAM = 'token'

/**
 * Generate a 24-byte URL-safe random token.
 */
export function generateToken(): string {
  const array = new Uint8Array(24)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Fallback for very old environments (e.g. iPad Safari < 15.4).
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Read the token from the current URL query string.
 */
export function readTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const token = params.get(TOKEN_PARAM)
  return token && token.length > 0 ? token : null
}

/**
 * Read the token persisted in localStorage.
 */
export function readTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    // localStorage may be disabled in private mode or by policy.
    return null
  }
}

/**
 * Persist the token to localStorage.
 */
export function persistToken(token: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Ignore write failures (private mode, quota exceeded).
  }
}

/**
 * Reflect the active token in the URL without reloading the page.
 */
export function reflectTokenInUrl(token: string): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const current = url.searchParams.get(TOKEN_PARAM)
  if (current === token) return
  url.searchParams.set(TOKEN_PARAM, token)
  window.history.replaceState({}, '', url.toString())
}

/**
 * Resolve the active token using the precedence:
 *   URL query > localStorage > generate new
 *
 * Side effects: persists and reflects the resolved token.
 */
export function resolveToken(): string {
  const fromUrl = readTokenFromUrl()
  if (fromUrl) {
    persistToken(fromUrl)
    return fromUrl
  }

  const fromStorage = readTokenFromStorage()
  if (fromStorage) {
    reflectTokenInUrl(fromStorage)
    return fromStorage
  }

  const generated = generateToken()
  persistToken(generated)
  reflectTokenInUrl(generated)
  return generated
}
