import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { TaskType, Priority } from '@/types/task'

type BadgeVariant =
  | 'type-idea'
  | 'type-issue'
  | 'type-exploration'
  | 'priority-high'
  | 'priority-medium'
  | 'priority-low'
  | 'tag'

interface BadgeProps {
  variant: BadgeVariant
  children: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  'type-idea': 'text-idea bg-idea/8',
  'type-issue': 'text-issue bg-issue/8',
  'type-exploration': 'text-exploration bg-exploration/8',
  'priority-high': 'text-danger bg-danger/8',
  'priority-medium': 'text-accent bg-accent/8',
  'priority-low': 'text-ink-muted bg-ink/5',
  'tag': 'text-ink-secondary bg-ink/5',
}

function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider rounded-full',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

function getTypeBadgeVariant(type: TaskType): BadgeVariant {
  return `type-${type}` as BadgeVariant
}

function getPriorityBadgeVariant(priority: Priority): BadgeVariant {
  return `priority-${priority}` as BadgeVariant
}

export { Badge, getTypeBadgeVariant, getPriorityBadgeVariant }
