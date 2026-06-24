import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateToken,
  readTokenFromUrl,
  readTokenFromStorage,
  persistToken,
  buildShareUrl,
  resolveToken,
} from '@/lib/token'

describe('token', () => {
  beforeEach(() => {
    // Reset URL and localStorage before each test.
    window.history.replaceState({}, '', '/')
    window.localStorage.clear()
  })

  it('generates a URL-safe token of expected length', () => {
    const token = generateToken()
    expect(token.length).toBeGreaterThan(20)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates unique tokens', () => {
    const a = generateToken()
    const b = generateToken()
    expect(a).not.toBe(b)
  })

  it('reads token from URL query parameter', () => {
    window.history.replaceState({}, '', '/?token=url-token')
    expect(readTokenFromUrl()).toBe('url-token')
  })

  it('returns null when URL has no token', () => {
    expect(readTokenFromUrl()).toBeNull()
  })

  it('reads token from localStorage', () => {
    window.localStorage.setItem('helm:cloud-sync-token', 'stored-token')
    expect(readTokenFromStorage()).toBe('stored-token')
  })

  it('persists token to localStorage', () => {
    persistToken('my-token')
    expect(window.localStorage.getItem('helm:cloud-sync-token')).toBe('my-token')
  })

  it('buildShareUrl includes the token as ?token=xxx', () => {
    window.history.replaceState({}, '', '/dashboard')
    const url = buildShareUrl('my-token')
    expect(url).toContain('/dashboard?token=my-token')
  })

  it('resolveToken adopts URL token (share link) and persists to localStorage', () => {
    window.history.replaceState({}, '', '/?token=url-token')
    const token = resolveToken()
    expect(token).toBe('url-token')
    expect(window.localStorage.getItem('helm:cloud-sync-token')).toBe('url-token')
  })

  it('resolveToken prefers localStorage over generating new', () => {
    window.localStorage.setItem('helm:cloud-sync-token', 'stored-token')
    const token = resolveToken()
    expect(token).toBe('stored-token')
  })

  it('resolveToken generates and persists a new token when none exists, without touching URL', () => {
    const token = resolveToken()
    expect(token.length).toBeGreaterThan(20)
    expect(window.localStorage.getItem('helm:cloud-sync-token')).toBe(token)
    // URL MUST remain clean so opening the root URL in another browser
    // does not receive this token and split the dataset.
    expect(window.location.search).toBe('')
  })

  it('does not write the token back to the URL when resolving', () => {
    window.localStorage.setItem('helm:cloud-sync-token', 'existing')
    resolveToken()
    expect(window.location.search).toBe('')
  })

  it('gracefully handles localStorage being disabled', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('disabled')
    })
    expect(() => resolveToken()).not.toThrow()
    spy.mockRestore()
  })
})
