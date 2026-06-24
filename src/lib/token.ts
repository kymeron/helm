/**
 * User token lifecycle for cloud sync.
 *
 * HELM uses an anonymous, URL-safe token as the data partition key.
 *
 * The token MUST come from localStorage so that the same browser always
 * uses the same dataset. The URL is only consulted when the user opens
 * a "share link" that already contains `?token=xxx` — in that case we
 * adopt the shared token and persist it to localStorage.
 *
 * Crucially, we do NOT write the token back to the URL automatically.
 * Doing so would cause every new tab/device that opens the root URL to
 * receive its own freshly-generated token, splitting the dataset across
 * browsers. Users share the link explicitly via the "复制分享链接" button.
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
 * Read the token from the current URL query string (if present).
 *
 * This is only meaningful when the user follows a share link; we never
 * put the token there ourselves.
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
 * Build a shareable URL that includes the active token as `?token=xxx`.
 *
 * This is the ONLY way the token should end up in the URL. It must be
 * triggered explicitly by the user (via the "复制分享链接" button).
 */
export function buildShareUrl(token: string): string {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.origin + window.location.pathname)
  url.searchParams.set(TOKEN_PARAM, token)
  return url.toString()
}

/**
 * Resolve the active token:
 *   - If the URL has `?token=xxx` (user opened a share link), adopt it
 *     and persist to localStorage.
 *   - Otherwise, prefer localStorage so this browser keeps its dataset.
 *   - If neither, generate a new one and persist it (but never write
 *     to the URL).
 *
 * Returns the active token. Side effect: persists to localStorage.
 */
export function resolveToken(): string {
  const fromUrl = readTokenFromUrl()
  if (fromUrl) {
    persistToken(fromUrl)
    return fromUrl
  }

  const fromStorage = readTokenFromStorage()
  if (fromStorage) return fromStorage

  const generated = generateToken()
  persistToken(generated)
  return generated
}
