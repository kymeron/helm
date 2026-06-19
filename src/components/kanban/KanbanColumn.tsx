import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from '@/components/kanban/TaskCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/task'

interface KanbanColumnProps {
  status: TaskStatus
  title: string
  subtitle: string
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onViewTask: (task: Task) => void
}

const columnAccents: Record<TaskStatus, { dot: string; text: string }> = {
  todo: { dot: 'bg-warning', text: 'text-warning' },
  in_progress: { dot: 'bg-success', text: 'text-success' },
  done: { dot: 'bg-ink-muted', text: 'text-ink-muted' },
}

function KanbanColumn({ status, title, tasks, onEditTask, onDeleteTask, onViewTask }: KanbanColumnProps) {
  const accent = columnAccents[status]
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'helm-card helm-card-glow flex flex-col min-w-[200px] flex-1 rounded-lg shadow-soft transition-all duration-200 ease-snappy',
        isOver && 'drop-target-active'
      )}
      style={{ borderColor: 'rgba(94, 234, 212, 0.12)' }}
    >
      {/* Column Header */}
      <div className="px-3 py-2.5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
            <h2 className="font-sans font-medium text-base font-normal text-ink">
              {title}
            </h2>
          </div>
          <span className="font-mono text-[10px] text-ink-muted tabular-nums">
            {String(tasks.length).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-2 overflow-y-auto min-h-[120px]">
        {tasks.length === 0 ? (
          <EmptyState
            message="暂无任务"
            className="py-8"
          />
        ) : (
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TaskCard
                    task={task}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onView={onViewTask}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  )
}

export { KanbanColumn }
