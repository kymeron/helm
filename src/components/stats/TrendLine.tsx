import ReactECharts from 'echarts-for-react'
import type { TrendDay } from '@/lib/stats'

interface TrendLineProps {
  data: TrendDay[]
}

function TrendLine({ data }: TrendLineProps) {
  const maxCount = Math.max(
    ...data.map((d) => Math.max(d.created, d.completed)),
    1,
  )

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f1115',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1,
      textStyle: {
        color: '#ebedf0',
        fontFamily: "'Noto Serif SC', serif",
        fontSize: 11,
      },
      extraCssText: 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);',
      formatter: (params: Array<{ name: string; seriesName: string; value: number; color: string }>) => {
        if (!params.length) return ''
        return `<div style="font-family: 'Noto Serif SC', serif; line-height: 1.6;">
          <div style="color: #6b7280; font-size: 9px;">${params[0]?.name ?? ''}</div>
          ${params.map(
            (p) => `<div style="color: ${p.color}; margin-top: 2px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}：<b>${p.value}</b></div>`
          ).join('')}
        </div>`
      },
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 3,
      itemGap: 16,
      textStyle: {
        color: '#6b7280',
        fontFamily: "'Noto Serif SC', serif",
        fontSize: 9,
      },
      data: ['新增', '完成'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '8%',
      top: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date.slice(5)),
      axisLine: {
        lineStyle: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      axisTick: {
        lineStyle: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      axisLabel: {
        color: '#6b7280',
        fontFamily: "'Noto Serif SC', serif",
        fontSize: 9,
        interval: 5,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.02)',
          type: 'dashed',
        },
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      max: Math.max(maxCount, 1),
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#6b7280',
        fontFamily: "'Noto Serif SC', serif",
        fontSize: 9,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.02)',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '新增',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: false,
        data: data.map((d) => d.created),
        lineStyle: {
          color: '#6bc5e8',
          width: 1.5,
        },
        itemStyle: {
          color: '#6bc5e8',
          borderColor: '#0a0b0d',
          borderWidth: 1,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(107, 197, 232, 0.12)' },
              { offset: 1, color: 'rgba(107, 197, 232, 0)' },
            ],
          },
        },
        emphasis: { focus: 'series' },
      },
      {
        name: '完成',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: false,
        data: data.map((d) => d.completed),
        lineStyle: {
          color: '#5eead4',
          width: 1.5,
        },
        itemStyle: {
          color: '#5eead4',
          borderColor: '#0a0b0d',
          borderWidth: 1,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(94, 234, 212, 0.12)' },
              { offset: 1, color: 'rgba(94, 234, 212, 0)' },
            ],
          },
        },
        emphasis: { focus: 'series' },
      },
    ],
  }

  return (
    <div className="helm-card relative p-3 rounded-md animate-slide-up" style={{ animationDelay: '120ms', borderColor: 'rgba(94, 234, 212, 0.12)' }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="helm-label">
          趋势
        </h3>
        <span className="font-mono text-[9px] text-accent/50">30天</span>
      </div>
      <ReactECharts
        option={option}
        style={{ height: '160px', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  )
}

export { TrendLine }
