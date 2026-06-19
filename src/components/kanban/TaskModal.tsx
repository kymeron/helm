import { useState, useEffect, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useTasksStore } from '@/store'
import type { Task, TaskInput, TaskType, Priority } from '@/types/task'

interface TaskModalProps {
  open: boolean
  task: Task | null
  onClose: () => void
}

const typeOptions: { value: TaskType; label: string; color: string }[] = [
  { value: 'idea', label: '想法', color: 'text-idea' },
  { value: 'issue', label: '疑问', color: 'text-issue' },
  { value: 'exploration', label: '探索', color: 'text-exploration' },
]

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]

function TaskModal({ open, task, onClose }: TaskModalProps) {
  const createTask = useTasksStore((s) => s.createTask)
  const updateTask = useTasksStore((s) => s.updateTask)
  const deleteTask = useTasksStore((s) => s.deleteTask)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TaskType>('idea')
  const [priority, setPriority] = useState<Priority>('medium')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description)
      setType(task.type)
      setPriority(task.priority)
      setTags(task.tags.join(', '))
    } else {
      setTitle('')
      setDescription('')
      setType('idea')
      setPriority('medium')
      setTags('')
    }
    setShowDeleteConfirm(false)
  }, [task, open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return

    setLoading(true)

    const input: TaskInput = {
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      tags: tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0),
    }

    try {
      if (task) {
        await updateTask(task.id, input)
      } else {
        await createTask(input)
      }
      onClose()
    } catch (err) {
      console.error('Failed to save task:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return

    setLoading(true)
    try {
      await deleteTask(task.id)
      onClose()
    } catch (err) {
      console.error('Failed to delete task:', err)
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <Modal
      open={open}
      title={task ? '编辑任务' : '新建任务'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="helm-label block mb-2">
            标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border text-ink font-sans text-sm focus:border-accent focus:outline-none rounded-lg transition-colors duration-200 ease-snappy"
            placeholder="输入任务标题..."
            maxLength={50}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="helm-label block mb-2">
            描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border text-ink font-sans text-sm focus:border-accent focus:outline-none resize-none rounded-lg transition-colors duration-200 ease-snappy"
            placeholder="补充说明..."
            rows={3}
            maxLength={2000}
          />
        </div>

        {/* Type */}
        <div>
          <label className="helm-label block mb-2">
            类型
          </label>
          <div className="flex gap-2">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`flex-1 px-3 py-2 font-mono text-[10px] uppercase tracking-wider border rounded-lg transition-all duration-200 ease-snappy ${
                  type === opt.value
                    ? 'bg-accent/8 border-accent text-accent'
                    : 'bg-surface border-border text-ink-muted hover:border-border-strong'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="helm-label block mb-2">
            优先级
          </label>
          <div className="flex gap-2">
            {priorityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriority(opt.value)}
                className={`flex-1 px-3 py-2 font-mono text-[10px] uppercase tracking-wider border rounded-lg transition-all duration-200 ease-snappy ${
                  priority === opt.value
                    ? 'bg-accent/8 border-accent text-accent'
                    : 'bg-surface border-border text-ink-muted hover:border-border-strong'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="helm-label block mb-2">
            标签
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border text-ink font-sans text-sm focus:border-accent focus:outline-none rounded-lg transition-colors duration-200 ease-snappy"
            placeholder="工作, 学习, 研究..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {task && !showDeleteConfirm && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="font-mono text-[10px] text-danger hover:text-danger/80 uppercase tracking-wider transition-colors duration-200 ease-snappy"
            >
              删除
            </button>
          )}

          {showDeleteConfirm && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider">
                确认删除？
              </span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-2 py-1 bg-danger text-white font-mono text-[10px] uppercase tracking-wider hover:bg-danger/90 disabled:opacity-50 rounded-md transition-all duration-200 ease-snappy"
              >
                是
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 bg-surface border border-border text-ink font-mono text-[10px] uppercase tracking-wider hover:border-border-strong rounded-md transition-all duration-200 ease-snappy"
              >
                否
              </button>
            </div>
          )}

          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button variant="primary" type="submit" disabled={loading || !title.trim()}>
              {loading ? '保存中...' : task ? '保存' : '创建'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export { TaskModal }
