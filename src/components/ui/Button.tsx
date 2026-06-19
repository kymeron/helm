import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-bg hover:bg-accent/90 shadow-soft',
  secondary: 'bg-surface border border-border text-ink-secondary hover:border-border-strong hover:text-ink shadow-soft',
  ghost: 'text-ink-secondary hover:text-ink hover:bg-elevated',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-soft',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[11px] rounded-md',
  md: 'px-4 py-2 text-xs rounded-lg',
}

function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'font-mono uppercase tracking-wider transition-all duration-200 ease-snappy',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
}

export { Button }
