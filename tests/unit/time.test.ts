import { describe, it, expect } from 'vitest'
import { getRange } from '@/lib/time'

describe('time', () => {
  describe('getRange', () => {
    // Use a fixed date for consistent testing
    const now = new Date('2026-06-19T12:00:00Z')

    it('returns correct range for "today"', () => {
      const result = getRange('today', now)
      
      expect(result.start).toBe('2026-06-19T00:00:00.000Z')
      expect(result.end).toBe('2026-06-19T23:59:59.999Z')
    })

    it('returns correct range for "week" (rolling 7 days)', () => {
      const result = getRange('week', now)
      
      // 6 days ago from 2026-06-19 (7 days total including today)
      expect(result.start).toBe('2026-06-13T00:00:00.000Z')
      expect(result.end).toBe('2026-06-19T23:59:59.999Z')
    })

    it('returns correct range for "month"', () => {
      const result = getRange('month', now)
      
      // Start of current month
      expect(result.start).toBe('2026-06-01T00:00:00.000Z')
      expect(result.end).toBe('2026-06-19T23:59:59.999Z')
    })

    it('returns unbounded range for "all"', () => {
      const result = getRange('all', now)
      
      expect(result.start).toBe(null)
      expect(result.end).toBe(null)
    })

    it('uses current time when now parameter not provided', () => {
      const result = getRange('today')
      
      // Implementation uses UTC, so compare UTC date
      const today = new Date()
      const utcDate = today.toISOString().slice(0, 10)
      
      expect(result.start!.slice(0, 10)).toBe(utcDate)
    })

    it('handles edge case: week crossing month boundary', () => {
      // Test on June 3rd - week should start 6 days before (May 28)
      const testDate = new Date('2026-06-03T12:00:00Z')
      const result = getRange('week', testDate)
      
      expect(result.start).toBe('2026-05-28T00:00:00.000Z')
      expect(result.end).toBe('2026-06-03T23:59:59.999Z')
    })
  })
})