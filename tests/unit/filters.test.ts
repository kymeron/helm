import { describe, it, expect } from 'vitest'
import { applyFilters, sortTasks } from '@/lib/filters'
import type { Task, Filters } from '@/types/task'

function createMockTask(
  type: 'idea' | 'issue' | 'exploration' | 'none' = 'idea',
  priority: 'low' | 'medium' | 'high' = 'medium',
  tags: string[] = [],
  createdAt: string = '2026-01-01T00:00:00Z',
  updatedAt: string = '2026-01-01T00:00:00Z'
): Task {
  // 类型本身也是标签：将类型并入 tags
  const allTags = type === 'none' ? tags : [type, ...tags]
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    title: 'Test Task',
    description: '',
    status: 'todo',
    priority,
    tags: allTags,
    createdAt,
    updatedAt,
    completedAt: null,
      deletedAt: null,
  }
}

describe('filters', () => {
  describe('applyFilters', () => {
    const tasks: Task[] = [
      createMockTask('idea', 'high', ['work']),
      createMockTask('issue', 'medium', ['personal']),
      createMockTask('exploration', 'low', ['work', 'learning']),
    ]

    it('returns all tasks when filters are "all"', () => {
      const filters: Filters = { type: 'all', priority: 'all' }
      const result = applyFilters(tasks, filters)
      expect(result).toHaveLength(3)
    })

    it('filters by type (type is a tag)', () => {
      const filters: Filters = { type: 'idea', priority: 'all' }
      const result = applyFilters(tasks, filters)
      expect(result).toHaveLength(1)
      expect(result[0]!.tags.includes('idea')).toBe(true)
    })

    it('filters by priority', () => {
      const filters: Filters = { type: 'all', priority: 'high' }
      const result = applyFilters(tasks, filters)
      expect(result).toHaveLength(1)
      expect(result[0]!.priority).toBe('high')
    })

    it('combines filters (AND relationship)', () => {
      const filters: Filters = { type: 'exploration', priority: 'low' }
      const result = applyFilters(tasks, filters)
      expect(result).toHaveLength(1)
      expect(result[0]!.tags.includes('exploration')).toBe(true)
      expect(result[0]!.priority).toBe('low')
    })

    it('returns empty array when no match', () => {
      const filters: Filters = { type: 'idea', priority: 'low' }
      const result = applyFilters(tasks, filters)
      expect(result).toHaveLength(0)
    })

    it('handles empty tasks array', () => {
      const filters: Filters = { type: 'all', priority: 'all' }
      const result = applyFilters([], filters)
      expect(result).toHaveLength(0)
    })
  })

  describe('sortTasks', () => {
    const tasks: Task[] = [
      createMockTask('idea', 'medium', [], '2026-01-03T00:00:00Z', '2026-01-05T00:00:00Z'),
      createMockTask('issue', 'high', [], '2026-01-01T00:00:00Z', '2026-01-03T00:00:00Z'),
      createMockTask('exploration', 'low', [], '2026-01-02T00:00:00Z', '2026-01-04T00:00:00Z'),
    ]

    it('sorts by createdAt ascending', () => {
      const result = sortTasks(tasks, 'createdAt', 'asc')
      expect(result[0]!.createdAt).toBe('2026-01-01T00:00:00Z')
      expect(result[2]!.createdAt).toBe('2026-01-03T00:00:00Z')
    })

    it('sorts by createdAt descending', () => {
      const result = sortTasks(tasks, 'createdAt', 'desc')
      expect(result[0]!.createdAt).toBe('2026-01-03T00:00:00Z')
      expect(result[2]!.createdAt).toBe('2026-01-01T00:00:00Z')
    })

    it('sorts by priority ascending (low to high)', () => {
      const result = sortTasks(tasks, 'priority', 'asc')
      expect(result[0]!.priority).toBe('low')
      expect(result[2]!.priority).toBe('high')
    })

    it('sorts by priority descending (high to low)', () => {
      const result = sortTasks(tasks, 'priority', 'desc')
      expect(result[0]!.priority).toBe('high')
      expect(result[2]!.priority).toBe('low')
    })

    it('sorts by updatedAt ascending', () => {
      const result = sortTasks(tasks, 'updatedAt', 'asc')
      expect(result[0]!.updatedAt).toBe('2026-01-03T00:00:00Z')
      expect(result[2]!.updatedAt).toBe('2026-01-05T00:00:00Z')
    })

    it('sorts by updatedAt descending', () => {
      const result = sortTasks(tasks, 'updatedAt', 'desc')
      expect(result[0]!.updatedAt).toBe('2026-01-05T00:00:00Z')
      expect(result[2]!.updatedAt).toBe('2026-01-03T00:00:00Z')
    })

    it('returns same array when empty', () => {
      const result = sortTasks([], 'createdAt', 'asc')
      expect(result).toHaveLength(0)
    })

    it('does not mutate original array', () => {
      const original = [...tasks]
      sortTasks(tasks, 'createdAt', 'desc')
      expect(tasks).toEqual(original)
    })
  })
})