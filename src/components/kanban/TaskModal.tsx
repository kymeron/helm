import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useTasksStore, useUIStore } from '@/store'
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
  const transitionStatus = useTasksStore((s) => s.transitionStatus)
  const defaultStatus = useUIStore((s) => s.defaultStatus)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TaskType>('idea')
  const [priority, setPriority] = useState<Priority>('medium')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

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

  // Auto-focus the title input on open. On mobile, defer focus so the
  // virtual keyboard doesn't jump before the slide-up animation finishes.
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      titleRef.current?.focus()
    }, 250)
    return () => window.clearTimeout(t)
  }, [open])

  // Submit on Enter when focused inside a single-line input. Mobile-friendly
  // shortcut: type a title, hit "Done" on the keyboard, task is created.
  // Textarea keeps newline-on-Enter by design; we also skip when an IME
  // composition (zh/en candidate) is in flight.
  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLElement) {
      const tag = e.target.tagName
      if (tag === 'TEXTAREA') return
      if (e.nativeEvent.isComposing) return
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

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
        const created = await createTask(input)
        if (defaultStatus && defaultStatus !== 'todo') {
          await transitionStatus(created.id, defaultStatus)
        }
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
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className="space-y-5 pb-2"
      >
        {/* Title */}
        <div>
          <label className="helm-label block mb-2">
            标题
          </label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputMode="text"
            enterKeyHint="done"
            autoComplete="off"
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

        {/* Actions — sticky so submit stays reachable when the soft keyboard
            covers the lower half of the screen on mobile. Layout: two fixed-
            width slots (left: delete/confirm, right: cancel + submit) so the
            submit button can never wrap or get clipped on narrow viewports. */}
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-4 px-4 sm:px-6 py-3 bg-surface/95 backdrop-blur-sm border-t border-border flex items-center gap-2">
          {/* Left slot — fixed width, prevents the right slot from being
              pushed off-screen by justify-between / flex-wrap. */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
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
              <>
                <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider whitespace-nowrap">
                  确认删除?
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
              </>
            )}
          </div>

          {/* Right slot — pushed to the far right with ml-auto. Buttons keep
              natural width via flex-shrink-0 so the create button never clips. */}
          <div className="flex gap-2 ml-auto flex-shrink-0">
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
