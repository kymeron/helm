/**
 * Hook to subscribe to tasks and apply filters/sort.
 */

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useTasksStore, useUIStore, selectActiveTasks } from '@/store'
import { applyFilters, sortTasks } from '@/lib/filters'
import type { Task, TaskStatus } from '@/types/task'

interface UseTasksResult {
  byStatus: Record<TaskStatus, Task[]>
  loading: boolean
  error: string | null
  allTasks: Task[]
}

export function useTasks(): UseTasksResult {
  const tasks = useTasksStore(useShallow(selectActiveTasks))
  const loading = useTasksStore((s) => s.loading)
  const error = useTasksStore((s) => s.error)
  const filters = useUIStore((s) => s.filters)
  const sortKey = useUIStore((s) => s.sortKey)
  const sortOrder = useUIStore((s) => s.sortOrder)
  const searchQuery = useUIStore((s) => s.searchQuery)

  const filteredAndSorted = useMemo(() => {
    const filtered = applyFilters(tasks, filters)
    const searched = searchQuery.trim()
      ? filtered.filter((t) => {
          const q = searchQuery.toLowerCase()
          return (
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.tags.some((tag) => tag.toLowerCase().includes(q))
          )
        })
      : filtered
    return sortTasks(searched, sortKey, sortOrder)
  }, [tasks, filters, sortKey, sortOrder, searchQuery])

  const byStatus = useMemo(() => {
    return {
      todo: filteredAndSorted.filter((t) => t.status === 'todo'),
      in_progress: filteredAndSorted.filter((t) => t.status === 'in_progress'),
      done: filteredAndSorted.filter((t) => t.status === 'done'),
    }
  }, [filteredAndSorted])

  return {
    byStatus,
    loading,
    error,
    allTasks: filteredAndSorted,
  }
}