interface EmptyStateProps {
  message: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

function EmptyState({ message, actionLabel, onAction, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {/* Minimal mark */}
      <div className="w-1 h-1 rounded-full bg-accent/30 mb-3" />
      <div className="helm-label">
        {message}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 font-mono text-[10px] text-accent hover:text-accent/80 uppercase tracking-wider transition-colors duration-200 ease-snappy"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export { EmptyState }
