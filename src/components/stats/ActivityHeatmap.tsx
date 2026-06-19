import { useMemo } from 'react'
import type { HeatmapDay } from '@/lib/stats'

interface ActivityHeatmapProps {
  data: HeatmapDay[]
}

// Cell geometry — GitHub-style squares (≈11 px) so 53 columns render at
// ≈ 689 px which fills the 2fr card column (≈560 px on 1280 px viewport,
// with minor horizontal scroll).
const CELL_SIZE = 11
const CELL_GAP = 2
const CELL_PITCH = CELL_SIZE + CELL_GAP
const HEADER_HEIGHT = 18 // vertical space for month labels
const DAY_LABEL_WIDTH = 22
const CELL_RADIUS = 2 // rx for cell corners, scales with cell size

// Chinese day-of-week labels (Sunday → Saturday).
const DAY_LABELS: Record<number, string> = {
  0: '日',
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
}

const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]

// HELM-theme 5-level teal palette (GitHub-style ramp): all levels are
// solid hex values sampled from the Tailwind teal scale, so the
// progression looks visually even from "empty" → "max activity".
//   --bg (slate)   → empty cell
//   teal-900       → very dim teal
//   teal-700       → medium teal
//   teal-500       → bright teal
//   --accent       → full intensity (= #5eead4, the HELM accent)
const LEVEL_COLORS = [
  '#161b22', // 0 — empty (slate)
  '#134e4a', // 1 — teal-900 (very dim)
  '#0f766e', // 2 — teal-700 (medium)
  '#14b8a6', // 3 — teal-500 (bright)
  '#5eead4', // 4 — accent (max)
]

interface Cell {
  date: string
  count: number
  level: number // 0-4 visible; -1 = padding (before data range)
}

function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const maxCount = useMemo(
    () => Math.max(1, ...data.map((d) => d.count)),
    [data],
  )

  // Build the week grid: 53 columns × 7 rows for a 1-year view.
  const weeks = useMemo<Cell[][]>(() => {
    const firstDay = data[0]
    if (!firstDay) return []

    const cells: Cell[] = data.map((d) => {
      let level = 0
      if (d.count > 0) {
        const ratio = d.count / maxCount
        if (ratio > 0.75) level = 4
        else if (ratio > 0.5) level = 3
        else if (ratio > 0.25) level = 2
        else level = 1
      }
      return { date: d.date, count: d.count, level }
    })

    const firstDate = new Date(firstDay.date)
    const firstDayOfWeek = firstDate.getUTCDay() // 0 = Sunday
    const padding: Cell[] = Array.from({ length: firstDayOfWeek }, () => ({
      date: '',
      count: 0,
      level: -1,
    }))

    const allCells = [...padding, ...cells]
    const weeksArr: Cell[][] = []
    for (let i = 0; i < allCells.length; i += 7) {
      const week = allCells.slice(i, i + 7)
      while (week.length < 7) {
        week.push({ date: '', count: 0, level: -1 })
      }
      weeksArr.push(week)
    }
    return weeksArr
  }, [data, maxCount])

  // Month labels: anchor each label to the first week whose first real
  // cell belongs to that month.
  const monthLabels = useMemo(() => {
    const labels: { x: number; name: string }[] = []
    let lastMonth = -1
    weeks.forEach((week, idx) => {
      const firstReal = week.find((c) => c.level >= 0)
      if (!firstReal || !firstReal.date) return
      const month = new Date(firstReal.date).getUTCMonth()
      if (month === lastMonth) return
      const name = MONTH_NAMES[month]
      if (!name) return
      labels.push({ x: idx * CELL_PITCH, name })
      lastMonth = month
    })
    return labels
  }, [weeks])

  const totalWeeks = weeks.length
  const gridWidth = totalWeeks * CELL_PITCH - CELL_GAP
  const gridHeight = 7 * CELL_PITCH - CELL_GAP

  // Body wrapper fills the remaining card height so the heatmap card
  // matches the 160 px chart area of TypeDonut / TrendLine.
  const renderBody = () => (
    <div className="flex-1 min-h-[180px] flex flex-col justify-center">
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-fit">
          {/* Day-of-week labels — all 7 days (日一二三四五六) */}
          <svg
            width={DAY_LABEL_WIDTH}
            height={HEADER_HEIGHT + gridHeight}
            className="shrink-0"
            aria-hidden="true"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
              <text
                key={dayIdx}
                x={DAY_LABEL_WIDTH - 2}
                y={HEADER_HEIGHT + dayIdx * CELL_PITCH + CELL_SIZE / 2 + 4}
                textAnchor="end"
                fontFamily="'JetBrains Mono', monospace"
                fontSize={10}
                fill="#9ca3af"
              >
                {DAY_LABELS[dayIdx]}
              </text>
            ))}
          </svg>

          {/* Grid: month labels on top, day cells below */}
          <svg
            width={gridWidth}
            height={HEADER_HEIGHT + gridHeight}
            className="shrink-0"
            role="img"
            aria-label={`活动热力图 · 本年度 ${totalWeeks} 周`}
          >
            {/* Month labels */}
            {monthLabels.map(({ x, name }) => (
              <text
                key={`${x}-${name}`}
                x={x}
                y={13}
                fontFamily="'JetBrains Mono', monospace"
                fontSize={10}
                fill="#9ca3af"
              >
                {name}
              </text>
            ))}

            {/* Day cells — only render past/today (hides future days) */}
            {weeks.map((week, weekIdx) =>
              week.map((cell, dayIdx) => {
                if (cell.level < 0) return null
                if (!cell.date) return null
                const x = weekIdx * CELL_PITCH
                const y = HEADER_HEIGHT + dayIdx * CELL_PITCH
                const fill = LEVEL_COLORS[cell.level]
                return (
                  <rect
                    key={`${weekIdx}-${dayIdx}`}
                    x={x}
                    y={y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={CELL_RADIUS}
                    fill={fill}
                    className="transition-opacity hover:opacity-70 cursor-default"
                  >
                    <title>{`${cell.date} · ${cell.count} 次活动`}</title>
                  </rect>
                )
              }),
            )}
          </svg>
        </div>
      </div>

      {/* Legend: 少 [5 squares] 多 */}
      <div className="flex items-center justify-end gap-1.5 mt-2 shrink-0">
        <span className="text-[9px] font-mono text-ink-muted">少</span>
        {LEVEL_COLORS.map((color, idx) => (
          <svg key={idx} width={CELL_SIZE} height={CELL_SIZE} aria-hidden="true">
            <rect width={CELL_SIZE} height={CELL_SIZE} rx={CELL_RADIUS} fill={color} />
          </svg>
        ))}
        <span className="text-[9px] font-mono text-ink-muted">多</span>
      </div>
    </div>
  )

  return (
    <div
      className="helm-card p-3 rounded-md animate-slide-up flex flex-col"
      style={{ animationDelay: '160ms', borderColor: 'rgba(94, 234, 212, 0.12)' }}
    >
      <div className="flex items-center justify-between mb-1 shrink-0">
        <h3 className="helm-label">活动热力图</h3>
        <span className="font-mono text-[9px] text-accent/50">{totalWeeks} 周</span>
      </div>

      {totalWeeks === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-[11px] font-mono text-ink-muted">
          暂无数据
        </div>
      ) : (
        renderBody()
      )}
    </div>
  )
}

export { ActivityHeatmap }