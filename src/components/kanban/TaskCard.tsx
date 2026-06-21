import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo } from 'react'
import { Badge, getPriorityBadgeVariant } from '@/components/ui/Badge'
import { getTaskType } from '@/types/task'
import type { Task, Priority } from '@/types/task'

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onView: (task: Task) => void
}

const typeColors: Record<string, string> = {
  idea: '#6bc5e8',
  issue: '#b0a8e0',
  exploration: '#e8a0aa',
}

const priorityLabels: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

function TaskCard({ task, onEdit, onDelete, onView }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const relativeTime = useMemo(() => {
    const date = new Date(task.updatedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  }, [task.updatedAt])

  const taskType = getTaskType(task.tags)

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-task-card
      onClick={() => {
        if (!isDragging) onView(task)
      }}
      className={`helm-card helm-card-glow group relative rounded-lg
        transition-all duration-200 ease-snappy
        hover:-translate-y-0.5 hover:shadow-soft-lg
        ${isDragging ? 'opacity-60 border-accent/40 shadow-soft-lg' : ''}`}
      {...attributes}
      {...listeners}
    >
      {/* Left accent bar — type color (类型本身也是标签，从 tags 派生) */}
      {taskType && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg"
          style={{ backgroundColor: typeColors[taskType] }}
        />
      )}

      <div className="p-3 pl-4">
        {/* Header: Title + ID + Priority */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {task.completedAt && (
              <svg className="w-3 h-3 text-accent shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <h3 className={`font-sans text-sm text-ink leading-snug group-hover:text-accent transition-colors duration-200 ease-snappy truncate ${task.completedAt ? 'line-through text-ink-muted' : ''}`}>
              {task.title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[9px] text-ink-muted tracking-wider">
              #{task.id.slice(0, 6).toUpperCase()}
            </span>
            <Badge variant={getPriorityBadgeVariant(task.priority)}>
              {priorityLabels[task.priority]}
            </Badge>
          </div>
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-mono text-[9px] text-ink-secondary px-1.5 py-0.5 bg-bg-2 border border-border rounded-full"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="font-mono text-[9px] text-ink-muted">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: Time + Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="font-mono text-[9px] text-ink-muted tracking-wider">
            {relativeTime}
          </span>
          <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-snappy">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(task)
              }}
              className="font-mono text-[9px] text-ink-secondary hover:text-accent uppercase tracking-wider transition-colors duration-200 ease-snappy"
            >
              编辑
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              className="font-mono text-[9px] text-ink-secondary hover:text-danger uppercase tracking-wider transition-colors duration-200 ease-snappy"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { TaskCard }
