/**
 * Filter and sort utilities for HELM tasks.
 */

import type { Task, Filters, SortKey, SortOrder } from '@/types/task'
import { PRIORITY_ORDER as priorityMap } from '@/types/task'

/**
 * Apply filters to a task list.
 * Multiple filters use AND relationship.
 */
export function applyFilters(tasks: Task[], filters: Filters): Task[] {
  return tasks.filter((task) => {
    // Type filter — 类型本身也是标签，检查 tags 是否包含该类型标签
    if (filters.type !== 'all' && !task.tags.includes(filters.type)) {
      return false
    }

    // Priority filter
    if (filters.priority !== 'all' && task.priority !== filters.priority) {
      return false
    }

    // Tag filter
    if (filters.tag !== null && !task.tags.includes(filters.tag)) {
      return false
    }

    return true
  })
}

/**
 * Sort tasks by a given key and order.
 */
export function sortTasks(tasks: Task[], key: SortKey, order: SortOrder): Task[] {
  const sorted = [...tasks]

  sorted.sort((a, b) => {
    let comparison: number

    switch (key) {
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'updatedAt':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
      case 'priority':
        comparison = priorityMap[a.priority] - priorityMap[b.priority]
        break
      default:
        comparison = 0
    }

    return order === 'asc' ? comparison : -comparison
  })

  return sorted
}