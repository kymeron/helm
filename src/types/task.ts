/**
 * Core types for HELM task management.
 * Single source of truth per data-model.md.
 */

export type TaskType = 'idea' | 'issue' | 'exploration'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'

/**
 * 类型本身也是标签。这三个值作为特殊标签存放在 Task.tags 中，
 * 通过 getTaskType() 从 tags 派生类型。
 */
export const TYPE_TAGS: readonly TaskType[] = ['idea', 'issue', 'exploration']

/**
 * 从标签中派生任务类型。返回第一个匹配的类型标签，无则 null。
 */
export function getTaskType(tags: string[]): TaskType | null {
  for (const t of TYPE_TAGS) {
    if (tags.includes(t)) return t
  }
  return null
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  tags: string[]
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  completedAt: string | null // ISO 8601 or null
  /**
   * Soft-delete tombstone. When set, the task is treated as deleted and
   * hidden from the UI, but the record is preserved so the LAN sync layer
   * can propagate the deletion to other devices (which would otherwise
   * be impossible once the row is physically removed).
   */
  deletedAt: string | null
}

export interface TaskInput {
  title: string
  description?: string
  priority?: Priority
  tags?: string[]
}

export type TimeRange = 'today' | 'week' | 'month' | 'all'
export type SortKey = 'createdAt' | 'priority' | 'updatedAt'
export type SortOrder = 'asc' | 'desc'

export interface Filters {
  type: TaskType | 'all'
  priority: Priority | 'all'
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