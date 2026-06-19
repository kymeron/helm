/**
 * Time range utilities for HELM statistics.
 */

import type { TimeRange } from '@/types/task'

interface TimeRangeResult {
  start: string | null // ISO 8601 or null (unbounded)
  end: string | null   // ISO 8601 or null (unbounded)
}

/**
 * Get the time range boundaries for a given range type.
 * Uses rolling calculation (not natural week/month).
 */
export function getRange(range: TimeRange, now?: Date): TimeRangeResult {
  const reference = now ?? new Date()
  
  // Get start of today in UTC
  const todayStart = new Date(
    Date.UTC(reference.getFullYear(), reference.getMonth(), reference.getDate(), 0, 0, 0, 0)
  )
  
  // Get end of today in UTC
  const todayEnd = new Date(
    Date.UTC(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59, 999)
  )
  
  switch (range) {
    case 'today':
      return {
        start: todayStart.toISOString(),
        end: todayEnd.toISOString(),
      }
    
    case 'week':
      // Rolling 7 days (including today)
      const weekStart = new Date(todayStart)
      weekStart.setUTCDate(weekStart.getUTCDate() - 6) // 7 days including today
      return {
        start: weekStart.toISOString(),
        end: todayEnd.toISOString(),
      }
    
    case 'month':
      // Start of current month to today
      const monthStart = new Date(
        Date.UTC(reference.getFullYear(), reference.getMonth(), 1, 0, 0, 0, 0)
      )
      return {
        start: monthStart.toISOString(),
        end: todayEnd.toISOString(),
      }
    
    case 'all':
      // Unbounded range
      return {
        start: null,
        end: null,
      }
    
    default:
      throw new Error(`Unknown time range: ${range}`)
  }
}

/**
 * Check if a date string falls within a time range.
 */
export function isWithinRange(dateStr: string | null, range: TimeRangeResult): boolean {
  if (!dateStr) return false
  if (range.start === null && range.end === null) return true
  
  const date = new Date(dateStr)
  
  if (range.start && date < new Date(range.start)) return false
  if (range.end && date > new Date(range.end)) return false
  
  return true
}