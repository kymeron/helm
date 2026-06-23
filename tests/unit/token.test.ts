import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateToken,
  readTokenFromUrl,
  readTokenFromStorage,
  persistToken,
  reflectTokenInUrl,
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

  it('reflects token in URL without reloading', () => {
    reflectTokenInUrl('reflect-token')
    expect(window.location.search).toContain('token=reflect-token')
  })

  it('resolveToken prefers URL over localStorage', () => {
    window.localStorage.setItem('helm:cloud-sync-token', 'stored-token')
    window.history.replaceState({}, '', '/?token=url-token')
    const token = resolveToken()
    expect(token).toBe('url-token')
    expect(window.localStorage.getItem('helm:cloud-sync-token')).toBe('url-token')
  })

  it('resolveToken falls back to localStorage then generates new', () => {
    const token = resolveToken()
    expect(token.length).toBeGreaterThan(20)
    expect(window.location.search).toContain(`token=${encodeURIComponent(token)}`)
    expect(window.localStorage.getItem('helm:cloud-sync-token')).toBe(token)
  })

  it('gracefully handles localStorage being disabled', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('disabled')
    })
    expect(() => resolveToken()).not.toThrow()
    spy.mockRestore()
  })
})
