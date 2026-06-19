import { describe, it, expect } from 'vitest'
import { canTransition, applyTransition } from '@/lib/state-machine'
import type { Task, TaskStatus } from '@/types/task'

function createMockTask(status: TaskStatus, completedAt: string | null = null): Task {
  return {
    id: 'test-id',
    title: 'Test Task',
    description: '',
    type: 'idea',
    status,
    priority: 'medium',
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    completedAt,
  }
}

describe('state-machine', () => {
  describe('canTransition', () => {
    it('allows all transitions for v1 (no restrictions)', () => {
      const statuses: TaskStatus[] = ['todo', 'in_progress', 'done']
      
      for (const from of statuses) {
        for (const to of statuses) {
          expect(canTransition(from, to)).toBe(true)
        }
      }
    })

    it('allows todo -> in_progress', () => {
      expect(canTransition('todo', 'in_progress')).toBe(true)
    })

    it('allows todo -> done', () => {
      expect(canTransition('todo', 'done')).toBe(true)
    })

    it('allows in_progress -> todo', () => {
      expect(canTransition('in_progress', 'todo')).toBe(true)
    })

    it('allows in_progress -> done', () => {
      expect(canTransition('in_progress', 'done')).toBe(true)
    })

    it('allows done -> todo (rollback)', () => {
      expect(canTransition('done', 'todo')).toBe(true)
    })

    it('allows done -> in_progress (rollback)', () => {
      expect(canTransition('done', 'in_progress')).toBe(true)
    })
  })

  describe('applyTransition', () => {
    it('sets completedAt when transitioning to done', () => {
      const task = createMockTask('in_progress')
      const result = applyTransition(task, 'done')
      
      expect(result.status).toBe('done')
      expect(result.completedAt).not.toBe(null)
      expect(result.updatedAt).not.toBe(task.updatedAt)
    })

    it('clears completedAt when transitioning from done to other status', () => {
      const task = createMockTask('done', '2026-01-02T00:00:00Z')
      const result = applyTransition(task, 'in_progress')
      
      expect(result.status).toBe('in_progress')
      expect(result.completedAt).toBe(null)
      expect(result.updatedAt).not.toBe(task.updatedAt)
    })

    it('keeps completedAt null when transitioning between non-done statuses', () => {
      const task = createMockTask('todo')
      const result = applyTransition(task, 'in_progress')
      
      expect(result.status).toBe('in_progress')
      expect(result.completedAt).toBe(null)
      expect(result.updatedAt).not.toBe(task.updatedAt)
    })

    it('preserves completedAt when staying in done status', () => {
      const completedAt = '2026-01-02T00:00:00Z'
      const task = createMockTask('done', completedAt)
      const result = applyTransition(task, 'done')
      
      expect(result.status).toBe('done')
      expect(result.completedAt).toBe(completedAt)
      expect(result.updatedAt).not.toBe(task.updatedAt)
    })

    it('returns immutable update (does not mutate original)', () => {
      const task = createMockTask('todo')
      const result = applyTransition(task, 'done')
      
      expect(task.status).toBe('todo')
      expect(task.completedAt).toBe(null)
      expect(result.status).toBe('done')
      expect(result.completedAt).not.toBe(null)
    })
  })
})