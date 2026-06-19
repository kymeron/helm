/**
 * Task state machine for HELM.
 * Handles status transitions with completedAt linkage.
 */

import type { Task, TaskStatus } from '@/types/task'

/**
 * Check if a transition is valid.
 * For v1, all transitions are allowed (no restrictions).
 */
export function canTransition(_from: TaskStatus, _to: TaskStatus): boolean {
  // v1: All transitions allowed per spec (US1 acceptance scenario 6)
  return true
}

/**
 * Apply a status transition to a task.
 * Returns a new task object (immutable update).
 * Handles completedAt linkage:
 * - Transition to 'done' → set completedAt to now
 * - Transition from 'done' → clear completedAt
 * - Other transitions → keep completedAt unchanged
 */
export function applyTransition(task: Task, to: TaskStatus): Task {
  const now = new Date().toISOString()
  
  let completedAt: string | null
  
  if (to === 'done') {
    // Transitioning to done: set completedAt if not already done
    if (task.status === 'done') {
      // Already done, preserve existing completedAt
      completedAt = task.completedAt
    } else {
      // Newly done, set completedAt
      completedAt = now
    }
  } else if (task.status === 'done') {
    // Transitioning from done: clear completedAt
    completedAt = null
  } else {
    // Other transitions: preserve existing completedAt
    completedAt = task.completedAt
  }
  
  return {
    ...task,
    status: to,
    completedAt,
    updatedAt: now,
  }
}