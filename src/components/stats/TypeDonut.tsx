import ReactECharts from 'echarts-for-react'
import type { TypeDistribution } from '@/lib/stats'
import type { TaskType } from '@/types/task'

interface TypeDonutProps {
  data: TypeDistribution[]
}

const typeColors: Record<TaskType, string> = {
  idea: '#6bc5e8',
  issue: '#b0a8e0',
  exploration: '#e8a0aa',
}

const typeLabels: Record<TaskType, string> = {
  idea: '想法',
  issue: '疑问',
  exploration: '探索',
}

function TypeDonut({ data }: TypeDonutProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: '#0f1115',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1,
      textStyle: {
        color: '#ebedf0',
        fontFamily: "'Noto Serif SC', serif",
        fontSize: 11,
      },
      extraCssText: 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);',
    },
    legend: {
      bottom: 0,
      textStyle: {
        color: '#9ca3af',
        fontFamily: "'Noto Serif SC', serif",
        fontSize: 10,
      },
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 16,
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '70%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 3,
          borderColor: '#0a0b0d',
          borderWidth: 2,
        },
        label: {
          show: true,
          position: 'center',
          formatter: `{a|${total}}\n{b|总计}`,
          rich: {
            a: {
              fontSize: 28,
              fontWeight: '400',
              color: '#ebedf0',
              fontFamily: 'Noto Serif SC, serif',
              lineHeight: 32,
            },
            b: {
              fontSize: 9,
              color: '#6b7280',
              fontFamily: "'Noto Serif SC', serif",
              letterSpacing: 2,
              lineHeight: 14,
            },
          },
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
          },
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(94, 234, 212, 0.2)',
          },
        },
        data: data.map((d) => ({
          value: d.count,
          name: typeLabels[d.type],
          itemStyle: {
            color: typeColors[d.type],
          },
        })),
      },
    ],
  }

  return (
    <div className="helm-card relative p-3 rounded-md animate-slide-up" style={{ animationDelay: '80ms', borderColor: 'rgba(94, 234, 212, 0.12)' }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="helm-label">
          类型分布
        </h3>
        <span className="font-mono text-[9px] text-accent/50">环形图</span>
      </div>
      <ReactECharts
        option={option}
        style={{ height: '160px', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  )
}

export { TypeDonut }
