/**
 * Tasks store for HELM.
 * Manages task CRUD, status transitions, and IndexedDB persistence.
 */

import { create } from 'zustand'
import type { Task, TaskInput, TaskStatus } from '@/types/task'
import * as db from '@/lib/db'
import { applyTransition } from '@/lib/state-machine'
import { downloadTasks } from '@/lib/export'

interface TasksState {
  tasks: Task[]
  loading: boolean
  error: string | null
  initialized: boolean
}

interface TasksActions {
  init: () => Promise<void>
  createTask: (input: TaskInput) => Promise<Task>
  updateTask: (id: string, patch: Partial<TaskInput>) => Promise<void>
  transitionStatus: (id: string, to: TaskStatus) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  /**
   * Replace the entire task list (used by the LAN sync layer to apply
   * a remote snapshot). The tasks are persisted to IndexedDB so they
   * survive page reloads.
   */
  replaceAllTasks: (tasks: Task[]) => Promise<void>
  exportTasks: () => Promise<void>
  clearError: () => void
}

export type TasksStore = TasksState & TasksActions

/** Select tasks that are not soft-deleted (tombstones hidden). */
export function selectActiveTasks(state: TasksState): Task[] {
  return state.tasks.filter((t) => !t.deletedAt)
}

export const useTasksStore = create<TasksStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  initialized: false,

  init: async () => {
    set({ loading: true, error: null })
    try {
      await db.seedIfEmpty()
      const tasks = await db.getAllTasks()
      set({ tasks, loading: false, initialized: true })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  createTask: async (input) => {
    set({ loading: true, error: null })
    try {
      const task = await db.createTask(input)
      set((state) => ({ tasks: [...state.tasks, task], loading: false }))
      return task
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  updateTask: async (id, patch) => {
    set({ loading: true, error: null })
    try {
      const updated = await db.updateTask(id, patch)
      if (updated) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
          loading: false,
        }))
      } else {
        set({ error: 'Task not found', loading: false })
      }
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  transitionStatus: async (id, to) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) {
      set({ error: 'Task not found' })
      return
    }

    const updated = applyTransition(task, to)
    set({ loading: true, error: null })
    try {
      const saved = await db.updateTaskStatus(id, to, updated.completedAt)
      if (saved) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? saved : t)),
          loading: false,
        }))
      }
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  deleteTask: async (id) => {
    set({ loading: true, error: null })
    try {
      // Soft-delete: row stays in the store with deletedAt set so the
      // LAN sync layer can propagate the deletion via LWW.
      const updated = await db.deleteTask(id)
      if (updated) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, deletedAt: new Date().toISOString() } : t)),
          loading: false,
        }))
      } else {
        set({ error: 'Task not found', loading: false })
      }
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  replaceAllTasks: async (tasks) => {
    set({ loading: true, error: null })
    try {
      // Reconcile IndexedDB: clear and reinsert so deletions on other
      // devices propagate here. Cheap for personal-scale task counts.
      await db.clearAllTasks()
      await db.bulkPutTasks(tasks)
      set({ tasks, loading: false, initialized: true })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  exportTasks: async () => {
    const tasks = get().tasks
    downloadTasks(tasks)
  },

  clearError: () => set({ error: null }),
}))