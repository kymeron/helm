/**
 * UI preferences store for HELM.
 * Manages filters, sort, time range, and modal state.
 * Persists preferences to localStorage.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TaskType, Priority, TimeRange, SortKey, SortOrder, Filters, Task, TaskStatus } from '@/types/task'

interface UIState {
  filters: Filters
  sortKey: SortKey
  sortOrder: SortOrder
  timeRange: TimeRange
  searchQuery: string
  showStats: boolean
  modalOpen: boolean
  editingTask: Task | null
  defaultStatus: TaskStatus | null
}

interface UIActions {
  setFilterType: (type: TaskType | 'all') => void
  setFilterPriority: (priority: Priority | 'all') => void
  clearFilters: () => void
  setSort: (key: SortKey, order: SortOrder) => void
  setTimeRange: (range: TimeRange) => void
  setSearchQuery: (query: string) => void
  toggleStats: () => void
  openCreateModal: (status?: TaskStatus) => void
  openEditModal: (task: Task) => void
  closeModal: () => void
}

export type UIStore = UIState & UIActions

const DEFAULT_FILTERS: Filters = {
  type: 'all',
  priority: 'all',
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      filters: DEFAULT_FILTERS,
      sortKey: 'createdAt',
      sortOrder: 'desc',
      timeRange: 'all',
      searchQuery: '',
      showStats: true,
      modalOpen: false,
      editingTask: null,
      defaultStatus: null,

      setFilterType: (type) =>
        set((state) => ({ filters: { ...state.filters, type } })),

      setFilterPriority: (priority) =>
        set((state) => ({ filters: { ...state.filters, priority } })),

      clearFilters: () => set({ filters: DEFAULT_FILTERS }),
      
      setSort: (key, order) => set({ sortKey: key, sortOrder: order }),
      
      setTimeRange: (range) => set({ timeRange: range }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleStats: () => set((state) => ({ showStats: !state.showStats })),

      openCreateModal: (status) => set({ modalOpen: true, editingTask: null, defaultStatus: status ?? null }),

      openEditModal: (task) => set({ modalOpen: true, editingTask: task, defaultStatus: null }),

      closeModal: () => set({ modalOpen: false, editingTask: null, defaultStatus: null }),
    }),
    {
      name: 'helm.ui-preferences',
      partialize: (state) => ({
        filters: state.filters,
        sortKey: state.sortKey,
        sortOrder: state.sortOrder,
        timeRange: state.timeRange,
        showStats: state.showStats,
      }),
    }
  )
)