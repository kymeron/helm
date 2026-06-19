/**
 * Statistics aggregation utilities for HELM.
 * Pure functions for computing metrics and chart data.
 */

import type { Task, TaskType } from '@/types/task'
import { getRange, isWithinRange } from '@/lib/time'

export interface Metrics {
  total: number
  todo: number
  inProgress: number
  done: number
  completionRate: number // 0~1
  weeklyNew: number
  weeklyDone: number
  averageCycleDays: number // avg creation→completion time
}

export interface TypeDistribution {
  type: TaskType
  count: number
}

export interface CompletionTrendDay {
  date: string // YYYY-MM-DD
  count: number
}

export interface TrendDay {
  date: string // YYYY-MM-DD
  created: number
  completed: number
}

export interface HeatmapDay {
  date: string // YYYY-MM-DD
  count: number
}

/**
 * Compute core metrics from tasks.
 * @param tasks All tasks
 * @param now Reference time (defaults to current time)
 */
export function computeMetrics(tasks: Task[], now: Date = new Date()): Metrics {
  const total = tasks.length
  const todo = tasks.filter((t) => t.status === 'todo').length
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length
  const done = tasks.filter((t) => t.status === 'done').length
  const completionRate = total === 0 ? 0 : done / total

  // Weekly range (rolling 7 days)
  const weekRange = getRange('week', now)
  
  const weeklyNew = tasks.filter((t) =>
    isWithinRange(t.createdAt, weekRange)
  ).length

  const weeklyDone = tasks.filter((t) =>
    t.completedAt !== null && isWithinRange(t.completedAt, weekRange)
  ).length

  // Average completion cycle (days from creation to completion)
  const completedTasks = tasks.filter((t) => t.completedAt !== null)
  const averageCycleDays = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => {
        const created = new Date(t.createdAt).getTime()
        const completed = new Date(t.completedAt!).getTime()
        return sum + (completed - created) / (1000 * 60 * 60 * 24)
      }, 0) / completedTasks.length
    : 0

  return {
    total,
    todo,
    inProgress,
    done,
    completionRate,
    weeklyNew,
    weeklyDone,
    averageCycleDays,
  }
}

/**
 * Compute type distribution for donut chart.
 * Always returns all three types (with 0 count if no tasks).
 */
export function computeTypeDistribution(tasks: Task[]): TypeDistribution[] {
  const types: TaskType[] = ['idea', 'issue', 'exploration']
  
  return types.map((type) => ({
    type,
    count: tasks.filter((t) => t.type === type).length,
  }))
}

/**
 * Compute activity heatmap data (last 12 weeks).
 * Counts tasks created or completed on each day.
 * @param tasks All tasks
 * @param now Reference time (defaults to current time)
 */
export function computeHeatmapData(tasks: Task[], now: Date = new Date()): HeatmapDay[] {
  const days: HeatmapDay[] = []
  const totalDays = 84 // 12 weeks

  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() - i)
    const dateStr = date.toISOString().slice(0, 10)

    const count = tasks.filter((t) => {
      const created = t.createdAt.slice(0, 10)
      const completed = t.completedAt?.slice(0, 10)
      return created === dateStr || completed === dateStr
    }).length

    days.push({ date: dateStr, count })
  }

  return days
}

/**
 * Compute creation & completion trend for dual-line chart (last 30 days).
 * @param tasks All tasks
 * @param now Reference time (defaults to current time)
 */
export function computeTrend(tasks: Task[], now: Date = new Date()): TrendDay[] {
  const days: TrendDay[] = []

  // Generate 30 days ending today
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() - i)
    const dateStr = date.toISOString().slice(0, 10)

    const created = tasks.filter((t) => t.createdAt.slice(0, 10) === dateStr).length
    const completed = tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) === dateStr).length

    days.push({ date: dateStr, created, completed })
  }

  return days
}