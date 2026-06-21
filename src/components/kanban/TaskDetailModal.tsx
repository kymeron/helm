import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { getTaskType } from '@/types/task'
import type { Task, TaskType, TaskStatus, Priority } from '@/types/task'

interface TaskDetailModalProps {
  open: boolean
  task: Task | null
  onClose: () => void
  onEdit: (task: Task) => void
}

const typeLabels: Record<TaskType, string> = {
  idea: '想法',
  issue: '疑问',
  exploration: '探索',
}

const typeColors: Record<TaskType, string> = {
  idea: '#6bc5e8',
  issue: '#b0a8e0',
  exploration: '#e8a0aa',
}

const statusLabels: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
}

const statusColors: Record<TaskStatus, string> = {
  todo: '#fbbf24',
  in_progress: '#2dd4bf',
  done: '#5eead4',
}

const priorityLabels: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function TaskDetailModal({ open, task, onClose, onEdit }: TaskDetailModalProps) {
  if (!task) return null

  const taskType = getTaskType(task.tags)

  return (
    <Modal
      open={open}
      title="任务详情"
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* ID + Status */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-ink-muted tracking-wider">
            #{task.id.slice(0, 6).toUpperCase()}
          </span>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[10px] text-ink-secondary"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: statusColors[task.status] }}
              />
              {statusLabels[task.status]}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className={`font-sans text-base text-ink leading-snug ${task.completedAt ? 'line-through text-ink-muted' : ''}`}>
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <div>
            <div className="helm-label mb-1.5">描述</div>
            <p className="font-sans text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        )}

        {/* Type + Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="helm-label mb-1.5">类型</div>
            {taskType ? (
              <span
                className="type-badge"
                style={{
                  backgroundColor: `${typeColors[taskType]}1a`,
                  color: typeColors[taskType],
                }}
              >
                {typeLabels[taskType]}
              </span>
            ) : (
              <span className="font-mono text-xs text-ink-muted">未分类</span>
            )}
          </div>
          <div>
            <div className="helm-label mb-1.5">优先级</div>
            <span className="font-mono text-xs text-ink-secondary">
              {priorityLabels[task.priority]}
            </span>
          </div>
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div>
            <div className="helm-label mb-1.5">标签</div>
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[10px] text-ink-secondary px-2 py-0.5 bg-bg-2 border border-border rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
          <div>
            <div className="helm-label mb-1">创建时间</div>
            <span className="font-mono text-[10px] text-ink-muted">
              {formatDate(task.createdAt)}
            </span>
          </div>
          <div>
            <div className="helm-label mb-1">更新时间</div>
            <span className="font-mono text-[10px] text-ink-muted">
              {formatDate(task.updatedAt)}
            </span>
          </div>
          {task.completedAt && (
            <div>
              <div className="helm-label mb-1">完成时间</div>
              <span className="font-mono text-[10px] text-accent">
                {formatDate(task.completedAt)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
          <Button variant="primary" onClick={() => onEdit(task)}>
            编辑
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export { TaskDetailModal }
