import { useShallow } from 'zustand/react/shallow'
import { useTasksStore, useUIStore, selectActiveTasks } from '@/store'
import type { TaskType, Priority, SortKey } from '@/types/task'

const typeOptions: { value: TaskType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'idea', label: '想法' },
  { value: 'issue', label: '疑问' },
  { value: 'exploration', label: '探索' },
]

const priorityOptions: { value: Priority | 'all'; label: string }[] = [
  { value: 'all', label: '全部优先级' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

const sortKeyOptions: { value: SortKey; label: string }[] = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'priority', label: '优先级' },
  { value: 'updatedAt', label: '更新时间' },
]

function FilterBar() {
  const tasks = useTasksStore(useShallow(selectActiveTasks))
  const filters = useUIStore((s) => s.filters)
  const setFilterType = useUIStore((s) => s.setFilterType)
  const setFilterPriority = useUIStore((s) => s.setFilterPriority)
  const setFilterTag = useUIStore((s) => s.setFilterTag)
  const clearFilters = useUIStore((s) => s.clearFilters)
  const sortKey = useUIStore((s) => s.sortKey)
  const sortOrder = useUIStore((s) => s.sortOrder)
  const setSort = useUIStore((s) => s.setSort)

  const availableTags = Array.from(
    new Set(tasks.flatMap((t) => t.tags))
  ).sort()

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.priority !== 'all' ||
    filters.tag !== null

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1">
      {/* Type Filter */}
      <div className="flex gap-px bg-bg-2 rounded-md overflow-hidden">
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterType(opt.value)}
            className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-200 ease-snappy ${
              filters.type === opt.value
                ? 'bg-accent text-bg'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Priority Filter */}
      <select
        value={filters.priority}
        onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
        className="bg-bg-2 px-2 py-1 font-mono text-[10px] text-ink-secondary focus:text-ink focus:outline-none uppercase tracking-wider rounded-md transition-colors duration-200 ease-snappy"
      >
        {priorityOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Tag Filter */}
      <select
        value={filters.tag ?? ''}
        onChange={(e) => setFilterTag(e.target.value || null)}
        className="bg-bg-2 px-2 py-1 font-mono text-[10px] text-ink-secondary focus:text-ink focus:outline-none rounded-md transition-colors duration-200 ease-snappy"
        disabled={availableTags.length === 0}
      >
        <option value="">全部标签</option>
        {availableTags.map((tag) => (
          <option key={tag} value={tag}>
            #{tag}
          </option>
        ))}
      </select>

      {/* Divider */}
      <div className="h-4 w-px bg-border" />

      {/* Sort */}
      <span className="helm-label">排序</span>
      <select
        value={sortKey}
        onChange={(e) => setSort(e.target.value as SortKey, sortOrder)}
        className="bg-bg-2 px-2 py-1 font-mono text-[10px] text-ink-secondary focus:text-ink focus:outline-none uppercase tracking-wider rounded-md transition-colors duration-200 ease-snappy"
      >
        {sortKeyOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        onClick={() => setSort(sortKey, sortOrder === 'asc' ? 'desc' : 'asc')}
        className="px-2 py-1 bg-bg-2 font-mono text-xs text-ink-secondary hover:text-accent transition-all duration-200 ease-snappy rounded-md"
        title={sortOrder === 'asc' ? '升序' : '降序'}
      >
        {sortOrder === 'asc' ? '↑' : '↓'}
      </button>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="ml-auto font-mono text-[10px] text-danger hover:text-danger/80 uppercase tracking-wider transition-colors duration-200 ease-snappy"
        >
          清除
        </button>
      )}
    </div>
  )
}

export { FilterBar }
