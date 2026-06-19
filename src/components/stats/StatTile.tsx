interface StatTileProps {
  label: string
  value: number | string
  hint?: string
  unit?: string
  accent?: 'default' | 'accent' | 'idea' | 'issue' | 'exploration' | 'success'
  index?: number
}

const accentMap = {
  default: { text: 'text-ink', bar: 'bg-ink-muted' },
  accent: { text: 'text-accent', bar: 'bg-accent' },
  idea: { text: 'text-idea', bar: 'bg-idea' },
  issue: { text: 'text-issue', bar: 'bg-issue' },
  exploration: { text: 'text-exploration', bar: 'bg-exploration' },
  success: { text: 'text-accent', bar: 'bg-accent' },
}

function StatTile({ label, value, hint, unit, accent = 'default', index = 0 }: StatTileProps) {
  const styles = accentMap[accent]

  return (
    <div
      className="helm-card helm-card-glow relative p-3 rounded-md animate-slide-up"
      style={{ animationDelay: `${index * 30}ms`, borderColor: 'rgba(94, 234, 212, 0.12)' }}
    >
      {/* Label */}
      <div className="helm-label mb-1.5">
        {label}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span className={`helm-value text-2xl ${styles.text} leading-none`}>
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs text-ink-muted font-normal">
            {unit}
          </span>
        )}
      </div>

      {/* Hint */}
      {hint && (
        <div className="font-mono text-[9px] text-ink-muted mt-1">
          {hint}
        </div>
      )}

      {/* Bottom accent */}
      <div className={`absolute bottom-0 left-0 h-px ${styles.bar} opacity-30`} style={{ width: '16px' }} />
    </div>
  )
}

export { StatTile }
