import ReactECharts from 'echarts-for-react'
import type { HeatmapDay } from '@/lib/stats'

interface ActivityHeatmapProps {
  data: HeatmapDay[]
}

function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: '#0f1115',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1,
      textStyle: {
        color: '#ebedf0',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
      },
      extraCssText: 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);',
      formatter: (params: { value: [string, number] }) => {
        return `<div style="font-family: 'JetBrains Mono', monospace;">
          <div style="color: #6b7280; font-size: 9px; letter-spacing: 1px;">${params.value[0]}</div>
          <div style="color: #5eead4; margin-top: 4px;">活动：<b>${params.value[1]}</b></div>
        </div>`
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: maxCount,
      inRange: {
        color: [
          'rgba(94, 234, 212, 0.05)',
          'rgba(94, 234, 212, 0.25)',
          'rgba(94, 234, 212, 0.5)',
          'rgba(94, 234, 212, 0.75)',
          '#5eead4',
        ],
      },
    },
    calendar: {
      top: 25,
      left: 30,
      right: 10,
      bottom: 20,
      range: [data[0]?.date, data[data.length - 1]?.date],
      cellSize: ['auto', 11],
      orient: 'horizontal',
      splitLine: { show: false },
      itemStyle: {
        color: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'transparent',
        borderWidth: 1,
        borderRadius: 2,
      },
      dayLabel: {
        color: '#6b7280',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 8,
        firstDay: 0,
      },
      monthLabel: {
        color: '#6b7280',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 8,
        nameMap: 'short',
      },
      yearLabel: { show: false },
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: data.map((d) => [d.date, d.count]),
        itemStyle: {
          borderRadius: 2,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 6,
            shadowColor: 'rgba(94, 234, 212, 0.4)',
          },
        },
      },
    ],
  }

  return (
    <div className="helm-card relative p-3 rounded-md animate-slide-up" style={{ animationDelay: '160ms', borderColor: 'rgba(94, 234, 212, 0.12)' }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="helm-label">
          活动热力图
        </h3>
        <span className="font-mono text-[9px] text-accent/50">12周</span>
      </div>
      <ReactECharts
        option={option}
        style={{ height: '160px', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  )
}

export { ActivityHeatmap }
