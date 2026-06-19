import { describe, it, expect } from 'vitest'
import { computeMetrics, computeTypeDistribution, computeTrend } from '@/lib/stats'
import type { Task } from '@/types/task'

function createMockTask(
  overrides: Partial<Task> = {}
): Task {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    title: 'Test Task',
    description: '',
    type: 'idea',
    status: 'todo',
    priority: 'medium',
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    completedAt: null,
    deletedAt: null,
    ...overrides,
  }
}

describe('stats', () => {
  const now = new Date('2026-06-19T12:00:00Z')

  describe('computeMetrics', () => {
    it('returns zero metrics for empty tasks', () => {
      const result = computeMetrics([], now)
      
      expect(result.total).toBe(0)
      expect(result.todo).toBe(0)
      expect(result.inProgress).toBe(0)
      expect(result.done).toBe(0)
      expect(result.completionRate).toBe(0)
      expect(result.weeklyNew).toBe(0)
      expect(result.weeklyDone).toBe(0)
    })

    it('counts tasks by status', () => {
      const tasks: Task[] = [
        createMockTask({ status: 'todo' }),
        createMockTask({ status: 'todo' }),
        createMockTask({ status: 'in_progress' }),
        createMockTask({ status: 'done', completedAt: '2026-06-15T00:00:00Z' }),
      ]
      
      const result = computeMetrics(tasks, now)
      
      expect(result.total).toBe(4)
      expect(result.todo).toBe(2)
      expect(result.inProgress).toBe(1)
      expect(result.done).toBe(1)
    })

    it('calculates completion rate correctly', () => {
      const tasks: Task[] = [
        createMockTask({ status: 'todo' }),
        createMockTask({ status: 'done', completedAt: '2026-06-15T00:00:00Z' }),
      ]
      
      const result = computeMetrics(tasks, now)
      
      expect(result.completionRate).toBe(0.5)
    })

    it('returns 0 completion rate when no tasks', () => {
      const result = computeMetrics([], now)
      expect(result.completionRate).toBe(0)
    })

    it('counts weekly new tasks (created within 7 days)', () => {
      const tasks: Task[] = [
        createMockTask({ createdAt: '2026-06-13T00:00:00Z' }), // 6 days ago - within week
        createMockTask({ createdAt: '2026-06-19T10:00:00Z' }), // today - within week
        createMockTask({ createdAt: '2026-06-10T00:00:00Z' }), // 9 days ago - outside week
      ]
      
      const result = computeMetrics(tasks, now)
      
      expect(result.weeklyNew).toBe(2)
    })

    it('counts weekly done tasks (completed within 7 days)', () => {
      const tasks: Task[] = [
        createMockTask({
          status: 'done',
          completedAt: '2026-06-13T00:00:00Z', // 6 days ago - within week
        }),
        createMockTask({
          status: 'done',
          completedAt: '2026-06-19T10:00:00Z', // today - within week
        }),
        createMockTask({
          status: 'done',
          completedAt: '2026-06-10T00:00:00Z', // 9 days ago - outside week
        }),
      ]
      
      const result = computeMetrics(tasks, now)
      
      expect(result.weeklyDone).toBe(2)
    })

    it('uses current time when now parameter not provided', () => {
      const tasks: Task[] = [
        createMockTask({ createdAt: new Date().toISOString() }),
      ]
      
      const result = computeMetrics(tasks)
      
      expect(result.weeklyNew).toBe(1)
    })

    it('calculates average completion cycle in days', () => {
      const tasks: Task[] = [
        createMockTask({
          status: 'done',
          createdAt: '2026-06-10T00:00:00Z',
          completedAt: '2026-06-13T00:00:00Z', // 3 days
        }),
        createMockTask({
          status: 'done',
          createdAt: '2026-06-01T00:00:00Z',
          completedAt: '2026-06-11T00:00:00Z', // 10 days
        }),
      ]
      
      const result = computeMetrics(tasks, now)
      
      expect(result.averageCycleDays).toBeCloseTo(6.5, 1)
    })

    it('returns 0 average cycle when no completed tasks', () => {
      const tasks: Task[] = [
        createMockTask({ status: 'todo' }),
        createMockTask({ status: 'in_progress' }),
      ]
      
      const result = computeMetrics(tasks, now)
      
      expect(result.averageCycleDays).toBe(0)
    })
  })

  describe('computeTypeDistribution', () => {
    it('returns distribution with all three types', () => {
      const tasks: Task[] = [
        createMockTask({ type: 'idea' }),
        createMockTask({ type: 'idea' }),
        createMockTask({ type: 'issue' }),
        createMockTask({ type: 'exploration' }),
      ]
      
      const result = computeTypeDistribution(tasks)
      
      expect(result).toHaveLength(3)
      
      const ideaData = result.find(d => d.type === 'idea')
      const issueData = result.find(d => d.type === 'issue')
      const explorationData = result.find(d => d.type === 'exploration')
      
      expect(ideaData?.count).toBe(2)
      expect(issueData?.count).toBe(1)
      expect(explorationData?.count).toBe(1)
    })

    it('returns zero counts for types with no tasks', () => {
      const tasks: Task[] = [
        createMockTask({ type: 'idea' }),
      ]
      
      const result = computeTypeDistribution(tasks)
      
      expect(result).toHaveLength(3)
      
      const ideaData = result.find(d => d.type === 'idea')
      const issueData = result.find(d => d.type === 'issue')
      const explorationData = result.find(d => d.type === 'exploration')
      
      expect(ideaData?.count).toBe(1)
      expect(issueData?.count).toBe(0)
      expect(explorationData?.count).toBe(0)
    })

    it('returns all zeros for empty tasks', () => {
      const result = computeTypeDistribution([])
      
      expect(result).toHaveLength(3)
      expect(result.every(d => d.count === 0)).toBe(true)
    })
  })

  describe('computeTrend', () => {
    it('returns 30 days of data', () => {
      const result = computeTrend([], now)

      expect(result).toHaveLength(30)
    })

    it('includes today as the last day', () => {
      const result = computeTrend([], now)
      
      const lastDay = result[result.length - 1]
      expect(lastDay?.date).toBe('2026-06-19')
    })

    it('counts completed tasks per day', () => {
      const tasks: Task[] = [
        createMockTask({
          status: 'done',
          completedAt: '2026-06-19T10:00:00Z', // today
        }),
        createMockTask({
          status: 'done',
          completedAt: '2026-06-19T15:00:00Z', // today (2nd)
        }),
        createMockTask({
          status: 'done',
          completedAt: '2026-06-17T10:00:00Z', // 2 days ago
        }),
        createMockTask({
          status: 'done',
          completedAt: '2026-05-01T00:00:00Z', // outside 30 days
        }),
      ]

      const result = computeTrend(tasks, now)

      const today = result.find((d: { date: string }) => d.date === '2026-06-19')
      const twoDaysAgo = result.find((d: { date: string }) => d.date === '2026-06-17')

      expect(today?.completed).toBe(2)
      expect(twoDaysAgo?.completed).toBe(1)
    })

    it('returns zero counts for days with no completions', () => {
      const result = computeTrend([], now)

      expect(result.every((d: { created: number; completed: number }) => d.created === 0 && d.completed === 0)).toBe(true)
    })

    it('uses current time when now parameter not provided', () => {
      const result = computeTrend([])
      
      expect(result).toHaveLength(30)
      
      const today = new Date().toISOString().slice(0, 10)
      const lastDay = result[result.length - 1]
      expect(lastDay?.date).toBe(today)
    })
  })
})