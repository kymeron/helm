/**
 * Core types for HELM task management.
 * Single source of truth per data-model.md.
 */

export type TaskType = 'idea' | 'issue' | 'exploration'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  priority: Priority
  tags: string[]
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  completedAt: string | null // ISO 8601 or null
}

export interface TaskInput {
  title: string
  description?: string
  type: TaskType
  priority?: Priority
  tags?: string[]
}

export type TimeRange = 'today' | 'week' | 'month' | 'all'
export type SortKey = 'createdAt' | 'priority' | 'updatedAt'
export type SortOrder = 'asc' | 'desc'

export interface Filters {
  type: TaskType | 'all'
  priority: Priority | 'all'
  tag: string | null
}

export interface HelmExport {
  version: 1
  exportedAt: string // ISO 8601
  tasks: Task[]
}

// Type color mapping per constitution
export const TYPE_COLORS: Record<TaskType, string> = {
  idea: 'idea',       // amber-400
  issue: 'issue',     // red-400
  exploration: 'exploration', // teal-400
}

// Priority order for sorting
export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
}