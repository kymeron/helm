import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
} from '@dnd-kit/core'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import { TaskCard } from '@/components/kanban/TaskCard'
import { useTasksStore, useUIStore } from '@/store'
import { useTasks } from '@/hooks/useTasks'
import type { Task, TaskStatus } from '@/types/task'

interface KanbanBoardProps {
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onViewTask: (task: Task) => void
}

function KanbanBoard({ onEditTask, onDeleteTask, onViewTask }: KanbanBoardProps) {
  const { byStatus } = useTasks()
  const transitionStatus = useTasksStore((s) => s.transitionStatus)
  const openCreateModal = useUIStore((s) => s.openCreateModal)

  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // 自定义碰撞检测：优先按指针所在区域命中，解决空列被"跳过"的问题。
  // closestCenter 会计算到各 droppable 中心的 2D 距离，空列中心偏远时
  // 会被相邻列的卡片"抢走"目标，导致拖不进空列。
  const collisionDetection: CollisionDetection = (args) => {
    // 1. 指针落在某个 droppable 内部时直接命中（列或卡片均可）
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    // 2. 指针落在列间缝隙时，用 closestCorners 兜底（比 closestCenter
    //    对空列更友好，按四角距离判断）
    return closestCorners(args)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const taskId = active.id as string

    const allTasks = [...byStatus.todo, ...byStatus.in_progress, ...byStatus.done]
    const task = allTasks.find((t) => t.id === taskId)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Resolve target status: over.id could be a column status or a task ID
    const columnStatuses: TaskStatus[] = ['todo', 'in_progress', 'done']
    let targetStatus: TaskStatus | null = null

    if (columnStatuses.includes(overId as TaskStatus)) {
      // Dropped directly onto a column
      targetStatus = overId as TaskStatus
    } else {
      // Dropped onto a card — find which column that card belongs to
      const allTasks = [...byStatus.todo, ...byStatus.in_progress, ...byStatus.done]
      const overTask = allTasks.find((t) => t.id === overId)
      if (overTask) {
        targetStatus = overTask.status
      }
    }

    if (!targetStatus) return

    const allTasks = [...byStatus.todo, ...byStatus.in_progress, ...byStatus.done]
    const task = allTasks.find((t) => t.id === taskId)

    if (task && task.status !== targetStatus) {
      transitionStatus(taskId, targetStatus)
    }
  }

  const columns: { status: TaskStatus; title: string; subtitle: string }[] = [
    { status: 'todo', title: '待办', subtitle: '等待中' },
    { status: 'in_progress', title: '进行中', subtitle: '进行中' },
    { status: 'done', title: '已完成', subtitle: '已完成' },
  ]

  return (
    <div className="flex flex-col min-h-0 md:h-full">
      {/* Board Header */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <h2 className="font-sans font-medium text-lg font-normal text-ink">
          任务
        </h2>
        <button
          onClick={() => openCreateModal()}
          className="px-3 sm:px-4 py-2 bg-accent text-bg hover:bg-accent/90 shadow-soft transition-all duration-200 ease-snappy font-mono text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 sm:gap-2"
          aria-label="新建任务"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">新建</span>
        </button>
      </div>

      {/* Board Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col md:flex-row gap-3 md:flex-1 md:overflow-x-auto pb-2">
          {columns.map(({ status, title, subtitle }) => (
            <KanbanColumn
              key={status}
              status={status}
              title={title}
              subtitle={subtitle}
              tasks={byStatus[status]}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onViewTask={onViewTask}
              onCreateTask={openCreateModal}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="opacity-80 rotate-1">
              <TaskCard
                task={activeTask}
                onEdit={() => {}}
                onDelete={() => {}}
                onView={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export { KanbanBoard }
